CREATE TABLE events (
    id SERIAL PRIMARY KEY,

    bus_id INTEGER NOT NULL,

    camera_id INTEGER NOT NULL,

    event_type VARCHAR(50) NOT NULL,

    confidence NUMERIC(4,3) NOT NULL,

    severity VARCHAR(20) NOT NULL,

    detected_at TIMESTAMPTZ NOT NULL,

    latitude NUMERIC(9,6) NOT NULL,

    longitude NUMERIC(9,6) NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}',

    evidence_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_event_bus
        FOREIGN KEY (bus_id)
        REFERENCES buses(id),

    CONSTRAINT fk_event_camera
        FOREIGN KEY (camera_id)
        REFERENCES cameras(id),

    CONSTRAINT check_confidence
        CHECK (confidence >= 0 AND confidence <= 1),

    CONSTRAINT check_latitude
        CHECK (latitude >= -90 AND latitude <= 90),

    CONSTRAINT check_longitude
        CHECK (longitude >= -180 AND longitude <= 180)
);