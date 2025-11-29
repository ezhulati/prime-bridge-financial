-- ============================================
-- FIX RLS POLICIES
-- The original policies compared l.user_id (users.id) with auth.uid() (auth.users.id)
-- These are different UUIDs - need to join through users table
-- ============================================

-- Drop existing broken policies on loans table
DROP POLICY IF EXISTS "Lenders can view own pool loans" ON loans;
DROP POLICY IF EXISTS "Lenders can insert own pool loans" ON loans;
DROP POLICY IF EXISTS "Lenders can update own draft pool loans" ON loans;
DROP POLICY IF EXISTS "Lenders can delete own draft pool loans" ON loans;
DROP POLICY IF EXISTS "Admins have full access to loans" ON loans;
DROP POLICY IF EXISTS "Investors can view loans in published deals" ON loans;

-- Recreate with correct auth check (join through users table)

-- Lenders can view loans in their own pools
CREATE POLICY "Lenders can view own pool loans"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE lp.id = loans.loan_pool_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Lenders can insert loans into their own pools
CREATE POLICY "Lenders can insert own pool loans"
  ON loans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE lp.id = loan_pool_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Lenders can update loans in their own pools (only drafts)
CREATE POLICY "Lenders can update own draft pool loans"
  ON loans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loan_pools lp
      JOIN lenders l ON lp.lender_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE lp.id = loans.loan_pool_id
      AND u.auth_user_id = auth.uid()
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
      JOIN users u ON l.user_id = u.id
      WHERE lp.id = loans.loan_pool_id
      AND u.auth_user_id = auth.uid()
      AND lp.status = 'draft'
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to loans"
  ON loans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Investors can view loans in published deals
CREATE POLICY "Investors can view loans in published deals"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN investors i ON true
      JOIN users u ON i.user_id = u.id
      WHERE d.loan_pool_id = loans.loan_pool_id
      AND u.auth_user_id = auth.uid()
      AND d.status IN ('published', 'fully_committed', 'funding', 'funded', 'performing')
      AND i.approved = true
    )
  );

-- ============================================
-- Also fix loan_pools RLS policies
-- ============================================

DROP POLICY IF EXISTS "Lenders can view own pools" ON loan_pools;
DROP POLICY IF EXISTS "Lenders can insert own pools" ON loan_pools;
DROP POLICY IF EXISTS "Lenders can update own draft pools" ON loan_pools;
DROP POLICY IF EXISTS "Admins have full access to pools" ON loan_pools;

-- Lenders can view their own pools
CREATE POLICY "Lenders can view own pools"
  ON loan_pools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lenders l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = loan_pools.lender_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Lenders can insert pools
CREATE POLICY "Lenders can insert own pools"
  ON loan_pools FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lenders l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = lender_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Lenders can update their own draft pools
CREATE POLICY "Lenders can update own draft pools"
  ON loan_pools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lenders l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = loan_pools.lender_id
      AND u.auth_user_id = auth.uid()
      AND loan_pools.status = 'draft'
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to pools"
  ON loan_pools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Investors can view pools that are part of published deals
CREATE POLICY "Investors can view pools in published deals"
  ON loan_pools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN investors i ON true
      JOIN users u ON i.user_id = u.id
      WHERE d.loan_pool_id = loan_pools.id
      AND u.auth_user_id = auth.uid()
      AND d.status IN ('published', 'fully_committed', 'funding', 'funded', 'performing')
      AND i.approved = true
    )
  );
