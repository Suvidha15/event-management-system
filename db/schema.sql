-- NMAMIT Campus Booking schema. Idempotent: safe to run repeatedly.
-- Statements are separated by a line containing only "-- ;" so the migrate
-- script can send them one at a time over the Neon HTTP driver.

CREATE EXTENSION IF NOT EXISTS btree_gist;
-- ;
CREATE TABLE IF NOT EXISTS venues (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  building    TEXT NOT NULL,
  kind        TEXT NOT NULL,
  capacity    INTEGER NOT NULL CHECK (capacity > 0),
  facilities  TEXT[] NOT NULL DEFAULT '{}',
  open_time   TIME NOT NULL DEFAULT '08:00',
  close_time  TIME NOT NULL DEFAULT '20:00'
);
-- ;
CREATE TABLE IF NOT EXISTS bookings (
  id               SERIAL PRIMARY KEY,
  venue_id         INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 120),
  description      TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'event',
  organizer_name   TEXT NOT NULL,
  organizer_email  TEXT NOT NULL,
  organizer_role   TEXT NOT NULL CHECK (organizer_role IN ('student', 'faculty', 'staff')),
  department       TEXT NOT NULL DEFAULT '',
  expected_count   INTEGER NOT NULL DEFAULT 0 CHECK (expected_count >= 0),
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
-- ;
-- The database itself guarantees no double booking, even under concurrent requests.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING gist (venue_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
      WHERE (status = 'confirmed');
  END IF;
END $$;
-- ;
CREATE INDEX IF NOT EXISTS bookings_starts_at_idx ON bookings (starts_at);
-- ;
CREATE INDEX IF NOT EXISTS bookings_email_idx ON bookings (lower(organizer_email));
-- ;
INSERT INTO venues (name, building, kind, capacity, facilities) VALUES
  ('Main Auditorium',          'Central Block',   'Auditorium',   800, '{Projector,"Sound system",Stage,AC}'),
  ('Seminar Hall 1',           'CSE Block',       'Seminar hall', 150, '{Projector,"Sound system",AC}'),
  ('Seminar Hall 2',           'ECE Block',       'Seminar hall', 120, '{Projector,"Sound system"}'),
  ('Mini Seminar Hall',        'ISE Block',       'Seminar hall',  80, '{Projector,"Smart board"}'),
  ('Conference Room',          'Admin Block',     'Meeting room',  30, '{"Video conferencing",AC}'),
  ('Computer Lab 1',           'CSE Block',       'Lab',           60, '{Computers,Projector}'),
  ('Library Discussion Room',  'Central Library', 'Meeting room',  15, '{Whiteboard}'),
  ('Open Air Theatre',         'Campus Grounds',  'Outdoor',      1000, '{Stage,"Sound system"}'),
  ('Indoor Sports Hall',       'Sports Complex',  'Sports',       200, '{"Badminton courts","Table tennis"}')
ON CONFLICT (name) DO NOTHING;
