-- Detailers tabel
CREATE TABLE IF NOT EXISTS detailers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  naam text NOT NULL,
  email text UNIQUE NOT NULL,
  wachtwoord_hash text NOT NULL,
  token text UNIQUE NOT NULL,
  actief boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Voeg detailer_id kolom toe aan boekingen
DO $$ BEGIN
  ALTER TABLE boekingen ADD COLUMN detailer_id uuid REFERENCES detailers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Regio kolom voor auto-assign (komma-gescheiden postcodes/steden, bv. "9000,9040,Gent")
DO $$ BEGIN
  ALTER TABLE detailers ADD COLUMN regio text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Vlag voor verplichte wachtwoordwijziging bij eerste login
DO $$ BEGIN
  ALTER TABLE detailers ADD COLUMN moet_wachtwoord_wijzigen boolean DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- RLS uitschakelen voor detailers tabel (service key heeft altijd toegang)
ALTER TABLE detailers DISABLE ROW LEVEL SECURITY;
