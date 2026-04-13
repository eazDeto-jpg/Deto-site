-- Status kolom toevoegen aan boekingen
-- Waarden: 'pending' | 'accepted' | 'completed' | 'cancelled'

DO $$ BEGIN
  ALTER TABLE boekingen ADD COLUMN status text DEFAULT 'pending';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Bestaande boekingen migreren op basis van huidige velden
UPDATE boekingen SET status = 'completed' WHERE afgerond = true AND status = 'pending';
UPDATE boekingen SET status = 'accepted'  WHERE afgerond = false AND detailer_id IS NOT NULL AND status = 'pending';
-- Overige blijven 'pending'
