# Supabase Setup Instructions for Stage Connect

## Overview
This document provides step-by-step instructions to set up the Supabase database for the Stage Connect hybrid architecture.

## Architecture
- **Supabase (Cloud)**: Employers, Employer Contacts, Supervisor Contacts
- **localStorage (Client)**: Internships, Students, Attendance, Messages

## Step 1: Access Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in with your Supabase account
3. Select your project: `stageconnectie-app`

## Step 2: Create Tables

Navigate to the **SQL Editor** section and run the following SQL script:

```sql
-- Create employers table
CREATE TABLE IF NOT EXISTS employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create employer_contacts table
CREATE TABLE IF NOT EXISTS employer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  access_code TEXT NOT NULL,
  assigned_internships TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create supervisor_contacts table
CREATE TABLE IF NOT EXISTS supervisor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  access_code TEXT NOT NULL,
  assigned_students TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employer_contacts_email ON employer_contacts(email);
CREATE INDEX IF NOT EXISTS idx_employer_contacts_employer_id ON employer_contacts(employer_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_contacts_email ON supervisor_contacts(email);
```

## Step 3: Add Sample Data (Optional)

To test the application, you can add sample data:

```sql
-- Add sample employers
INSERT INTO employers (company_name, phone_number) VALUES
  ('Techno Solutions', '030-1234567'),
  ('Design Studio', '020-9876543')
ON CONFLICT DO NOTHING;

-- Add sample employer contacts
INSERT INTO employer_contacts (employer_id, name, email, access_code, assigned_internships) VALUES
  ((SELECT id FROM employers WHERE company_name = 'Techno Solutions' LIMIT 1), 'Jan Jansen', 'jan@technosolutions.nl', 'SECRET123', ARRAY[]::text[]),
  ((SELECT id FROM employers WHERE company_name = 'Design Studio' LIMIT 1), 'Marie Dupont', 'marie@designstudio.nl', 'SECRET456', ARRAY[]::text[])
ON CONFLICT (email) DO NOTHING;

-- Add sample supervisors
INSERT INTO supervisor_contacts (name, email, phone_number, access_code, assigned_students) VALUES
  ('Drs. Peter van Dijk', 'peter.vandijk@ghpc.nl', '030-5555555', 'SUPERVISOR1', ARRAY[]::text[]),
  ('Ir. Sarah de Wit', 'sarah.dewit@ghpc.nl', '030-6666666', 'SUPERVISOR2', ARRAY[]::text[])
ON CONFLICT (email) DO NOTHING;
```

## Step 4: Enable Row Level Security (RLS) - Optional

For production, you may want to enable RLS. However, since we're using the anon key, we need to allow public read access:

```sql
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read
CREATE POLICY "Enable read access for all users" ON employers
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON employer_contacts
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON supervisor_contacts
  FOR SELECT USING (true);
```

## Step 5: Verify Environment Variables

Make sure your `.env.local` file has the correct Supabase credentials:

```
REACT_APP_SUPABASE_URL=https://ninkkvffhvkxrrxddgrz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 6: Test the Connection

1. Start the development server: `npm start`
2. Open the browser console (F12)
3. Look for the message: `✅ Supabase connection successful`
4. Log in with one of the test accounts (e.g., jan@technosolutions.nl / SECRET123)

## Troubleshooting

### Issue: "Supabase connection test failed"
- Check that Supabase URL and ANON_KEY are correct in .env.local
- Verify that the tables exist in Supabase
- Check browser console for detailed error messages

### Issue: "Email not found" on login
- Verify that your test email exists in the employer_contacts or supervisor_contacts table
- Make sure the access_code matches exactly

### Issue: Data not loading from Supabase
- Check if Supabase is enabled in the browser console
- Verify network tab in DevTools to see if API calls are being made
- Check Supabase dashboard for any access errors

## Next Steps

Once tables are created and verified:
1. Add your actual employer and supervisor data to Supabase
2. Test all three login flows (employer, supervisor)
3. Deploy to Vercel
4. Monitor logs for any errors

## Data Migration from localStorage

The app still maintains full localStorage functionality as a fallback. When you want to permanently migrate to Supabase:
1. Export your current data from localStorage
2. Insert it into Supabase tables
3. Update login functions to require Supabase data

For now, the hybrid approach allows both data sources to coexist.
