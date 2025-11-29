-- ============================================
-- KYC VERIFICATION - Persona integration
-- ============================================

-- Verification status enum
CREATE TYPE verification_status AS ENUM ('pending', 'initiated', 'processing', 'passed', 'failed', 'expired', 'requires_review');

-- Accreditation type enum
CREATE TYPE accreditation_type AS ENUM ('income', 'net_worth', 'professional', 'entity', 'spouse');

-- ============================================
-- KYC VERIFICATIONS TABLE
-- ============================================

CREATE TABLE kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Persona IDs
  persona_inquiry_id VARCHAR(255),
  persona_account_id VARCHAR(255),
  persona_template_id VARCHAR(255),

  -- Status
  status verification_status DEFAULT 'pending',
  completed_at TIMESTAMPTZ,

  -- Results (encrypted/masked)
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  address_line1 VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_postal_code VARCHAR(10),
  address_country VARCHAR(2) DEFAULT 'US',

  -- Verification Details
  id_number_last4 VARCHAR(4), -- Last 4 of SSN
  document_type VARCHAR(50), -- drivers_license, passport, etc.
  document_country VARCHAR(2),

  -- Risk Signals
  risk_score INTEGER,
  risk_signals JSONB DEFAULT '[]',

  -- Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kyc_user ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_status ON kyc_verifications(status);
CREATE INDEX idx_kyc_persona_inquiry ON kyc_verifications(persona_inquiry_id);

-- ============================================
-- ACCREDITATION VERIFICATIONS TABLE
-- ============================================

CREATE TABLE accreditation_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,

  -- Type & Status
  accreditation_type accreditation_type NOT NULL,
  status verification_status DEFAULT 'pending',

  -- Supporting Documents
  document_urls TEXT[], -- Array of document URLs

  -- Verification Details (depends on type)
  verification_details JSONB DEFAULT '{}',
  -- For income: { annual_income: 250000, tax_year: 2024 }
  -- For net_worth: { net_worth: 1500000, excluding_primary_residence: true }
  -- For professional: { license_type: 'Series 7', issuer: 'FINRA' }
  -- For entity: { entity_type: 'LLC', total_assets: 5000000 }

  -- Third-party verification
  verification_provider VARCHAR(50), -- manual, verify_investor, parallel_markets
  provider_reference_id VARCHAR(255),
  verification_letter_url TEXT,

  -- Expiration
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accred_investor ON accreditation_verifications(investor_id);
CREATE INDEX idx_accred_status ON accreditation_verifications(status);
CREATE INDEX idx_accred_type ON accreditation_verifications(accreditation_type);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- KYC Verifications
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC verifications"
  ON kyc_verifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own KYC verifications"
  ON kyc_verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins have full access to KYC verifications"
  ON kyc_verifications FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Accreditation Verifications
ALTER TABLE accreditation_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors can view own accreditation verifications"
  ON accreditation_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investors i
      WHERE i.id = accreditation_verifications.investor_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Investors can insert own accreditation verifications"
  ON accreditation_verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM investors i
      WHERE i.id = investor_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to accreditation verifications"
  ON accreditation_verifications FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER kyc_verifications_updated_at
  BEFORE UPDATE ON kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

CREATE TRIGGER accreditation_verifications_updated_at
  BEFORE UPDATE ON accreditation_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- ============================================
-- UPDATE INVESTOR KYC STATUS ON VERIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION update_investor_kyc_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'passed' THEN
    UPDATE investors
    SET
      kyc_status = 'passed',
      kyc_completed_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE investors
    SET kyc_status = 'failed'
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status IN ('initiated', 'processing') THEN
    UPDATE investors
    SET kyc_status = 'pending'
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status = 'requires_review' THEN
    UPDATE investors
    SET kyc_status = 'review'
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_investor_kyc_on_verification
  AFTER INSERT OR UPDATE OF status ON kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_kyc_status();

-- ============================================
-- UPDATE INVESTOR ACCREDITATION STATUS
-- ============================================

CREATE OR REPLACE FUNCTION update_investor_accreditation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'passed' THEN
    UPDATE investors
    SET
      accreditation_status = 'verified',
      accreditation_verified_at = NOW(),
      accreditation_expires_at = NEW.expires_at,
      accreditation_type = NEW.accreditation_type::TEXT
    WHERE id = NEW.investor_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE investors
    SET accreditation_status = 'rejected'
    WHERE id = NEW.investor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_investor_accred_on_verification
  AFTER INSERT OR UPDATE OF status ON accreditation_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_accreditation_status();
