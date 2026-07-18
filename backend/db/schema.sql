-- db/schema.sql
-- Table definitions for THESEUS

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table (scaffolded in migrations, added here for completeness)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    source_type VARCHAR(255),
    source_name VARCHAR(255),
    chunk_text TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_org_id_created_at ON documents (org_id, created_at);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_org_id_created_at ON customers (org_id, created_at);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_org_id_created_at ON vendors (org_id, created_at);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    direction VARCHAR(50) NOT NULL CHECK (direction IN ('inflow', 'outflow')),
    category VARCHAR(255),
    counterparty_name VARCHAR(255),
    counterparty_type VARCHAR(50) CHECK (counterparty_type IN ('customer', 'vendor', 'other')),
    source_document_id INT REFERENCES documents(id) ON DELETE SET NULL,
    raw_description TEXT,
    is_duplicate_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_org_id_date ON transactions (org_id, date);

-- Revenue table
CREATE TABLE IF NOT EXISTS revenue (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revenue_org_id_date ON revenue (org_id, date);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    category VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_org_id_date ON expenses (org_id, date);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_date DATE,
    linked_payment_id INT, -- Will refer to payments(id) without FK constraint during creation to avoid circular reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_id_issue_date ON invoices (org_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id_due_date ON invoices (org_id, due_date);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    invoice_id INT REFERENCES invoices(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    method VARCHAR(100) NOT NULL,
    matched_transaction_id INT REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_org_id_date ON payments (org_id, date);

-- Add foreign key constraint for linked_payment_id in invoices after payments is created
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_linked_payment FOREIGN KEY (linked_payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- Cash Balances table
CREATE TABLE IF NOT EXISTS cash_balances (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    balance DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_balances_org_id_date ON cash_balances (org_id, date);

-- GST Data table
CREATE TABLE IF NOT EXISTS gst_data (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    period VARCHAR(50) NOT NULL,
    amount_collected DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gst_data_org_id_created_at ON gst_data (org_id, created_at);

-- Forecast Data table
CREATE TABLE IF NOT EXISTS forecast_data (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    horizon_days INT NOT NULL CHECK (horizon_days IN (30, 60, 90)),
    p10 DECIMAL(15, 2) NOT NULL,
    p50 DECIMAL(15, 2) NOT NULL,
    p90 DECIMAL(15, 2) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50) NOT NULL,
    needs_recompute BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forecast_data_org_id_generated_at ON forecast_data (org_id, generated_at);

-- Reliability Scores table
CREATE TABLE IF NOT EXISTS reliability_scores (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    entity_id INT NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customer', 'vendor')),
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0.0 AND score <= 100.0),
    avg_delay_days DECIMAL(10, 2),
    consistency_rating VARCHAR(50),
    last_computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    needs_recompute BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reliability_scores_org_id_last_computed ON reliability_scores (org_id, last_computed_at);

-- Anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN ('duplicate_payment', 'spending_spike', 'missing_payment', 'revenue_drop')),
    severity VARCHAR(50) NOT NULL,
    related_transaction_id INT REFERENCES transactions(id) ON DELETE SET NULL,
    description TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anomalies_org_id_detected_at ON anomalies (org_id, detected_at);
