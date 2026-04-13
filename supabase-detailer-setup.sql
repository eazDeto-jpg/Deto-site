-- supabase-detailer-setup.sql
-- Voegt de kolommen 'afgerond' en 'notities' toe aan de 'boekingen' tabel.
-- Gebruikt DO-blokken met exception handling zodat het veilig herhaaldelijk kan worden uitgevoerd.

-- Kolom: afgerond (boolean, standaard false)
DO $$
BEGIN
  ALTER TABLE boekingen ADD COLUMN afgerond boolean DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Kolom afgerond bestaat al, wordt overgeslagen.';
END;
$$;

-- Kolom: notities (text, standaard lege string)
DO $$
BEGIN
  ALTER TABLE boekingen ADD COLUMN notities text DEFAULT '';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Kolom notities bestaat al, wordt overgeslagen.';
END;
$$;
