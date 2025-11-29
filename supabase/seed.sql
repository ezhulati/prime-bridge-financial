-- ============================================
-- PRIMEBRIDGE FINANCE - SEED DATA FOR TESTING
-- ============================================
-- Run this after migrations to populate test data
-- Usage: Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TEST USERS
-- ============================================
-- Note: Passwords should be set via Supabase Auth, not here
-- These are placeholder user records that link to auth.users

-- Admin user
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@primebridge.finance',
  'Platform Admin',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Lender users
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'demo-lender@example.com', 'Alex Thompson', 'lender', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', 'lending@quickcredit.io', 'Sarah Chen', 'lender', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Investor users
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'demo-investor@example.com', 'Michael Roberts', 'investor', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000002', 'investments@familyoffice.com', 'Jennifer Walsh', 'investor', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. LENDER PROFILES
-- ============================================

INSERT INTO lenders (
  id, user_id, company_name, legal_entity_name, ein, website,
  primary_contact_name, primary_contact_email, primary_contact_phone,
  year_founded, headquarters_state, lending_licenses,
  loan_types, avg_loan_size, monthly_origination_volume, total_loans_originated,
  weighted_avg_apr, avg_loan_term_months,
  historical_default_rate, historical_loss_rate, avg_fico_score,
  bank_partner_name, bank_partner_state,
  status, approved_at, risk_tier, created_at, updated_at
)
VALUES
(
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'QuickCredit Finance',
  'QuickCredit Finance, LLC',
  '12-3456789',
  'https://quickcredit.example.com',
  'Alex Thompson',
  'demo-lender@example.com',
  '(555) 123-4567',
  2019,
  'TX',
  ARRAY['TX', 'CA', 'FL', 'NY', 'IL'],
  ARRAY['consumer'],
  8500.00,
  12000000.00,
  45000,
  18.50,
  36,
  0.0425,
  0.0285,
  680,
  'Cross River Bank',
  'NJ',
  'approved',
  NOW() - INTERVAL '30 days',
  'B',
  NOW() - INTERVAL '60 days',
  NOW()
),
(
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'AutoLend Pro',
  'AutoLend Pro Inc.',
  '98-7654321',
  'https://autolendpro.example.com',
  'Sarah Chen',
  'lending@quickcredit.io',
  '(555) 987-6543',
  2017,
  'CA',
  ARRAY['CA', 'AZ', 'NV', 'OR', 'WA'],
  ARRAY['auto'],
  15000.00,
  25000000.00,
  82000,
  12.75,
  48,
  0.0320,
  0.0180,
  695,
  'Celtic Bank',
  'UT',
  'approved',
  NOW() - INTERVAL '45 days',
  'A',
  NOW() - INTERVAL '90 days',
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. INVESTOR PROFILES
-- ============================================

INSERT INTO investors (
  id, user_id, investor_type, firm_name,
  min_check_size, max_check_size,
  target_yield_min, target_yield_max,
  preferred_duration_months, preferred_loan_types, preferred_risk_tiers,
  accreditation_status, accreditation_type, accreditation_verified_at,
  kyc_status, kyc_completed_at,
  approved, approved_at,
  total_invested, total_deals,
  created_at, updated_at
)
VALUES
(
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'individual',
  NULL,
  25000.00,
  250000.00,
  10.00,
  18.00,
  ARRAY[12, 24, 36],
  ARRAY['consumer', 'auto'],
  ARRAY['A', 'B'],
  'verified',
  'income',
  NOW() - INTERVAL '15 days',
  'passed',
  NOW() - INTERVAL '15 days',
  TRUE,
  NOW() - INTERVAL '10 days',
  75000.00,
  2,
  NOW() - INTERVAL '30 days',
  NOW()
),
(
  '40000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'family_office',
  'Walsh Family Office',
  100000.00,
  2000000.00,
  8.00,
  15.00,
  ARRAY[12, 24, 36, 48],
  ARRAY['consumer', 'auto', 'sme'],
  ARRAY['A', 'B', 'C'],
  'verified',
  'entity',
  NOW() - INTERVAL '20 days',
  'passed',
  NOW() - INTERVAL '20 days',
  TRUE,
  NOW() - INTERVAL '18 days',
  500000.00,
  5,
  NOW() - INTERVAL '45 days',
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. LOAN POOLS
-- ============================================

INSERT INTO loan_pools (
  id, lender_id, pool_name, pool_reference,
  loan_type, total_loans, total_principal, total_outstanding_balance,
  weighted_avg_apr, weighted_avg_fico, weighted_avg_dti, weighted_avg_term_months,
  weighted_avg_seasoning_months, current_delinquency_rate, historical_default_rate,
  historical_loss_rate, expected_loss, top_states,
  asking_price, asking_price_percent,
  originating_bank, bank_hold_completed, bank_hold_completed_at,
  status, submitted_at, reviewed_at, platform_risk_tier,
  created_at, updated_at
)
VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'Q4 2024 Consumer Pool - Prime',
  'QC-2024-Q4-001',
  'consumer',
  500,
  4250000.00,
  4100000.00,
  16.50,
  705,
  32.5,
  36,
  4.5,
  0.0180,
  0.0320,
  0.0210,
  0.0250,
  '{"TX": 0.35, "CA": 0.25, "FL": 0.18, "NY": 0.12, "IL": 0.10}',
  4018000.00,
  98.00,
  'Cross River Bank',
  TRUE,
  NOW() - INTERVAL '5 days',
  'approved',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '7 days',
  'A',
  NOW() - INTERVAL '15 days',
  NOW()
),
(
  '50000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  'Q4 2024 Consumer Pool - Near Prime',
  'QC-2024-Q4-002',
  'consumer',
  750,
  5625000.00,
  5400000.00,
  22.00,
  655,
  38.2,
  36,
  3.2,
  0.0350,
  0.0520,
  0.0380,
  0.0420,
  '{"TX": 0.30, "FL": 0.28, "CA": 0.20, "GA": 0.12, "AZ": 0.10}',
  5130000.00,
  95.00,
  'Cross River Bank',
  TRUE,
  NOW() - INTERVAL '3 days',
  'approved',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '5 days',
  'B',
  NOW() - INTERVAL '12 days',
  NOW()
),
(
  '50000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000002',
  'Auto Loans - Q4 2024',
  'ALP-2024-Q4-001',
  'auto',
  320,
  6400000.00,
  6100000.00,
  11.50,
  710,
  28.5,
  48,
  6.0,
  0.0120,
  0.0250,
  0.0150,
  0.0180,
  '{"CA": 0.40, "AZ": 0.20, "NV": 0.15, "OR": 0.13, "WA": 0.12}',
  5978000.00,
  98.00,
  'Celtic Bank',
  TRUE,
  NOW() - INTERVAL '4 days',
  'approved',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '4 days',
  'A',
  NOW() - INTERVAL '10 days',
  NOW()
),
(
  '50000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000001',
  'Q1 2025 Consumer Pool',
  'QC-2025-Q1-001',
  'consumer',
  0,
  0.00,
  0.00,
  0.00,
  NULL,
  NULL,
  36,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'Cross River Bank',
  FALSE,
  NULL,
  'draft',
  NULL,
  NULL,
  NULL,
  NOW() - INTERVAL '2 days',
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. DEALS (Published from approved pools)
-- ============================================

INSERT INTO deals (
  id, loan_pool_id, lender_id,
  title, description,
  total_amount, minimum_investment, target_yield, term_months, payment_frequency,
  risk_tier, loan_type, total_loans, weighted_avg_fico, expected_loss,
  amount_committed, amount_funded, investor_count,
  status, published_at, funding_deadline,
  platform_fee_percent, servicing_fee_percent,
  created_at, updated_at
)
VALUES
(
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'QuickCredit Consumer Pool - Prime Q4',
  'High-quality consumer loan pool from QuickCredit Finance. This pool consists of 500 unsecured consumer loans originated through Cross River Bank partnership. Borrowers have strong credit profiles with an average FICO of 705. Pool is well-seasoned with 4.5 months average age and low current delinquency of 1.8%.',
  4000000.00,
  25000.00,
  12.50,
  36,
  'monthly',
  'A',
  'consumer',
  500,
  705,
  0.0250,
  1250000.00,
  0.00,
  2,
  'published',
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '25 days',
  2.50,
  0.50,
  NOW() - INTERVAL '5 days',
  NOW()
),
(
  '60000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  'QuickCredit Consumer Pool - Near Prime Q4',
  'Near-prime consumer loan pool offering higher yields. 750 loans with average FICO of 655. Higher expected loss compensated by 22% APR on underlying loans. Suitable for investors seeking higher returns with moderate risk tolerance.',
  5000000.00,
  25000.00,
  16.00,
  36,
  'monthly',
  'B',
  'consumer',
  750,
  655,
  0.0420,
  750000.00,
  0.00,
  2,
  'published',
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '27 days',
  2.50,
  0.50,
  NOW() - INTERVAL '3 days',
  NOW()
),
(
  '60000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000002',
  'AutoLend Pro - Secured Auto Loans Q4',
  'Secured auto loan pool with collateral backing. 320 loans from AutoLend Pro, originated via Celtic Bank. Lower yields but strong credit quality (710 FICO) and secured by vehicle titles. Ideal for conservative investors seeking stable returns.',
  6000000.00,
  50000.00,
  9.50,
  48,
  'monthly',
  'A',
  'auto',
  320,
  710,
  0.0180,
  2500000.00,
  0.00,
  2,
  'published',
  NOW() - INTERVAL '4 days',
  NOW() + INTERVAL '26 days',
  2.00,
  0.50,
  NOW() - INTERVAL '4 days',
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. INVESTOR COMMITMENTS
-- ============================================

INSERT INTO deal_commitments (
  id, deal_id, investor_id,
  amount, commitment_date, status,
  confirmed_at, funded_at,
  principal_returned, interest_earned,
  created_at, updated_at
)
VALUES
-- Deal 1 commitments
(
  '70000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  250000.00,
  NOW() - INTERVAL '4 days',
  'confirmed',
  NOW() - INTERVAL '3 days',
  NULL,
  0.00,
  0.00,
  NOW() - INTERVAL '4 days',
  NOW()
),
(
  '70000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  1000000.00,
  NOW() - INTERVAL '3 days',
  'confirmed',
  NOW() - INTERVAL '2 days',
  NULL,
  0.00,
  0.00,
  NOW() - INTERVAL '3 days',
  NOW()
),
-- Deal 2 commitments
(
  '70000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  100000.00,
  NOW() - INTERVAL '2 days',
  'pending',
  NULL,
  NULL,
  0.00,
  0.00,
  NOW() - INTERVAL '2 days',
  NOW()
),
(
  '70000000-0000-0000-0000-000000000004',
  '60000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000002',
  650000.00,
  NOW() - INTERVAL '2 days',
  'confirmed',
  NOW() - INTERVAL '1 day',
  NULL,
  0.00,
  0.00,
  NOW() - INTERVAL '2 days',
  NOW()
),
-- Deal 3 commitments
(
  '70000000-0000-0000-0000-000000000005',
  '60000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000001',
  500000.00,
  NOW() - INTERVAL '3 days',
  'confirmed',
  NOW() - INTERVAL '2 days',
  NULL,
  0.00,
  0.00,
  NOW() - INTERVAL '3 days',
  NOW()
),
(
  '70000000-0000-0000-0000-000000000006',
  '60000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000002',
  2000000.00,
  NOW() - INTERVAL '2 days',
  'confirmed',
  NOW() - INTERVAL '1 day',
  NULL,
  0.00,
  0.00,
  NOW() - INTERVAL '2 days',
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. ACTIVITY LOG ENTRIES
-- ============================================

INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, created_at)
VALUES
('10000000-0000-0000-0000-000000000001', 'created_pool', 'loan_pool', '50000000-0000-0000-0000-000000000001', '{"pool_name": "Q4 2024 Consumer Pool - Prime"}', NOW() - INTERVAL '15 days'),
('10000000-0000-0000-0000-000000000001', 'submitted_pool', 'loan_pool', '50000000-0000-0000-0000-000000000001', '{}', NOW() - INTERVAL '10 days'),
('a0000000-0000-0000-0000-000000000001', 'approved_pool', 'loan_pool', '50000000-0000-0000-0000-000000000001', '{"risk_tier": "A"}', NOW() - INTERVAL '7 days'),
('a0000000-0000-0000-0000-000000000001', 'created_deal', 'deal', '60000000-0000-0000-0000-000000000001', '{"title": "QuickCredit Consumer Pool - Prime Q4"}', NOW() - INTERVAL '5 days'),
('20000000-0000-0000-0000-000000000001', 'committed', 'deal', '60000000-0000-0000-0000-000000000001', '{"amount": 250000}', NOW() - INTERVAL '4 days'),
('20000000-0000-0000-0000-000000000002', 'committed', 'deal', '60000000-0000-0000-0000-000000000001', '{"amount": 1000000}', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- UPDATE DEAL METRICS
-- ============================================
-- Recalculate commitment totals

UPDATE deals SET
  amount_committed = (
    SELECT COALESCE(SUM(amount), 0)
    FROM deal_commitments
    WHERE deal_id = deals.id AND status NOT IN ('withdrawn', 'returned')
  ),
  investor_count = (
    SELECT COUNT(DISTINCT investor_id)
    FROM deal_commitments
    WHERE deal_id = deals.id AND status NOT IN ('withdrawn', 'returned')
  );

-- ============================================
-- DONE
-- ============================================
-- Test accounts:
-- Admin: admin@primebridge.finance
-- Lender: demo-lender@example.com
-- Investor: demo-investor@example.com
--
-- Note: Create these users in Supabase Auth with passwords,
-- then run this seed to create their profiles.
-- ============================================
