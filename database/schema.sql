-- Quality Monitoring Database Schema

-- Users (синхронизируется из Team Roster sheet)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    team_lead_id INTEGER REFERENCES users(id),
    team VARCHAR(50) NOT NULL,  -- LV, CS, Block, CDT_CW, QA
    role VARCHAR(20) DEFAULT 'cc' CHECK (role IN ('admin', 'team_lead', 'cc')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Issue sources (конфигурация Google Sheets)
CREATE TABLE issue_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,  -- LV, CS, Block, CDT_CW, QA
    display_name VARCHAR(100) NOT NULL,
    google_sheet_id VARCHAR(100) NOT NULL,
    sheet_gid VARCHAR(50) DEFAULT '0',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Issues (унифицированная таблица из всех источников)
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES issue_sources(id),
    external_row_hash VARCHAR(64),  -- для дедупликации

    -- Common fields
    issue_date DATE NOT NULL,
    responsible_cc_id INTEGER REFERENCES users(id),
    responsible_cc_name VARCHAR(255),
    cid VARCHAR(255),
    issue_type VARCHAR(500) NOT NULL,
    comment TEXT,
    issue_rate SMALLINT CHECK (issue_rate BETWEEN 1 AND 3),
    issue_category VARCHAR(20) CHECK (issue_category IN ('client', 'internal')),

    -- Source-specific
    reported_by VARCHAR(500),
    task_id VARCHAR(255),
    received_datetime TIMESTAMPTZ,
    question_datetime TIMESTAMPTZ,
    answer_datetime TIMESTAMPTZ,

    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(source_id, external_row_hash)
);

-- Sync logs
CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES issue_sources(id),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed')),
    rows_fetched INTEGER DEFAULT 0,
    rows_inserted INTEGER DEFAULT 0,
    rows_updated INTEGER DEFAULT 0,
    error_message TEXT
);

-- Refresh tokens for JWT
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Email report logs
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,  -- 'operations', 'team_lead'
    report_date DATE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    issues_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_issues_date ON issues(issue_date DESC);
CREATE INDEX idx_issues_source ON issues(source_id);
CREATE INDEX idx_issues_cc ON issues(responsible_cc_id);
CREATE INDEX idx_issues_rate ON issues(issue_rate);
CREATE INDEX idx_issues_category ON issues(issue_category);
CREATE INDEX idx_users_team_lead ON users(team_lead_id);
CREATE INDEX idx_users_team ON users(team);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sync_logs_source ON sync_logs(source_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_report_type ON email_logs(report_type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
