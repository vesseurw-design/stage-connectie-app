-- Supabase Schema for Stage Connect
-- This schema defines the master data tables for the hybrid cloud/localStorage approach
-- 
-- Architecture:
-- - Employers, Supervisor Contacts, and Employer Contacts are stored in Supabase (centralized master data)
-- - Internships, Students, and Attendance Records remain in localStorage (operational data)
-- - This allows for easy management of users via Supabase dashboard without needing an in-app admin interface

-- Table 1: Employers
-- Stores all employer (werkgever) companies
CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 2: Employer Contacts
-- Individual employees within a company, each with their own email and access code
-- A company can have multiple contacts (e.g., HR person, direct supervisor, etc.)
CREATE TABLE employer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL,
  assigned_internships TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table 3: Supervisor Contacts
-- Stagebegeleiders (school supervisors) who mentor internships
CREATE TABLE supervisor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  access_code TEXT NOT NULL,
  assigned_students TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for common queries
CREATE INDEX idx_employer_contacts_email ON employer_contacts(email);
CREATE INDEX idx_employer_contacts_employer_id ON employer_contacts(employer_id);
CREATE INDEX idx_supervisor_contacts_email ON supervisor_contacts(email);

-- Sample data (optional - replace with your own data)
-- INSERT INTO employers (company_name, phone_number) VALUES
--   ('Techno Solutions', '030-1234567'),
--   ('Design Studio', '020-9876543');

-- INSERT INTO employer_contacts (employer_id, name, email, access_code, assigned_internships) VALUES
--   ((SELECT id FROM employers WHERE company_name = 'Techno Solutions' LIMIT 1), 'Jan Jansen', 'jan@technosolutions.nl', 'SECRET123', ARRAY[]::text[]),
--   ((SELECT id FROM employers WHERE company_name = 'Design Studio' LIMIT 1), 'Marie Dupont', 'marie@designstudio.nl', 'SECRET456', ARRAY[]::text[]);

-- INSERT INTO supervisor_contacts (name, email, phone_number, access_code, assigned_students) VALUES
--   ('Drs. Peter van Dijk', 'peter.vandijk@ghpc.nl', '030-5555555', 'SUPERVISOR1', ARRAY[]::text[]),
--   ('Ir. Sarah de Wit', 'sarah.dewit@ghpc.nl', '030-6666666', 'SUPERVISOR2', ARRAY[]::text[]);
