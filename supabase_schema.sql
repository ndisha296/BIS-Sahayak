-- ==============================================================================
-- BIS Sahayak: Official Supabase Database Schema & Security Policy (Idempotent)
-- Includes Auth Integration, User Profiles, Business Data, Hallmarks, & RLS
-- Safe to re-run multiple times without policy or table collision errors
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create User Profiles Table (Mirrors Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'industry_user' CHECK (role IN ('industry_user', 'consumer', 'auditor', 'admin')),
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure preferred_language exists if table was previously created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- 3. Create Business Profiles Table (MSME, Startup & Company Metadata)
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT,
    company_type TEXT CHECK (company_type IN ('Private Limited', 'Partnership', 'Proprietorship', 'Public Limited', 'LLP', 'Individual / Startup')),
    primary_product TEXT,
    udyam_registered BOOLEAN DEFAULT FALSE,
    udyam_number TEXT,
    gst_number TEXT,
    journey_stage TEXT DEFAULT 'planning' CHECK (journey_stage IN ('planning', 'testing', 'audit', 'certified', 'renewal')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Certifications / License Tracker Table
CREATE TABLE IF NOT EXISTS public.certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scheme TEXT NOT NULL CHECK (scheme IN ('ISI', 'CRS', 'Hallmarking', 'FMCS', 'Lab Testing')),
    license_number TEXT,
    product_category TEXT,
    is_standard TEXT,
    issued_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'renewed')),
    reminder_sent INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Quotation Requests Table (Ask Quotation & Cost Breakdown)
CREATE TABLE IF NOT EXISTS public.quotation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    quotation_reference TEXT UNIQUE DEFAULT ('QT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    product_name TEXT NOT NULL,
    scheme TEXT NOT NULL CHECK (scheme IN ('ISI', 'CRS', 'FMCS', 'Hallmarking', 'Lab Testing')),
    is_standard TEXT,
    testing_scope TEXT DEFAULT 'Full Type Test',
    sample_quantity INT DEFAULT 1,
    is_msme BOOLEAN DEFAULT FALSE,
    estimated_cost INT,
    notes TEXT,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'quoted', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Hallmark Records Table (Mock / Certified HUID Registry)
CREATE TABLE IF NOT EXISTS public.hallmark_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    huid VARCHAR(6) UNIQUE NOT NULL,
    purity TEXT NOT NULL,
    jeweller_name TEXT NOT NULL,
    hallmarking_centre TEXT NOT NULL,
    hallmark_date DATE NOT NULL,
    article_type TEXT DEFAULT 'Jewellery',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Testing Facilities Table (BIS Recognized OSL Labs)
CREATE TABLE IF NOT EXISTS public.testing_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_name TEXT NOT NULL,
    osl_code TEXT,
    indian_standard_no TEXT NOT NULL,
    product TEXT,
    grade_type_size TEXT,
    testing_charges TEXT,
    validity_date DATE,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Product Standard Map Table (Keyword to IS Standard Mapping)
CREATE TABLE IF NOT EXISTS public.product_standard_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_keyword TEXT NOT NULL,
    is_standard TEXT NOT NULL,
    scheme TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- AUTOMATIC USER PROVISIONING TRIGGER (auth.users -> public.profiles)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'industry_user'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  INSERT INTO public.business_profiles (user_id, company_name, company_type, primary_product, udyam_registered, journey_stage)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Enterprise'),
    COALESCE(NEW.raw_user_meta_data->>'company_type', 'Private Limited'),
    COALESCE(NEW.raw_user_meta_data->>'primary_product', 'General Products'),
    COALESCE((NEW.raw_user_meta_data->>'udyam_registered')::BOOLEAN, FALSE),
    'planning'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (With Safe Drop-If-Exists)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hallmark_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testing_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_standard_map ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Business Profiles Policies
DROP POLICY IF EXISTS "Users can view own business profile" ON public.business_profiles;
CREATE POLICY "Users can view own business profile" ON public.business_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own business profile" ON public.business_profiles;
CREATE POLICY "Users can update own business profile" ON public.business_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own business profile" ON public.business_profiles;
CREATE POLICY "Users can insert own business profile" ON public.business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Certifications Policies
DROP POLICY IF EXISTS "Users can view own certifications" ON public.certifications;
CREATE POLICY "Users can view own certifications" ON public.certifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own certifications" ON public.certifications;
CREATE POLICY "Users can manage own certifications" ON public.certifications
  FOR ALL USING (auth.uid() = user_id);

-- 4. Quotation Requests Policies
DROP POLICY IF EXISTS "Users can view own quotation requests" ON public.quotation_requests;
CREATE POLICY "Users can view own quotation requests" ON public.quotation_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Anyone can submit quotation request" ON public.quotation_requests;
CREATE POLICY "Anyone can submit quotation request" ON public.quotation_requests
  FOR INSERT WITH CHECK (TRUE);

-- 5. Public Reference Data Policies
DROP POLICY IF EXISTS "Public read for hallmark records" ON public.hallmark_records;
CREATE POLICY "Public read for hallmark records" ON public.hallmark_records
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read for testing facilities" ON public.testing_facilities;
CREATE POLICY "Public read for testing facilities" ON public.testing_facilities
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read for product standards" ON public.product_standard_map;
CREATE POLICY "Public read for product standards" ON public.product_standard_map
  FOR SELECT USING (TRUE);

-- ==============================================================================
-- INITIAL SEED DATA (Idempotent ON CONFLICT DO NOTHING)
-- ==============================================================================

INSERT INTO public.hallmark_records (huid, purity, jeweller_name, hallmarking_centre, hallmark_date, article_type)
VALUES
  ('AZ4567', '916 (22K)', 'Tanishq Jewellers Ltd, Connaught Place', 'Delhi Assaying & Hallmarking Centre (AHC-011)', CURRENT_DATE - INTERVAL '120 days', 'Gold Bangle & Ring Set'),
  ('KH9821', '750 (18K)', 'Kalyan Jewellers India Ltd, T Nagar', 'Chennai Hallmark Refiners (AHC-044)', CURRENT_DATE - INTERVAL '45 days', 'Diamond Studded Gold Necklace'),
  ('AU916A', '916 (22K)', 'Malabar Gold & Diamonds, MG Road', 'Bengaluru Assaying Laboratory (AHC-080)', CURRENT_DATE - INTERVAL '15 days', 'Traditional Gold Chain (22 Karat)'),
  ('SL999X', '999 (24K Fine Silver)', 'MMTC-PAMP India Private Ltd', 'National Bullion Assaying Centre (AHC-001)', CURRENT_DATE - INTERVAL '30 days', 'Pure Silver Ingot 100g'),
  ('AG750B', '750 (18K)', 'Joyalukkas India Private Ltd', 'Mumbai Central Hallmarking Hub (AHC-022)', CURRENT_DATE - INTERVAL '80 days', '18K White Gold Ear Studs')
ON CONFLICT (huid) DO NOTHING;

INSERT INTO public.product_standard_map (product_keyword, is_standard, scheme, notes)
VALUES
  ('power bank', 'IS 16046 (Part 2):2018', 'CRS', 'Lithium-ion secondary battery cells for portable power banks'),
  ('led bulb', 'IS 16102 (Part 1):2012', 'CRS', 'Self-ballasted LED lamps for general lighting services'),
  ('cement', 'IS 269:2015', 'ISI', 'Ordinary Portland Cement 33, 43 and 53 Grade - Mandatory ISI mark'),
  ('mobile phone', 'IS 13252 (Part 1):2010', 'CRS', 'Information Technology Equipment - Safety requirements for mobile handsets'),
  ('gold jewellery', 'IS 1417:2016', 'Hallmarking', 'Gold and Gold Alloys, Silver and Silver Alloys - Purity and Hallmarking'),
  ('packaged water', 'IS 14543:2004', 'ISI', 'Packaged Drinking Water (Other than Packaged Natural Mineral Water)')
ON CONFLICT DO NOTHING;

INSERT INTO public.testing_facilities (lab_name, osl_code, indian_standard_no, product, grade_type_size, testing_charges, validity_date, remarks)
VALUES
  ('National Test House (NTH), Western Region', 'OSL-WR-01', 'IS 16046', 'Lithium Secondary Cells & Batteries', 'All types up to 10,000mAh', '₹18,500 + GST', CURRENT_DATE + INTERVAL '720 days', 'Fully BIS accredited for all CRS battery test clauses'),
  ('Central Power Research Institute (CPRI)', 'OSL-SR-04', 'IS 16102', 'Self-ballasted LED Lamps', '5W to 50W, E27/B22 caps', '₹14,000 + GST', CURRENT_DATE + INTERVAL '540 days', 'Complete photometric, electrical, and thermal test bench'),
  ('Shriram Institute for Industrial Research', 'OSL-NR-02', 'IS 14543', 'Packaged Drinking Water', 'Microbiological & Physical Test', '₹12,500 + GST', CURRENT_DATE + INTERVAL '600 days', 'NABL Accredited & BIS Approved'),
  ('Bureau Veritas India Testing Laboratory', 'OSL-SR-09', 'IS 13252', 'IT & Mobile Equipment', 'Handsets, Tablets & Adaptors', '₹22,000 + GST', CURRENT_DATE + INTERVAL '480 days', 'Automated safety & SAR test facility')
ON CONFLICT DO NOTHING;
