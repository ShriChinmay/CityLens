-- Create work orders associated with verified incidents.

CREATE TABLE work_orders (
    id BIGSERIAL PRIMARY KEY,

    event_id INTEGER NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    assigned_to VARCHAR(255),

    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_work_order_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT check_work_order_priority
        CHECK (priority IN (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        )),

    CONSTRAINT check_work_order_status
        CHECK (status IN (
            'PENDING',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
        )),

    CONSTRAINT check_work_order_due_date
        CHECK (due_date IS NULL OR due_date >= created_at),

    CONSTRAINT check_work_order_completed_at
        CHECK (
            (status = 'COMPLETED' AND completed_at IS NOT NULL)
            OR
            (status != 'COMPLETED' AND completed_at IS NULL)
        )
);

-- Indexes for frequently used queries.
CREATE INDEX idx_work_orders_event_id
    ON work_orders(event_id);

CREATE INDEX idx_work_orders_status
    ON work_orders(status);

CREATE INDEX idx_work_orders_created_at
    ON work_orders(created_at);