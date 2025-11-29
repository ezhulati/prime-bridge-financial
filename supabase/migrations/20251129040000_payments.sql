-- ============================================
-- PAYMENTS - Stripe integration for ACH payments
-- ============================================

-- Payment method status
CREATE TYPE payment_method_status AS ENUM ('pending', 'verified', 'failed', 'removed');

-- Transaction status
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled');

-- Transaction type
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'investment', 'return', 'interest', 'fee', 'refund');

-- ============================================
-- PAYMENT METHODS
-- ============================================

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe IDs
  stripe_customer_id VARCHAR(255),
  stripe_payment_method_id VARCHAR(255),
  stripe_bank_account_id VARCHAR(255),

  -- Bank Account Details (masked)
  bank_name VARCHAR(100),
  account_type VARCHAR(20), -- checking, savings
  last_four VARCHAR(4),
  routing_last_four VARCHAR(4),

  -- Verification
  status payment_method_status DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verification_method VARCHAR(50), -- micro_deposits, instant, plaid

  -- Flags
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_stripe_customer ON payment_methods(stripe_customer_id);

-- ============================================
-- TRANSACTIONS
-- ============================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Type & Status
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'pending',

  -- Amount
  amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,

  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  stripe_payout_id VARCHAR(255),

  -- References
  payment_method_id UUID REFERENCES payment_methods(id),
  deal_id UUID REFERENCES deals(id),
  commitment_id UUID REFERENCES deal_commitments(id),

  -- Description
  description TEXT,

  -- Processing
  processed_at TIMESTAMPTZ,
  failed_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_deal ON transactions(deal_id);
CREATE INDEX idx_transactions_commitment ON transactions(commitment_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_stripe_pi ON transactions(stripe_payment_intent_id);

-- ============================================
-- WALLET / BALANCE
-- ============================================

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Balances
  available_balance DECIMAL(12,2) DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance DECIMAL(12,2) DEFAULT 0 CHECK (pending_balance >= 0),

  -- Stripe Connect (for lender payouts)
  stripe_connect_account_id VARCHAR(255),
  stripe_connect_status VARCHAR(50), -- pending, active, restricted, disabled

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON wallets(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Payment Methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to payment methods"
  ON payment_methods FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to transactions"
  ON transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to wallets"
  ON wallets FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger for payment_methods
CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- Update timestamp trigger for transactions
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- Update timestamp trigger for wallets
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create wallet when user is created
CREATE TRIGGER create_wallet_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_wallet();
