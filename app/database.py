from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
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


class ProductStandardMap(Base):
    """Curated lookup: product keyword -> applicable IS standard + scheme.
    This is what makes recommendations reliable instead of pure LLM guessing."""
    __tablename__ = "product_standard_map"
    id = Column(Integer, primary_key=True, index=True)
    product_keyword = Column(String, index=True, nullable=False)
    is_standard = Column(String, nullable=False)       # e.g. "IS 16046"
    scheme = Column(String, nullable=False)             # e.g. "CRS"
    notes = Column(String, nullable=True)


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


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
