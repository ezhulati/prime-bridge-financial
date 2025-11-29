-- ============================================
-- LOANS TABLE - Individual loan-level data from loan tapes
-- ============================================

-- Loan status enum
CREATE TYPE loan_status AS ENUM ('current', 'delinquent_30', 'delinquent_60', 'delinquent_90', 'default', 'charged_off', 'paid_off');

-- Individual loans table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_pool_id UUID NOT NULL REFERENCES loan_pools(id) ON DELETE CASCADE,

  -- Loan Identification
  loan_reference VARCHAR(100) NOT NULL, -- Lender's internal loan ID

  -- Borrower Info (anonymized)
  borrower_state VARCHAR(2),
  borrower_zip VARCHAR(10),

  -- Loan Terms
  original_principal DECIMAL(12,2) NOT NULL,
  current_balance DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL, -- APR as percentage
  term_months INTEGER NOT NULL,
  origination_date DATE NOT NULL,
  maturity_date DATE,

  -- Credit Profile
  fico_score INTEGER CHECK (fico_score >= 300 AND fico_score <= 850),
  dti_ratio DECIMAL(5,2), -- Debt-to-income as percentage

  -- Payment Info
  monthly_payment DECIMAL(10,2),
  payments_made INTEGER DEFAULT 0,
  payments_remaining INTEGER,

  -- Status
  status loan_status DEFAULT 'current',
  days_delinquent INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_loans_pool_id ON loans(loan_pool_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_fico ON loans(fico_score);
CREATE INDEX idx_loans_state ON loans(borrower_state);

-- Unique constraint: loan reference within a pool
CREATE UNIQUE INDEX idx_loans_unique_ref ON loans(loan_pool_id, loan_reference);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Lenders can view loans in their own pools
CREATE POLICY "Lenders can view own pool loans"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.id = loans.loan_pool_id
      AND l.user_id = auth.uid()
    )
  );

-- Lenders can insert loans into their own pools
CREATE POLICY "Lenders can insert own pool loans"
  ON loans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.id = loan_pool_id
      AND l.user_id = auth.uid()
    )
  );

-- Lenders can update loans in their own pools (only drafts)
CREATE POLICY "Lenders can update own draft pool loans"
  ON loans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.id = loans.loan_pool_id
      AND l.user_id = auth.uid()
      AND lp.status = 'draft'
    )
  );

-- Lenders can delete loans in their own pools (only drafts)
CREATE POLICY "Lenders can delete own draft pool loans"
  ON loans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.id = loans.loan_pool_id
      AND l.user_id = auth.uid()
      AND lp.status = 'draft'
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to loans"
  ON loans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Investors can view loans in published deals
CREATE POLICY "Investors can view loans in published deals"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN investors i ON i.user_id = auth.uid()
      WHERE d.loan_pool_id = loans.loan_pool_id
      AND d.status IN ('published', 'fully_committed', 'funding', 'funded', 'performing')
      AND i.approved = true
    )
  );
