-- ============================================================
-- DETO REAL-TIME TRACKING SCHEMA (FIXED VERSION)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. DETAILER LOCATIONS TABLE (Real-time updates)
-- ============================================================
CREATE TABLE IF NOT EXISTS detailer_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  detailer_id uuid NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES boekingen(id) ON DELETE CASCADE,
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  accuracy numeric(5, 2),
  speed numeric(5, 2),
  heading numeric(5, 2),
  is_tracking boolean DEFAULT false,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable real-time subscriptions
ALTER TABLE detailer_locations ENABLE ROW LEVEL SECURITY;

-- RLS: Detailers can only update their own locations
CREATE POLICY "Detailers can update own locations" ON detailer_locations
  FOR UPDATE USING (detailer_id = auth.uid()::uuid);

-- RLS: Customers can read locations for their bookings
CREATE POLICY "Customers can read detailer locations" ON detailer_locations
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM boekingen WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_detailer_locations_detailer_id ON detailer_locations(detailer_id);
CREATE INDEX IF NOT EXISTS idx_detailer_locations_booking_id ON detailer_locations(booking_id);
CREATE INDEX IF NOT EXISTS idx_detailer_locations_is_tracking ON detailer_locations(is_tracking);
CREATE INDEX IF NOT EXISTS idx_detailer_locations_created_at ON detailer_locations(created_at DESC);

-- ============================================================
-- 2. TRACKING SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  detailer_id uuid NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES boekingen(id) ON DELETE CASCADE,
  status text DEFAULT 'started', -- started, paused, completed, cancelled
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  total_distance_km numeric(8, 2) DEFAULT 0,
  total_duration_minutes integer DEFAULT 0,
  average_speed_kmh numeric(5, 2) DEFAULT 0,
  max_speed_kmh numeric(5, 2) DEFAULT 0,
  location_updates_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_detailer_id ON tracking_sessions(detailer_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_booking_id ON tracking_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_status ON tracking_sessions(status);

-- ============================================================
-- 3. SERVICE PHOTOS TABLE (Before/After)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES boekingen(id) ON DELETE CASCADE,
  detailer_id uuid NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  photo_type text NOT NULL, -- 'before', 'after', 'progress'
  photo_url text NOT NULL,
  photo_path text,
  description text,
  taken_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_photos ENABLE ROW LEVEL SECURITY;

-- RLS: Detailers can upload photos for their bookings
CREATE POLICY "Detailers can upload photos" ON service_photos
  FOR INSERT WITH CHECK (detailer_id = auth.uid()::uuid);

-- RLS: Customers can view photos for their bookings
CREATE POLICY "Customers can view photos" ON service_photos
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM boekingen WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_service_photos_booking_id ON service_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_service_photos_detailer_id ON service_photos(detailer_id);
CREATE INDEX IF NOT EXISTS idx_service_photos_type ON service_photos(photo_type);

-- ============================================================
-- 4. ETA CALCULATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS eta_calculations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES boekingen(id) ON DELETE CASCADE,
  detailer_id uuid NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  customer_latitude numeric(10, 8) NOT NULL,
  customer_longitude numeric(11, 8) NOT NULL,
  detailer_latitude numeric(10, 8) NOT NULL,
  detailer_longitude numeric(11, 8) NOT NULL,
  distance_km numeric(8, 2) NOT NULL,
  estimated_minutes integer NOT NULL,
  calculated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eta_calculations_booking_id ON eta_calculations(booking_id);
CREATE INDEX IF NOT EXISTS idx_eta_calculations_detailer_id ON eta_calculations(detailer_id);

-- ============================================================
-- 5. LOCATION HISTORY TABLE (For analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS location_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  detailer_id uuid NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES boekingen(id) ON DELETE CASCADE,
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  accuracy numeric(5, 2),
  recorded_at timestamptz DEFAULT now()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_location_history_detailer_id ON location_history(detailer_id);
CREATE INDEX IF NOT EXISTS idx_location_history_booking_id ON location_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at ON location_history(recorded_at DESC);

-- ============================================================
-- 6. REALTIME FUNCTIONS
-- ============================================================

-- Function to calculate distance between two coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
) RETURNS numeric AS $$
DECLARE
  R numeric := 6371; -- Earth radius in km
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := (lat2 - lat1) * pi() / 180;
  dlon := (lon2 - lon1) * pi() / 180;
  a := sin(dlat/2) * sin(dlat/2) + cos(lat1 * pi() / 180) * cos(lat2 * pi() / 180) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate ETA based on distance and average speed
CREATE OR REPLACE FUNCTION calculate_eta_minutes(
  distance_km numeric,
  average_speed_kmh numeric DEFAULT 40
) RETURNS integer AS $$
BEGIN
  IF average_speed_kmh <= 0 THEN
    RETURN 0;
  END IF;
  RETURN CEIL((distance_km / average_speed_kmh) * 60);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update tracking session stats
CREATE OR REPLACE FUNCTION update_tracking_session_stats(
  p_session_id uuid
) RETURNS void AS $$
DECLARE
  v_total_distance numeric;
  v_total_duration integer;
  v_avg_speed numeric;
  v_max_speed numeric;
  v_update_count integer;
BEGIN
  -- Calculate total distance
  SELECT COALESCE(SUM(calculate_distance_km(
    LAG(latitude) OVER (ORDER BY created_at),
    LAG(longitude) OVER (ORDER BY created_at),
    latitude,
    longitude
  )), 0) INTO v_total_distance
  FROM detailer_locations
  WHERE booking_id = (SELECT booking_id FROM tracking_sessions WHERE id = p_session_id)
  AND is_tracking = true;

  -- Calculate total duration
  SELECT EXTRACT(EPOCH FROM (MAX(updated_at) - MIN(created_at))) / 60 INTO v_total_duration
  FROM detailer_locations
  WHERE booking_id = (SELECT booking_id FROM tracking_sessions WHERE id = p_session_id)
  AND is_tracking = true;

  -- Calculate average speed
  IF v_total_duration > 0 THEN
    v_avg_speed := (v_total_distance / (v_total_duration / 60));
  ELSE
    v_avg_speed := 0;
  END IF;

  -- Get max speed
  SELECT MAX(speed) INTO v_max_speed
  FROM detailer_locations
  WHERE booking_id = (SELECT booking_id FROM tracking_sessions WHERE id = p_session_id)
  AND is_tracking = true;

  -- Count location updates
  SELECT COUNT(*) INTO v_update_count
  FROM detailer_locations
  WHERE booking_id = (SELECT booking_id FROM tracking_sessions WHERE id = p_session_id)
  AND is_tracking = true;

  -- Update session
  UPDATE tracking_sessions
  SET
    total_distance_km = v_total_distance,
    total_duration_minutes = COALESCE(v_total_duration, 0),
    average_speed_kmh = COALESCE(v_avg_speed, 0),
    max_speed_kmh = COALESCE(v_max_speed, 0),
    location_updates_count = v_update_count
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. VIEWS FOR COMMON QUERIES
-- ============================================================

-- View: Current detailer locations (latest for each booking)
CREATE OR REPLACE VIEW current_detailer_locations AS
SELECT DISTINCT ON (booking_id)
  dl.id,
  dl.detailer_id,
  dl.booking_id,
  dl.latitude,
  dl.longitude,
  dl.accuracy,
  dl.speed,
  dl.heading,
  dl.is_tracking,
  dl.started_at,
  dl.updated_at,
  d.naam as detailer_name,
  b.email as customer_email,
  b.datum as booking_time
FROM detailer_locations dl
LEFT JOIN detailers d ON dl.detailer_id = d.id
LEFT JOIN boekingen b ON dl.booking_id = b.id
WHERE dl.is_tracking = true
ORDER BY booking_id, dl.updated_at DESC;

-- View: Active tracking sessions with stats
CREATE OR REPLACE VIEW active_tracking_sessions AS
SELECT
  ts.id,
  ts.detailer_id,
  ts.booking_id,
  ts.status,
  ts.started_at,
  ts.total_distance_km,
  ts.total_duration_minutes,
  ts.average_speed_kmh,
  ts.max_speed_kmh,
  ts.location_updates_count,
  d.naam as detailer_name,
  b.email as customer_email,
  b.dienst as service_type
FROM tracking_sessions ts
LEFT JOIN detailers d ON ts.detailer_id = d.id
LEFT JOIN boekingen b ON ts.booking_id = b.id
WHERE ts.status IN ('started', 'paused');

-- ============================================================
-- 8. TRIGGERS FOR AUTO-UPDATES
-- ============================================================

-- Trigger to update location_history when new location is recorded
CREATE OR REPLACE FUNCTION insert_location_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO location_history (detailer_id, booking_id, latitude, longitude, accuracy)
  VALUES (NEW.detailer_id, NEW.booking_id, NEW.latitude, NEW.longitude, NEW.accuracy);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_insert_location_history ON detailer_locations;
CREATE TRIGGER trigger_insert_location_history
AFTER INSERT ON detailer_locations
FOR EACH ROW
EXECUTE FUNCTION insert_location_history();

-- ============================================================
-- SUMMARY
-- ============================================================
-- Tables created:
-- ✓ detailer_locations - Real-time GPS coordinates
-- ✓ tracking_sessions - Tracking session metadata
-- ✓ service_photos - Before/after photos
-- ✓ eta_calculations - ETA data
-- ✓ location_history - Historical location data
--
-- Functions:
-- ✓ calculate_distance_km() - Haversine distance calculation
-- ✓ calculate_eta_minutes() - ETA calculation
-- ✓ update_tracking_session_stats() - Update session statistics
--
-- Views:
-- ✓ current_detailer_locations - Latest locations
-- ✓ active_tracking_sessions - Active sessions
--
-- RLS Policies:
-- ✓ Detailers can update own locations
-- ✓ Customers can view detailer locations
-- ✓ Detailers can upload photos
-- ✓ Customers can view photos
-- ============================================================
