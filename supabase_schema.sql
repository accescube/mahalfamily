-- MahalFamily Supabase Schema
-- Run this in your Supabase SQL Editor to initialize the database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Mahals
CREATE TABLE public.mahals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  taluk VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Families (Family Units)
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mahal_id UUID REFERENCES public.mahals(id) ON DELETE CASCADE,
  family_name VARCHAR(255) NOT NULL, -- Veettu Peru
  place_name VARCHAR(255) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE, -- Requires Mahal Admin approval
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Members
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  gender VARCHAR(10) CHECK (gender IN ('Male', 'Female')),
  dob DATE,
  marital_status VARCHAR(50),
  photo_url TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  father_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  mother_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  is_alive BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Marriages (Cross-Family Connections)
CREATE TABLE public.marriages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  husband_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  wife_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  marriage_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(husband_id, wife_id)
);

-- 5. User Roles (For Access Control)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References auth.users(id) in Supabase
  role VARCHAR(50) CHECK (role IN ('super_admin', 'mahal_admin', 'user')),
  mahal_id UUID REFERENCES public.mahals(id) ON DELETE CASCADE, -- Only if role is mahal_admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some dummy Mahals
INSERT INTO public.mahals (name, district, taluk) VALUES
('Kozhikode Town Juma Masjid', 'Kozhikode', 'Kozhikode'),
('Malappuram Valiyangadi Juma Masjid', 'Malappuram', 'Eranad'),
('Kochi Panayappilly Juma Masjid', 'Ernakulam', 'Kochi');
