"""Run once to populate demo data: `python seed_data.py`
Fills the structured product->standard table, a mock HUID registry, and a
few IS-standard text chunks into Chroma so /chat has something to retrieve.
"""
from datetime import date
from app.database import SessionLocal, init_db, ProductStandardMap, HallmarkRecord
from app import rag

init_db()
db = SessionLocal()

# --- Structured product -> standard/scheme lookup (curate/expand this table) ---
product_rows = [
    ProductStandardMap(product_keyword="power bank", is_standard="IS 16046",
                        scheme="CRS", notes="Mandatory registration before sale in India."),
    ProductStandardMap(product_keyword="mobile phone", is_standard="IS 616 / IS 13252",
                        scheme="CRS", notes="Register with a unique R-number before launch."),
    ProductStandardMap(product_keyword="led bulb", is_standard="IS 16102",
                        scheme="CRS", notes="Lighting products fall under CRS."),
    ProductStandardMap(product_keyword="gold jewellery", is_standard="IS 1417",
                        scheme="Hallmarking", notes="Mandatory hallmarking with HUID in notified areas."),
    ProductStandardMap(product_keyword="cement", is_standard="IS 269",
                        scheme="ISI", notes="Domestic manufacturer certification, factory audit required."),
]
db.add_all(product_rows)

# --- Mock HUID registry (stand-in for BIS's non-public DB, for demo only) ---
hallmark_rows = [
    HallmarkRecord(huid="AZ4567", purity="916 (22K)", jeweller_name="Demo Jewellers Pvt Ltd",
                    hallmarking_centre="Mumbai AHC-014", hallmark_date=date(2024, 3, 12),
                    article_type="Ring"),
    HallmarkRecord(huid="KH9821", purity="750 (18K)", jeweller_name="Sample Gold House",
                    hallmarking_centre="Delhi AHC-002", hallmark_date=date(2023, 11, 5),
                    article_type="Chain"),
]
db.add_all(hallmark_rows)
db.commit()

# --- Sample text chunks for the RAG corpus (replace with real IS standard excerpts) ---
sample_docs = [
    ("crs-overview", "The Compulsory Registration Scheme (CRS) applies to electronics and "
                      "IT products such as mobile phones, laptops, power banks, and adapters. "
                      "Manufacturers must test in a BIS-recognized lab and register for a "
                      "unique R-number before the product is sold in India.", "BIS CRS Scheme Guide"),
    ("hallmarking-overview", "The BIS Hallmarking Scheme certifies the purity of gold and silver "
                              "jewellery. Every hallmarked article carries a 6-character HUID "
                              "(Hallmark Unique Identification) that can be verified against the "
                              "BIS registry. A hallmarking license is valid for five years.",
                              "BIS Hallmarking Scheme Guide"),
    ("isi-process", "Grant of an ISI license follows: application submission, product testing "
                     "at a BIS-recognized lab, a factory audit, and a certification decision. "
                     "Product certification is valid for two years and can be renewed on "
                     "payment of the renewal fee.", "BIS Product Certification Process"),
]
for doc_id, text, source in sample_docs:
    rag.add_document(doc_id, text, {"source": source})

db.close()
print("Seed data loaded: product-standard map, mock HUID registry, sample RAG docs.")
