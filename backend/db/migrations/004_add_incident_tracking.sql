-- Add incident-level aggregation fields to existing events.
-- Existing rows remain valid and are initialized as individual incidents.

ALTER TABLE events
    ADD COLUMN detection_count INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN first_seen_at TIMESTAMPTZ,
    ADD COLUMN last_seen_at TIMESTAMPTZ,
    ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'DETECTED';

-- Backfill timestamps for incidents already in the database.
UPDATE events
SET
    first_seen_at = detected_at,
    last_seen_at = detected_at
WHERE first_seen_at IS NULL
   OR last_seen_at IS NULL;

-- Keep counts valid.
ALTER TABLE events
    ALTER COLUMN first_seen_at SET NOT NULL,
    ALTER COLUMN last_seen_at SET NOT NULL,
    ADD CONSTRAINT check_events_detection_count
        CHECK (detection_count >= 1),
    ADD CONSTRAINT check_events_status
        CHECK (status IN (
            'DETECTED',
            'VERIFIED',
            'WORK_ORDER_ISSUED',
            'RESOLVED',
            'AUDITED'
        ));