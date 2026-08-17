-- ==========================================================
-- Aparaitech Software - Student Email Blast Database Schema
-- ==========================================================

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    college TEXT NOT NULL,
    phone TEXT,
    branch TEXT DEFAULT 'Computer Science',
    batch TEXT DEFAULT '2026',
    status TEXT DEFAULT 'Active', -- 'Active', 'Unsubscribed', 'Placed', 'Blacklisted'
    import_batch_id TEXT,        -- Unique ID for the bulk upload batch (e.g. batch_1723871234_iitb)
    import_source TEXT DEFAULT 'Manual Entry', -- Name of spreadsheet file or source
    tags TEXT DEFAULT '[]',       -- JSON array of tags, e.g. ["B.Tech", "Shortlisted", "Baramati"]
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup & filtering
CREATE INDEX IF NOT EXISTS idx_students_college ON students(college);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_import_batch ON students(import_batch_id);

-- Table: templates
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Placement Drive', -- 'Placement Drive', 'Internship', 'Hackathon', 'Interview', 'Offer'
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    tags_used TEXT DEFAULT '["{Name}", "{College}"]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    target_type TEXT DEFAULT 'all',      -- 'all', 'college', 'batch', 'selected'
    target_filter TEXT DEFAULT '',       -- JSON filter metadata
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',         -- 'draft', 'in_progress', 'paused', 'completed', 'cancelled'
    speed_eps REAL DEFAULT 0,            -- emails per second
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: campaign_recipients
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    student_id INTEGER,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_college TEXT,
    recipient_phone TEXT,
    status TEXT DEFAULT 'pending',       -- 'pending', 'sent', 'failed'
    error_message TEXT DEFAULT '',
    latency_ms INTEGER DEFAULT 0,
    rendered_subject TEXT,
    rendered_body TEXT,
    sent_at DATETIME,
    attempts INTEGER DEFAULT 0,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_camp_recip_camp_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_recip_status ON campaign_recipients(status);

-- Table: settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: simulated_inbox (Stores sent emails in sandbox mode for verification)
CREATE TABLE IF NOT EXISTS simulated_inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    college TEXT,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    from_address TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER DEFAULT 0
);
