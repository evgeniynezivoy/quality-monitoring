-- Migration: Add Returns support
-- Date: 2026-01-28

-- Add cc_abbreviation to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS cc_abbreviation VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_users_cc_abbr ON users(cc_abbreviation);

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    external_row_id VARCHAR(100),
    external_row_hash VARCHAR(64),

    return_date DATE NOT NULL,
    client_name VARCHAR(255),
    block VARCHAR(100),
    cid VARCHAR(255),

    cc_abbreviation VARCHAR(50),
    cc_user_id INTEGER REFERENCES users(id),
    team_lead_name VARCHAR(255),

    reasons JSONB,
    total_leads INTEGER DEFAULT 0,

    cc_fault INTEGER,

    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(external_row_hash)
);

-- Create returns sync logs table
CREATE TABLE IF NOT EXISTS returns_sync_logs (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed')),
    rows_fetched INTEGER DEFAULT 0,
    rows_with_cc_fault INTEGER DEFAULT 0,
    rows_inserted INTEGER DEFAULT 0,
    rows_updated INTEGER DEFAULT 0,
    error_message TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(return_date DESC);
CREATE INDEX IF NOT EXISTS idx_returns_cc_user ON returns(cc_user_id);
CREATE INDEX IF NOT EXISTS idx_returns_cc_abbr ON returns(cc_abbreviation);
CREATE INDEX IF NOT EXISTS idx_returns_cc_fault ON returns(cc_fault);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at
    BEFORE UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
