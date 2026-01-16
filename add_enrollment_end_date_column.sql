-- SQL om de nieuwe kolom toe te voegen
ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS enrollment_end_date DATE;

-- Optioneel: commentaar toevoegen
COMMENT ON COLUMN "Students".enrollment_end_date IS 'Datum van uitschrijving bij onderwijsinstelling. Data wordt 1 jaar hierna verwijderd.';
