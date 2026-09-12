CREATE TABLE cameras (
    id SERIAL PRIMARY KEY,

    bus_id INTEGER NOT NULL,

    camera_type VARCHAR(50) NOT NULL,

    position VARCHAR(50),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_camera_bus
        FOREIGN KEY (bus_id)
        REFERENCES buses(id)
);