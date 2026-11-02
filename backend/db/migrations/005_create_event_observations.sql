CREATE TABLE event_observations (
    id BIGSERIAL PRIMARY KEY,

    event_id INTEGER NOT NULL,
    bus_id INTEGER NOT NULL,
    camera_id INTEGER NOT NULL,

    observed_at TIMESTAMPTZ NOT NULL,

    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,

    confidence NUMERIC(4,3) NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}',
    evidence_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_observation_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_observation_bus
        FOREIGN KEY (bus_id)
        REFERENCES buses(id),

    CONSTRAINT fk_observation_camera
        FOREIGN KEY (camera_id)
        REFERENCES cameras(id),

    CONSTRAINT check_observation_confidence
        CHECK (confidence >= 0 AND confidence <= 1),

    CONSTRAINT check_observation_latitude
        CHECK (latitude >= -90 AND latitude <= 90),

    CONSTRAINT check_observation_longitude
        CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX idx_observations_event_id
    ON event_observations(event_id);

CREATE INDEX idx_observations_observed_at
    ON event_observations(observed_at);

CREATE INDEX idx_observations_location
    ON event_observations(latitude, longitude);