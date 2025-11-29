-- ============================================
-- BANK HOLDS - Track regulatory hold periods
-- ============================================

-- Bank hold status
CREATE TYPE bank_hold_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'waived');

-- ============================================
-- BANK HOLDS TABLE
-- ============================================

CREATE TABLE bank_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_pool_id UUID NOT NULL REFERENCES loan_pools(id) ON DELETE CASCADE,

  -- Bank Details
  bank_name VARCHAR(255) NOT NULL,
  bank_state VARCHAR(2), -- UT, NJ, etc.

  -- Hold Period
  hold_start_date DATE NOT NULL,
  hold_end_date DATE NOT NULL, -- Typically 5 days after start
  hold_days INTEGER NOT NULL DEFAULT 5,

  -- Status
  status bank_hold_status DEFAULT 'pending',
  completed_at TIMESTAMPTZ,

  -- Documentation
  purchase_agreement_url TEXT,
  bank_certification_url TEXT,
  hold_confirmation_number VARCHAR(100),

  -- Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_holds_pool ON bank_holds(loan_pool_id);
CREATE INDEX idx_bank_holds_status ON bank_holds(status);
CREATE INDEX idx_bank_holds_end_date ON bank_holds(hold_end_date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bank_holds ENABLE ROW LEVEL SECURITY;

-- Lenders can view holds for their own pools
CREATE POLICY "Lenders can view own pool holds"
  ON bank_holds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.id = bank_holds.loan_pool_id
      AND l.user_id = auth.uid()
    )
  );

-- Lenders can insert holds for their own pools
CREATE POLICY "Lenders can insert own pool holds"
  ON bank_holds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.id = loan_pool_id
      AND l.user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to bank holds"
  ON bank_holds FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER bank_holds_updated_at
  BEFORE UPDATE ON bank_holds
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- ============================================
-- UPDATE LOAN POOL ON HOLD COMPLETION
-- ============================================

CREATE OR REPLACE FUNCTION update_loan_pool_hold_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE loan_pools
    SET
      bank_hold_completed = true,
      bank_hold_completed_at = NOW()
    WHERE id = NEW.loan_pool_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_pool_on_hold_complete
  AFTER UPDATE OF status ON bank_holds
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_pool_hold_status();

-- ============================================
-- FUNCTION TO CHECK EXPIRED HOLDS
-- ============================================

CREATE OR REPLACE FUNCTION check_and_complete_expired_holds()
RETURNS void AS $$
BEGIN
  -- Auto-complete holds that have passed their end date
  UPDATE bank_holds
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE status = 'in_progress'
    AND hold_end_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SCHEDULED JOB (run via cron or edge function)
-- ============================================
-- This should be called daily to auto-complete expired holds
-- Can be triggered via Supabase Edge Functions or external cron
