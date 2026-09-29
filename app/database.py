from sqlalchemy import Boolean, create_engine, Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import Session, sessionmaker, declarative_base, relationship
from datetime import datetime
from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    certifications = relationship("Certification", back_populates="owner")


class Certification(Base):
    """A certification/registration a user holds, used to drive renewal reminders."""
    __tablename__ = "certifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scheme = Column(String, nullable=False)          # e.g. "ISI", "CRS", "Hallmarking"
    license_number = Column(String, nullable=True)
    product_category = Column(String, nullable=True)
    issued_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)        # drives the reminder job
    reminder_sent = Column(Integer, default=0)         # 0/1/2 -> 90/30/7 day stage

    owner = relationship("User", back_populates="certifications")


class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String, nullable=True)
    company_type = Column(String, nullable=True)
    primary_product = Column(String, nullable=True)
    udyam_registered = Column(Boolean, nullable=True)
    journey_stage = Column(String, nullable=False, default="planning")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User")


class ProductStandardMap(Base):
    """Curated lookup: product keyword -> applicable IS standard + scheme.
    This is what makes recommendations reliable instead of pure LLM guessing."""
    __tablename__ = "product_standard_map"
    id = Column(Integer, primary_key=True, index=True)
    product_keyword = Column(String, index=True, nullable=False)
    is_standard = Column(String, nullable=False)       # e.g. "IS 16046"
    scheme = Column(String, nullable=False)             # e.g. "CRS"
    notes = Column(String, nullable=True)


class TestingFacility(Base):
    __tablename__ = "testing_facilities"
    id = Column(Integer, primary_key=True, index=True)
    lab_name = Column(String, nullable=False, index=True)
    osl_code = Column(String, nullable=True)
    indian_standard_no = Column(String, nullable=False, index=True)
    product = Column(String, nullable=True)
    grade_type_size = Column(String, nullable=True)
    testing_charges = Column(String, nullable=True)
    validity_date = Column(Date, nullable=True)
    remarks = Column(String, nullable=True)


class HallmarkRecord(Base):
    """Mock BIS HUID registry for demo purposes (BIS's real DB is not publicly queryable)."""
    __tablename__ = "hallmark_records"
    id = Column(Integer, primary_key=True, index=True)
    huid = Column(String, unique=True, index=True, nullable=False)
    purity = Column(String, nullable=False)             # e.g. "916 (22K)"
    jeweller_name = Column(String, nullable=False)
    hallmarking_centre = Column(String, nullable=False)
    hallmark_date = Column(Date, nullable=False)
    article_type = Column(String, nullable=True)


class QuotationRequest(Base):
    """Quotation request for testing, certification, and standard compliance."""
    __tablename__ = "quotation_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_name = Column(String, nullable=False)
    contact_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    product_name = Column(String, nullable=False)
    scheme = Column(String, nullable=False)             # ISI, CRS, FMCS, Hallmarking, Lab Testing
    is_standard = Column(String, nullable=True)         # e.g. IS 16046
    testing_scope = Column(String, nullable=True)       # e.g. Full Type Test
    sample_quantity = Column(Integer, default=1)
    is_msme = Column(Boolean, default=False)
    estimated_cost = Column(Integer, nullable=True)     # Total estimated INR
    notes = Column(String, nullable=True)
    status = Column(String, default="submitted")        # submitted, in_review, quoted, completed
    created_at = Column(DateTime, default=datetime.utcnow)



def lookup_huid(db: Session, huid: str) -> dict:
    record = db.query(HallmarkRecord).filter(HallmarkRecord.huid == huid).first()
    if not record:
        return {
            "verified": False,
            "message": "HUID not found in registry. This may be counterfeit, "
                       "mistyped, or misread - double check the engraving and "
                       "cross-verify on the official BIS Care app.",
        }
    return {
        "verified": True,
        "huid": record.huid,
        "purity": record.purity,
        "jeweller_name": record.jeweller_name,
        "hallmarking_centre": record.hallmarking_centre,
        "hallmark_date": str(record.hallmark_date),
        "article_type": record.article_type,
    }


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
