-- PrimeBridge Finance Database Schema
-- MVP v1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('borrower', 'investor', 'admin')),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for auth lookups
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);

-- =============================================================================
-- COMPANIES TABLE (Borrower side)
-- =============================================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  industry TEXT,
  revenue NUMERIC,
  ebitda NUMERIC,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_owner ON companies(owner_user_id);

-- =============================================================================
-- APPLICATIONS TABLE
-- =============================================================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount_requested NUMERIC NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'submitted', 'under_review', 'term_sheet', 'in_funding', 'funded', 'rejected')
  ) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_company ON applications(company_id);
CREATE INDEX idx_applications_status ON applications(status);

-- =============================================================================
-- DOCUMENTS TABLE (Borrower uploads)
-- =============================================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_application ON documents(application_id);

-- =============================================================================
-- INVESTORS TABLE
-- =============================================================================
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_name TEXT,
  check_size_min NUMERIC,
  check_size_max NUMERIC,
  accredited BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_investors_user ON investors(user_id);
CREATE INDEX idx_investors_approved ON investors(approved);

-- =============================================================================
-- DEALS TABLE (What investors see)
-- =============================================================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  interest_rate NUMERIC,
  term_months INTEGER,
  funding_needed NUMERIC,
  memo_url TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_application ON deals(application_id);
CREATE INDEX idx_deals_published ON deals(published);

-- =============================================================================
-- INVESTOR INTEREST TABLE
-- =============================================================================
CREATE TABLE investor_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  amount_indicated NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('interested', 'committed', 'withdrawn')
  ) DEFAULT 'interested',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_id, deal_id)
);

CREATE INDEX idx_investor_interest_investor ON investor_interest(investor_id);
CREATE INDEX idx_investor_interest_deal ON investor_interest(deal_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_interest ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM users
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- USERS POLICIES
-- =============================================================================

-- Users can read their own row
CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  USING (auth_user_id = auth.uid() OR is_admin());

-- Users can update their own row
CREATE POLICY "Users can update own row"
  ON users FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- =============================================================================
-- COMPANIES POLICIES
-- =============================================================================

-- Borrowers can CRUD their own companies
CREATE POLICY "Borrowers can read own companies"
  ON companies FOR SELECT
  USING (
    owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Borrowers can insert companies"
  ON companies FOR INSERT
  WITH CHECK (
    owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid() AND role = 'borrower')
  );

CREATE POLICY "Borrowers can update own companies"
  ON companies FOR UPDATE
  USING (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- =============================================================================
-- APPLICATIONS POLICIES
-- =============================================================================

-- Borrowers can read their own applications
CREATE POLICY "Borrowers can read own applications"
  ON applications FOR SELECT
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN users u ON c.owner_user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
    OR is_admin()
  );

-- Borrowers can insert applications for their companies
CREATE POLICY "Borrowers can insert applications"
  ON applications FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN users u ON c.owner_user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND u.role = 'borrower'
    )
  );

-- Borrowers can update their own applications (admin can update any)
CREATE POLICY "Borrowers can update own applications"
  ON applications FOR UPDATE
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN users u ON c.owner_user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
    OR is_admin()
  );

-- =============================================================================
-- DOCUMENTS POLICIES
-- =============================================================================

-- Borrowers can read their own documents
CREATE POLICY "Borrowers can read own documents"
  ON documents FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN companies c ON a.company_id = c.id
      JOIN users u ON c.owner_user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
    OR is_admin()
  );

-- Borrowers can insert documents for their applications
CREATE POLICY "Borrowers can insert documents"
  ON documents FOR INSERT
  WITH CHECK (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN companies c ON a.company_id = c.id
      JOIN users u ON c.owner_user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- =============================================================================
-- INVESTORS POLICIES
-- =============================================================================

-- Investors can read their own profile
CREATE POLICY "Investors can read own profile"
  ON investors FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR is_admin()
  );

-- Investors can update their own profile
CREATE POLICY "Investors can update own profile"
  ON investors FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- =============================================================================
-- DEALS POLICIES
-- =============================================================================

-- Approved investors can read published deals
CREATE POLICY "Approved investors can read published deals"
  ON deals FOR SELECT
  USING (
    (published = TRUE AND EXISTS (
      SELECT 1 FROM investors i
      JOIN users u ON i.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND i.approved = TRUE
    ))
    OR is_admin()
    -- Borrowers can see deals for their applications
    OR application_id IN (
      SELECT a.id FROM applications a
      JOIN companies c ON a.company_id = c.id
      JOIN users u ON c.owner_user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Only admins can insert/update deals
CREATE POLICY "Admins can insert deals"
  ON deals FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update deals"
  ON deals FOR UPDATE
  USING (is_admin());

-- =============================================================================
-- INVESTOR INTEREST POLICIES
-- =============================================================================

-- Investors can read their own interests
CREATE POLICY "Investors can read own interests"
  ON investor_interest FOR SELECT
  USING (
    investor_id IN (
      SELECT i.id FROM investors i
      JOIN users u ON i.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
    OR is_admin()
  );

-- Approved investors can insert interests
CREATE POLICY "Approved investors can insert interests"
  ON investor_interest FOR INSERT
  WITH CHECK (
    investor_id IN (
      SELECT i.id FROM investors i
      JOIN users u ON i.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND i.approved = TRUE
    )
  );

-- Investors can update their own interests
CREATE POLICY "Investors can update own interests"
  ON investor_interest FOR UPDATE
  USING (
    investor_id IN (
      SELECT i.id FROM investors i
      JOIN users u ON i.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- =============================================================================
-- STORAGE BUCKETS (Run these in Supabase Dashboard or via API)
-- =============================================================================
-- Note: Storage bucket creation and policies are typically done via Dashboard
-- or separate API calls. The following are SQL comments for reference:

-- Bucket: borrower-documents
-- Path: applications/<application_id>/<filename>
-- Access: Borrower (owner) & admin: read/write

-- Bucket: deal-memos
-- Path: deals/<deal_id>/memo.pdf
-- Access: Admin: read/write, Approved investors: read-only
