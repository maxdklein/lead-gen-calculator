-- Lead Gen Calculator Database Schema

-- Leads table - stores all calculator submissions
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,

    -- Contact Information
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    phone VARCHAR(50),

    -- ROI Configuration
    company_type VARCHAR(50),
    use_case VARCHAR(50),
    roi_model VARCHAR(30),
    fte_cost DECIMAL(10,2),
    backfill_rate_type VARCHAR(20),

    -- Business Inputs (all nullable, varies by use case)
    monthly_documents INTEGER,
    annual_backfill INTEGER,
    m_and_a_transactions_per_year INTEGER,
    avg_households_per_transaction INTEGER,
    historical_households_to_migrate INTEGER,
    annual_new_clients INTEGER,
    annual_investors_onboarded INTEGER,

    -- Calculated Results (stored for admin view)
    monthly_hours_saved DECIMAL(10,2),
    annual_savings DECIMAL(10,2),
    backfill_cost_saved DECIMAL(10,2),
    ftes_avoided DECIMAL(10,2),
    strategic_benefits JSONB,

    -- Tracking
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'new',
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contacted_at TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_company_type ON leads(company_type);
CREATE INDEX IF NOT EXISTS idx_leads_use_case ON leads(use_case);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ROI Defaults - system-wide calculation defaults (single row, id=1)
CREATE TABLE IF NOT EXISTS roi_defaults (
    id SERIAL PRIMARY KEY,
    triage_time_per_doc INTEGER DEFAULT 5,
    data_entry_time_per_doc INTEGER DEFAULT 15,
    analyst_hourly_rate DECIMAL(10,2) DEFAULT 50,
    backfill_hourly_rate DECIMAL(10,2) DEFAULT 150,
    docs_per_household INTEGER DEFAULT 10,
    docs_per_client INTEGER DEFAULT 10,
    docs_per_investor INTEGER DEFAULT 5,
    default_fte_cost DECIMAL(10,2) DEFAULT 85000
);

-- Insert default row
INSERT INTO roi_defaults (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Admin Users - for dashboard access
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session store table (for connect-pg-simple)
-- Note: connect-pg-simple creates this table automatically with createTableIfMissing: true
-- We only create the index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'session') THEN
        CREATE TABLE "session" (
            "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL
        );
    END IF;
END
$$;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Strategic Benefits - predefined benefits by use case
CREATE TABLE IF NOT EXISTS strategic_benefits (
    id SERIAL PRIMARY KEY,
    use_case VARCHAR(100) NOT NULL,
    benefit_text TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Seed strategic benefits
INSERT INTO strategic_benefits (use_case, benefit_text, display_order) VALUES
-- Critical Business Process
('critical_business_process', 'Flag discrepancies between billing actuals and fee schedules', 1),
('critical_business_process', 'Avoid using outdated agreements', 2),
('critical_business_process', 'Enable data-driven billing strategy changes', 3),
('critical_business_process', 'Use data for marketing to different client segments', 4),

-- M&A Transitions
('m_and_a_transitions', 'Eliminate "all hands on deck" fire drills for each acquisition', 1),
('m_and_a_transitions', 'Remove Excel burden from acquired firms', 2),
('m_and_a_transitions', 'Client data keeps pace with account migration', 3),
('m_and_a_transitions', 'Hit/beat 60-day integration benchmark', 4),
('m_and_a_transitions', 'Build track record that attracts better targets', 5),

-- Prospects & Onboarding
('prospects_onboarding', 'Faster time-to-revenue', 1),
('prospects_onboarding', 'Fewer NIGOs (Not In Good Order)', 2),
('prospects_onboarding', 'Scale prospect volume without scaling ops team', 3),
('prospects_onboarding', 'Unlock existing client organic growth by bringing data online', 4),

-- New Investor Onboarding
('new_investor_onboarding', 'Faster capital deployment', 1),
('new_investor_onboarding', 'Stop passing burden to advisors and investors', 2),
('new_investor_onboarding', 'Close the gap between "tech-forward" marketing and operational reality', 3),
('new_investor_onboarding', 'Unlock subscription doc recycling', 4),
('new_investor_onboarding', 'Competitive differentiation vs. other platforms', 5)
ON CONFLICT DO NOTHING;
