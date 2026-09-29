import os
import re
import tempfile
from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import (
    BusinessProfile,
    Certification,
    ProductStandardMap,
    QuotationRequest,
    TestingFacility,
    User,
    get_db,
    init_db,
    lookup_huid,
)
from app.ocr_easyocr_quick import extract_huid
from app.rag import answer_question
from app.security import create_access_token, get_token_subject, hash_password, verify_password

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="BIS Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


@app.on_event("startup")
def on_startup():
    init_db()


class ChatRequest(BaseModel):
    query: str


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class BusinessProfileUpdate(BaseModel):
    company_name: str | None = Field(default=None, max_length=200)
    company_type: str | None = Field(default=None, max_length=80)
    primary_product: str | None = Field(default=None, max_length=500)
    udyam_registered: bool | None = None
    journey_stage: Literal["planning", "application", "licensed", "compliance"] | None = None


class ProductQuery(BaseModel):
    description: str = Field(min_length=2, max_length=1000)


class CertificationCreate(BaseModel):
    scheme: str = Field(min_length=1, max_length=80)
    license_number: str | None = Field(default=None, max_length=100)
    product_category: str | None = Field(default=None, max_length=200)
    issued_date: date
    expiry_date: date


class CostCalculationRequest(BaseModel):
    scheme: str = Field(default="ISI", max_length=80)
    is_standard: str | None = Field(default=None, max_length=100)
    sample_quantity: int = Field(default=1, ge=1, le=100)
    is_msme: bool = Field(default=False)
    testing_scope: str | None = Field(default="Full Type Test", max_length=100)


class QuotationCreateRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=200)
    contact_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    product_name: str = Field(min_length=2, max_length=200)
    scheme: str = Field(default="ISI", max_length=80)
    is_standard: str | None = Field(default=None, max_length=100)
    testing_scope: str | None = Field(default="Full Type Test", max_length=100)
    sample_quantity: int = Field(default=1, ge=1, le=100)
    is_msme: bool = Field(default=False)
    notes: str | None = Field(default=None, max_length=1000)


class HuidCheckRequest(BaseModel):
    huid: str = Field(min_length=6, max_length=6, pattern=r"^[A-Za-z0-9]{6}$")
    claimed_purity: str | None = Field(default=None, max_length=40)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    subject = get_token_subject(token)
    if subject is None or not subject.isdigit():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(subject)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def match_standards(db: Session, description: str) -> list[dict]:
    normalized_description = description.casefold()
    matches = (
        db.query(ProductStandardMap)
        .order_by(ProductStandardMap.product_keyword)
        .all()
    )
    return [
        {
            "product_keyword": item.product_keyword,
            "standard": item.is_standard,
            "scheme": item.scheme,
            "notes": item.notes,
        }
        for item in matches
        if item.product_keyword.casefold() in normalized_description
    ]


def purity_grade(value: str | None) -> str | None:
    if not value:
        return None
    normalized = re.sub(r"[^A-Z0-9]", "", value.upper())
    for grade, labels in {
        "999": ("999", "24K", "24KARAT"),
        "916": ("916", "22K", "22KARAT"),
        "750": ("750", "18K", "18KARAT"),
        "585": ("585", "14K", "14KARAT"),
    }.items():
        if any(label in normalized for label in labels):
            return grade
    return normalized or None


def hallmark_result(db: Session, huid: str, claimed_purity: str | None = None) -> dict:
    verification = lookup_huid(db, huid)
    if verification.get("verified") and claimed_purity:
        registered_grade = purity_grade(verification.get("purity"))
        claimed_grade = purity_grade(claimed_purity)
        if registered_grade and claimed_grade:
            verification["purity_match"] = registered_grade == claimed_grade
            if not verification["purity_match"]:
                verification["message"] = (
                    "The purity entered does not match the registry result. "
                    "Confirm the bill and contact BIS or the seller if needed."
                )
    verification["photo_purity_notice"] = (
        "A photo can help read the HUID; purity is reported from the registry, "
        "not measured from the image."
    )
    return verification


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_account(request: AccountCreate, db: Session = Depends(get_db)):
    email = request.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(name=request.name.strip(), email=email, hashed_password=hash_password(request.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "access_token": create_access_token(str(user.id)),
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email},
    }


@app.post("/api/auth/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": create_access_token(str(user.id)), "token_type": "bearer"}


@app.get("/api/profile/me")
def my_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == user.id).first()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "account_type": "business" if business else "consumer",
        "business": {
            "company_name": business.company_name,
            "company_type": business.company_type,
            "primary_product": business.primary_product,
            "udyam_registered": business.udyam_registered,
            "journey_stage": business.journey_stage,
        } if business else None,
    }


@app.put("/api/business/profile")
def update_business_profile(
    request: BusinessProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(BusinessProfile).filter(BusinessProfile.user_id == user.id).first()
    if profile is None:
        profile = BusinessProfile(user_id=user.id)
        db.add(profile)
    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return {
        "company_name": profile.company_name,
        "company_type": profile.company_type,
        "primary_product": profile.primary_product,
        "udyam_registered": profile.udyam_registered,
        "journey_stage": profile.journey_stage,
    }


@app.post("/api/recommend-standard")
def recommend_standard(request: ProductQuery, db: Session = Depends(get_db)):
    matches = match_standards(db, request.description)
    return {
        "structured_match": bool(matches),
        "results": matches,
        "message": None if matches else (
            "No curated product match is available yet. Ask the assistant for guidance "
            "and verify the applicable scheme with BIS before applying."
        ),
    }


@app.post("/api/certifications", status_code=status.HTTP_201_CREATED)
def add_certification(
    request: CertificationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if request.expiry_date <= request.issued_date:
        raise HTTPException(status_code=422, detail="Expiry date must be after issue date.")
    certification = Certification(user_id=user.id, **request.model_dump())
    db.add(certification)
    db.commit()
    db.refresh(certification)
    return certification_status(certification)


def certification_status(certification: Certification) -> dict:
    days_remaining = (certification.expiry_date - date.today()).days
    reminder_at = min(
        (day for day in (90, 60, 30, 7) if days_remaining <= day),
        default=None,
    )
    return {
        "id": certification.id,
        "scheme": certification.scheme,
        "license_number": certification.license_number,
        "product_category": certification.product_category,
        "issued_date": str(certification.issued_date),
        "expiry_date": str(certification.expiry_date),
        "days_remaining": days_remaining,
        "renewal_reminder_due": 0 <= days_remaining <= 90,
        "reminder_milestone_days": reminder_at if 0 <= days_remaining <= 90 else None,
        "status": "expired" if days_remaining < 0 else "active",
    }


@app.get("/api/certifications")
def list_certifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    certifications = (
        db.query(Certification)
        .filter(Certification.user_id == user.id)
        .order_by(Certification.expiry_date)
        .all()
    )
    return {"certifications": [certification_status(item) for item in certifications]}


@app.get("/api/testing-facilities")
def search_testing_facilities(
    standard: str,
    db: Session = Depends(get_db),
):
    facilities = (
        db.query(TestingFacility)
        .filter(TestingFacility.indian_standard_no.ilike(f"%{standard.strip()}%"))
        .filter(
            or_(
                TestingFacility.validity_date.is_(None),
                TestingFacility.validity_date >= date.today(),
            )
        )
        .order_by(TestingFacility.lab_name)
        .limit(100)
        .all()
    )
    return {
        "standard": standard,
        "results": [
            {
                "lab_name": item.lab_name,
                "osl_code": item.osl_code,
                "standard": item.indian_standard_no,
                "product": item.product,
                "grade_type_size": item.grade_type_size,
                "testing_charges": item.testing_charges,
                "validity_date": str(item.validity_date) if item.validity_date else None,
                "validity_status": (
                    "valid_through_date" if item.validity_date else "not_listed_verify_with_lab"
                ),
                "remarks": item.remarks,
            }
            for item in facilities
        ],
    }


def compute_bis_costs(
    scheme: str,
    is_standard: str | None = None,
    sample_quantity: int = 1,
    is_msme: bool = False,
    testing_scope: str | None = None,
) -> dict:
    scheme_clean = (scheme or "ISI").upper()

    if "CRS" in scheme_clean:
        app_fee = 1000
        audit_fee = 0
        base_test_fee = 24000
        marking_fee = 0
        scheme_name = "CRS (Compulsory Registration Scheme - Electronics)"
    elif "FMCS" in scheme_clean:
        app_fee = 80000
        audit_fee = 60000
        base_test_fee = 45000
        marking_fee = 90000
        scheme_name = "FMCS (Foreign Manufacturers Certification Scheme)"
    elif "HALLMARK" in scheme_clean:
        app_fee = 1000
        audit_fee = 0
        base_test_fee = 6000
        marking_fee = 5000
        scheme_name = "Hallmarking Scheme (AHC / Jewellers)"
    elif "LAB" in scheme_clean or "TEST" in scheme_clean:
        app_fee = 500
        audit_fee = 0
        base_test_fee = 18000
        marking_fee = 0
        scheme_name = "BIS OSL Laboratory Testing"
    else:  # Default ISI Scheme I
        app_fee = 1000
        audit_fee = 7000
        base_test_fee = 32000
        marking_fee = 45000
        scheme_name = "ISI Mark (Scheme I - Domestic Manufacturer)"

    # Adjust test fee based on scope
    test_multiplier = 1.0
    if testing_scope:
        scope_l = testing_scope.lower()
        if "safety" in scope_l:
            test_multiplier = 0.65
        elif "performance" in scope_l:
            test_multiplier = 0.55
        elif "partial" in scope_l:
            test_multiplier = 0.45

    sample_count = max(1, sample_quantity)
    calculated_test_fee = int(base_test_fee * test_multiplier * sample_count)

    # 50% MSME concession on Application Fee & Minimum Marking Fee
    msme_discount = 0
    if is_msme:
        msme_discount = int((app_fee * 0.5) + (marking_fee * 0.5))

    subtotal = (app_fee + audit_fee + calculated_test_fee + marking_fee) - msme_discount
    gst = int(subtotal * 0.18)
    total_cost = subtotal + gst

    return {
        "scheme": scheme,
        "scheme_name": scheme_name,
        "is_standard": is_standard or "Applicable Indian Standard",
        "testing_scope": testing_scope or "Full Type Test",
        "sample_quantity": sample_count,
        "is_msme": is_msme,
        "application_fee": app_fee,
        "audit_fee": audit_fee,
        "testing_fee": calculated_test_fee,
        "annual_marking_fee": marking_fee,
        "msme_discount": msme_discount,
        "subtotal": subtotal,
        "gst_18_pct": gst,
        "total_estimated_cost": total_cost,
    }


@app.post("/api/cost-calculator")
def calculate_compliance_cost(request: CostCalculationRequest):
    return compute_bis_costs(
        scheme=request.scheme,
        is_standard=request.is_standard,
        sample_quantity=request.sample_quantity,
        is_msme=request.is_msme,
        testing_scope=request.testing_scope,
    )


@app.post("/api/quotations", status_code=status.HTTP_201_CREATED)
def submit_quotation_request(
    request: QuotationCreateRequest,
    db: Session = Depends(get_db),
):
    cost_data = compute_bis_costs(
        scheme=request.scheme,
        is_standard=request.is_standard,
        sample_quantity=request.sample_quantity,
        is_msme=request.is_msme,
        testing_scope=request.testing_scope,
    )

    # Try to match user by email if exists
    user = db.query(User).filter(User.email == request.email.lower()).first()
    user_id = user.id if user else None

    quote = QuotationRequest(
        user_id=user_id,
        company_name=request.company_name.strip(),
        contact_name=request.contact_name.strip(),
        email=request.email.lower().strip(),
        phone=request.phone.strip() if request.phone else None,
        product_name=request.product_name.strip(),
        scheme=request.scheme,
        is_standard=request.is_standard.strip() if request.is_standard else None,
        testing_scope=request.testing_scope,
        sample_quantity=request.sample_quantity,
        is_msme=request.is_msme,
        estimated_cost=cost_data["total_estimated_cost"],
        notes=request.notes.strip() if request.notes else None,
        status="submitted",
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)

    return {
        "quotation_id": f"BIS-QTE-{quote.id:05d}",
        "quote": {
            "id": quote.id,
            "company_name": quote.company_name,
            "contact_name": quote.contact_name,
            "email": quote.email,
            "product_name": quote.product_name,
            "scheme": quote.scheme,
            "is_standard": quote.is_standard,
            "sample_quantity": quote.sample_quantity,
            "is_msme": quote.is_msme,
            "estimated_cost": quote.estimated_cost,
            "status": quote.status,
            "created_at": quote.created_at.strftime("%Y-%m-%d %H:%M"),
        },
        "breakdown": cost_data,
        "message": "Quotation generated and saved successfully. Our compliance desk will reach out within 24-48 business hours.",
    }


@app.get("/api/quotations")
def list_quotation_requests(
    email: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(QuotationRequest)
    if email:
        query = query.filter(QuotationRequest.email == email.lower().strip())
    quotes = query.order_by(QuotationRequest.created_at.desc()).limit(50).all()
    return {
        "quotations": [
            {
                "id": q.id,
                "quote_ref": f"BIS-QTE-{q.id:05d}",
                "company_name": q.company_name,
                "contact_name": q.contact_name,
                "email": q.email,
                "phone": q.phone,
                "product_name": q.product_name,
                "scheme": q.scheme,
                "is_standard": q.is_standard,
                "testing_scope": q.testing_scope,
                "sample_quantity": q.sample_quantity,
                "is_msme": q.is_msme,
                "estimated_cost": q.estimated_cost,
                "status": q.status,
                "created_at": q.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for q in quotes
        ]
    }


# 1. Left Pipeline: Text Q&A (RAG)
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return answer_question(request.query)

# 2. Right Pipeline: Hallmark Verification
@app.post("/api/verify-hallmark")
async def verify_hallmark_endpoint(
    file: UploadFile = File(...),
    claimed_purity: str | None = Form(default=None),
    db: Session = Depends(get_db),
):
    if file.content_type and not (file.content_type.startswith("image/") or file.content_type == "application/octet-stream"):
        raise HTTPException(status_code=415, detail="Upload an image file.")
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image uploads are limited to 10 MB.")

    detected_text = None
    temp_path = None
    try:
        suffix = Path(file.filename or "").suffix or ".jpg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as image_file:
            temp_path = image_file.name
            image_file.write(image_bytes)
        detected_text = extract_huid(temp_path)
    except Exception:
        detected_text = None
    finally:
        if temp_path is not None and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    if detected_text is None:
        return {
            "detected_code": None,
            "verification": {
                "verified": False,
                "message": "Could not read a valid 6-character HUID from the image. Please ensure the engraving is clear, well-lit, and in focus, or verify using the manual HUID code input.",
            },
        }

    return {
        "detected_code": detected_text,
        "verification": hallmark_result(db, detected_text, claimed_purity),
    }


@app.post("/api/verify-hallmark/code")
def verify_hallmark_code(request: HuidCheckRequest, db: Session = Depends(get_db)):
    return {
        "detected_code": request.huid.upper(),
        "verification": hallmark_result(db, request.huid.upper(), request.claimed_purity),
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}