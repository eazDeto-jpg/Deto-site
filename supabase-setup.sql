-- ============================================================
-- DETO SUPABASE SETUP SQL
-- Plak dit in: Supabase → SQL Editor → New Query → Run
-- ============================================================

-- 1. Zorg dat de boekingen-tabel de juiste kolommen heeft
-- (alleen uitvoeren als kolommen nog niet bestaan)

ALTER TABLE boekingen
  ADD COLUMN IF NOT EXISTS vuil_toeslag integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notities text,
  ADD COLUMN IF NOT EXISTS afgerond boolean DEFAULT false;

-- 2. Schakel Row Level Security in (sluit directe client-toegang af)
--    Alle toegang loopt via Netlify Functions met de service role key.
ALTER TABLE boekingen ENABLE ROW LEVEL SECURITY;

-- 3. Verwijder eventuele te-permissieve bestaande policies
DROP POLICY IF EXISTS "Enable insert for all users" ON boekingen;
DROP POLICY IF EXISTS "Enable read access for all users" ON boekingen;
DROP POLICY IF EXISTS "Enable delete for all users" ON boekingen;
DROP POLICY IF EXISTS "Allow all" ON boekingen;

-- 4. Geen client-side policies nodig — service role bypasses RLS automatisch.
--    De Netlify Functions gebruiken de service role key en hebben volledige toegang.

-- 5. (Optioneel) Index voor snellere datum-queries
CREATE INDEX IF NOT EXISTS idx_boekingen_datum ON boekingen(datum);
CREATE INDEX IF NOT EXISTS idx_boekingen_email ON boekingen(email);

-- ============================================================
-- VERIFICATIE: controleer of RLS aan staat
-- ============================================================
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'boekingen';
-- rowsecurity moet 't' zijn
