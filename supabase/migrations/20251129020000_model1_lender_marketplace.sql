-- ============================================
-- PRIMEBRIDGE FINANCE - MODEL 1: FINTECH LENDER MARKETPLACE
-- "AngelList for Private Credit"
-- ============================================
-- This migration transforms the schema from a business credit marketplace
-- to a fintech lender loan pool marketplace.
-- ============================================

-- Drop old tables if they exist (clean slate for Model 1)
DROP TABLE IF EXISTS investor_interest CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS investors CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ============================================
-- 1. USERS TABLE (updated roles)
-- ============================================
-- Keep existing users table but update role enum
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'lender', 'investor'));

-- ============================================
-- 2. LENDERS TABLE (Fintech Companies)
-- ============================================
-- Fintech lenders who originate loans and submit pools
CREATE TABLE lenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Company Information
  company_name TEXT NOT NULL,
  legal_entity_name TEXT,
  ein TEXT,
  website TEXT,

  -- Contact
  primary_contact_name TEXT NOT NULL,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT,

  -- Business Details
  year_founded INTEGER,
  headquarters_state TEXT,
  lending_licenses TEXT[], -- Array of states licensed in

  -- Loan Profile
  loan_types TEXT[] NOT NULL, -- ['consumer', 'auto', 'bnpl', 'medical', 'sme']
  avg_loan_size DECIMAL(12,2),
  monthly_origination_volume DECIMAL(14,2),
  total_loans_originated INTEGER,
  weighted_avg_apr DECIMAL(5,2),
  avg_loan_term_months INTEGER,

  -- Performance Metrics
  historical_default_rate DECIMAL(5,4), -- e.g., 0.0450 = 4.5%
  historical_loss_rate DECIMAL(5,4),
  avg_fico_score INTEGER,

  -- Bank Partnership
  bank_partner_name TEXT,
  bank_partner_state TEXT, -- NJ, UT, etc.

  -- Platform Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'suspended')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),

  -- Internal Notes
  admin_notes TEXT,
  risk_tier TEXT CHECK (risk_tier IN ('A', 'B', 'C', 'D', 'unrated')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- 3. INVESTORS TABLE (Accredited Investors)
-- ============================================
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Profile
  investor_type TEXT NOT NULL CHECK (investor_type IN ('individual', 'family_office', 'fund', 'institutional', 'ria')),
  firm_name TEXT,

  -- Investment Criteria
  min_check_size DECIMAL(12,2),
  max_check_size DECIMAL(12,2),
  target_yield_min DECIMAL(5,2), -- e.g., 10.00 = 10%
  target_yield_max DECIMAL(5,2),
  preferred_duration_months INTEGER[], -- [3, 6, 12, 24]
  preferred_loan_types TEXT[], -- ['consumer', 'auto', 'bnpl']
  preferred_risk_tiers TEXT[], -- ['A', 'B', 'C']

  -- Accreditation
  accreditation_status TEXT NOT NULL DEFAULT 'pending' CHECK (accreditation_status IN ('pending', 'verified', 'expired', 'rejected')),
  accreditation_type TEXT, -- 'income', 'net_worth', 'entity', 'professional'
  accreditation_verified_at TIMESTAMPTZ,
  accreditation_expires_at TIMESTAMPTZ,
  accreditation_document_url TEXT,

  -- KYC/AML
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'passed', 'failed', 'review')),
  kyc_completed_at TIMESTAMPTZ,

  -- Platform Status
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),

  -- Investment Tracking
  total_invested DECIMAL(14,2) DEFAULT 0,
  total_deals INTEGER DEFAULT 0,

  admin_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- 4. LOAN POOLS TABLE
-- ============================================
-- Batches of loans submitted by lenders for sale
CREATE TABLE loan_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID NOT NULL REFERENCES lenders(id) ON DELETE CASCADE,

  -- Pool Identification
  pool_name TEXT NOT NULL,
  pool_reference TEXT, -- Lender's internal reference

  -- Pool Composition
  loan_type TEXT NOT NULL, -- 'consumer', 'auto', 'bnpl', 'medical', 'sme'
  total_loans INTEGER NOT NULL,
  total_principal DECIMAL(14,2) NOT NULL,
  total_outstanding_balance DECIMAL(14,2) NOT NULL,

  -- Weighted Averages
  weighted_avg_apr DECIMAL(5,2) NOT NULL,
  weighted_avg_fico INTEGER,
  weighted_avg_dti DECIMAL(5,2),
  weighted_avg_term_months INTEGER NOT NULL,
  weighted_avg_seasoning_months DECIMAL(5,2), -- How old are the loans

  -- Risk Metrics
  current_delinquency_rate DECIMAL(5,4), -- 30+ days
  historical_default_rate DECIMAL(5,4),
  historical_loss_rate DECIMAL(5,4),
  expected_loss DECIMAL(5,4),

  -- Geographic Distribution
  top_states JSONB, -- {"CA": 25.5, "TX": 18.2, "FL": 12.1}

  -- Pricing
  asking_price DECIMAL(14,2), -- What lender wants
  asking_price_percent DECIMAL(5,2), -- As % of outstanding (e.g., 98.5)

  -- Bank Partnership Info
  originating_bank TEXT,
  bank_hold_completed BOOLEAN DEFAULT FALSE,
  bank_hold_completed_at TIMESTAMPTZ,

  -- Workflow Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Lender is still editing
    'submitted',       -- Submitted for review
    'under_review',    -- Admin reviewing
    'approved',        -- Approved, ready to become deal
    'rejected',        -- Not accepted
    'converted'        -- Converted to a deal
  )),

  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),

  -- Admin Assessment
  admin_notes TEXT,
  risk_assessment TEXT,
  suggested_yield DECIMAL(5,2),
  platform_risk_tier TEXT CHECK (platform_risk_tier IN ('A', 'B', 'C', 'D')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. LOAN POOL DOCUMENTS TABLE
-- ============================================
CREATE TABLE loan_pool_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_pool_id UUID NOT NULL REFERENCES loan_pools(id) ON DELETE CASCADE,

  document_type TEXT NOT NULL CHECK (document_type IN (
    'loan_tape',           -- Full loan-level data
    'performance_history', -- Historical performance
    'static_pool_analysis',-- Cohort analysis
    'servicing_agreement', -- Servicing terms
    'purchase_agreement',  -- Loan sale agreement template
    'bank_certification',  -- Bank partner certification
    'compliance_docs',     -- Licensing, disclosures
    'other'
  )),

  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  description TEXT,

  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. DEALS TABLE (Published Loan Pools)
-- ============================================
-- When a loan pool is approved, it becomes a deal for investors
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_pool_id UUID NOT NULL REFERENCES loan_pools(id),
  lender_id UUID NOT NULL REFERENCES lenders(id),

  -- Deal Terms
  title TEXT NOT NULL,
  description TEXT,

  -- Offering Details
  total_amount DECIMAL(14,2) NOT NULL,
  minimum_investment DECIMAL(12,2) NOT NULL DEFAULT 25000,
  target_yield DECIMAL(5,2) NOT NULL, -- Annual yield to investors
  term_months INTEGER NOT NULL,
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'quarterly')),

  -- Risk Classification
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('A', 'B', 'C', 'D')),

  -- Underlying Pool Summary
  loan_type TEXT NOT NULL,
  total_loans INTEGER NOT NULL,
  weighted_avg_fico INTEGER,
  expected_loss DECIMAL(5,4),

  -- Funding Status
  amount_committed DECIMAL(14,2) DEFAULT 0,
  amount_funded DECIMAL(14,2) DEFAULT 0,
  investor_count INTEGER DEFAULT 0,

  -- Deal Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Being prepared
    'published',       -- Live for investor review
    'fully_committed', -- All capital committed
    'funding',         -- Capital being transferred
    'funded',          -- Deal closed, loans purchased
    'performing',      -- Loans are performing
    'completed',       -- All principal returned
    'defaulted'        -- Material defaults
  )),

  published_at TIMESTAMPTZ,
  funding_deadline TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,

  -- Documents
  credit_memo_url TEXT,
  term_sheet_url TEXT,

  -- Platform Fees
  platform_fee_percent DECIMAL(4,2) DEFAULT 2.50, -- e.g., 2.5%
  servicing_fee_percent DECIMAL(4,2) DEFAULT 0.50,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 7. DEAL COMMITMENTS TABLE
-- ============================================
CREATE TABLE deal_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,

  -- Commitment Details
  amount DECIMAL(12,2) NOT NULL,
  commitment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',     -- Interest indicated
    'confirmed',   -- Investor confirmed
    'funded',      -- Capital received
    'withdrawn',   -- Investor withdrew
    'returned'     -- Capital returned (deal didn't close)
  )),

  confirmed_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,

  -- Returns Tracking (for funded deals)
  principal_returned DECIMAL(12,2) DEFAULT 0,
  interest_earned DECIMAL(12,2) DEFAULT 0,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(deal_id, investor_id) -- One commitment per investor per deal
);

-- ============================================
-- 8. ACTIVITY LOG (Audit Trail)
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'lender', 'investor', 'loan_pool', 'deal', 'commitment'
  entity_id UUID,

  details JSONB,
  ip_address INET,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 9. INDEXES
-- ============================================
CREATE INDEX idx_lenders_user ON lenders(user_id);
CREATE INDEX idx_lenders_status ON lenders(status);
CREATE INDEX idx_investors_user ON investors(user_id);
CREATE INDEX idx_investors_approved ON investors(approved);
CREATE INDEX idx_loan_pools_lender ON loan_pools(lender_id);
CREATE INDEX idx_loan_pools_status ON loan_pools(status);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_lender ON deals(lender_id);
CREATE INDEX idx_deal_commitments_deal ON deal_commitments(deal_id);
CREATE INDEX idx_deal_commitments_investor ON deal_commitments(investor_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- ============================================
-- 10. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_pool_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM users WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- LENDERS POLICIES
CREATE POLICY "Lenders can view own profile" ON lenders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Lenders can update own profile" ON lenders
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to lenders" ON lenders
  FOR ALL USING (is_admin(auth.uid()));

-- INVESTORS POLICIES
CREATE POLICY "Investors can view own profile" ON investors
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Investors can update own profile" ON investors
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to investors" ON investors
  FOR ALL USING (is_admin(auth.uid()));

-- LOAN POOLS POLICIES
CREATE POLICY "Lenders can view own pools" ON loan_pools
  FOR SELECT USING (
    lender_id IN (SELECT id FROM lenders WHERE user_id = auth.uid())
  );

CREATE POLICY "Lenders can create pools" ON loan_pools
  FOR INSERT WITH CHECK (
    lender_id IN (SELECT id FROM lenders WHERE user_id = auth.uid())
  );

CREATE POLICY "Lenders can update own draft pools" ON loan_pools
  FOR UPDATE USING (
    lender_id IN (SELECT id FROM lenders WHERE user_id = auth.uid())
    AND status = 'draft'
  );

CREATE POLICY "Admins have full access to loan pools" ON loan_pools
  FOR ALL USING (is_admin(auth.uid()));

-- LOAN POOL DOCUMENTS POLICIES
CREATE POLICY "Lenders can manage own pool documents" ON loan_pool_documents
  FOR ALL USING (
    loan_pool_id IN (
      SELECT lp.id FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE l.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to pool documents" ON loan_pool_documents
  FOR ALL USING (is_admin(auth.uid()));

-- DEALS POLICIES
CREATE POLICY "Published deals visible to approved investors" ON deals
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM investors WHERE user_id = auth.uid() AND approved = true
    )
  );

CREATE POLICY "Lenders can view deals from their pools" ON deals
  FOR SELECT USING (
    lender_id IN (SELECT id FROM lenders WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins have full access to deals" ON deals
  FOR ALL USING (is_admin(auth.uid()));

-- DEAL COMMITMENTS POLICIES
CREATE POLICY "Investors can view own commitments" ON deal_commitments
  FOR SELECT USING (
    investor_id IN (SELECT id FROM investors WHERE user_id = auth.uid())
  );

CREATE POLICY "Investors can create commitments" ON deal_commitments
  FOR INSERT WITH CHECK (
    investor_id IN (SELECT id FROM investors WHERE user_id = auth.uid() AND approved = true)
  );

CREATE POLICY "Admins have full access to commitments" ON deal_commitments
  FOR ALL USING (is_admin(auth.uid()));

-- ACTIVITY LOG POLICIES
CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to activity log" ON activity_log
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================
-- 11. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lenders_updated_at BEFORE UPDATE ON lenders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER investors_updated_at BEFORE UPDATE ON investors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER loan_pools_updated_at BEFORE UPDATE ON loan_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deal_commitments_updated_at BEFORE UPDATE ON deal_commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 12. FUNCTIONS FOR DEAL METRICS
-- ============================================

-- Update deal metrics when commitments change
CREATE OR REPLACE FUNCTION update_deal_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deals SET
    amount_committed = (
      SELECT COALESCE(SUM(amount), 0)
      FROM deal_commitments
      WHERE deal_id = COALESCE(NEW.deal_id, OLD.deal_id)
      AND status NOT IN ('withdrawn', 'returned')
    ),
    investor_count = (
      SELECT COUNT(DISTINCT investor_id)
      FROM deal_commitments
      WHERE deal_id = COALESCE(NEW.deal_id, OLD.deal_id)
      AND status NOT IN ('withdrawn', 'returned')
    )
  WHERE id = COALESCE(NEW.deal_id, OLD.deal_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deal_metrics_on_commitment
  AFTER INSERT OR UPDATE OR DELETE ON deal_commitments
  FOR EACH ROW EXECUTE FUNCTION update_deal_metrics();
