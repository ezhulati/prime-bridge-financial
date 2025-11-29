-- ============================================
-- RPC FUNCTION: get_pool_loan_stats
-- Efficiently calculates pool statistics using SQL aggregates
-- Much faster than fetching all loans and calculating in JS
-- ============================================

CREATE OR REPLACE FUNCTION get_pool_loan_stats(pool_id_param UUID)
RETURNS TABLE (
  total_loans BIGINT,
  total_principal NUMERIC,
  total_outstanding_balance NUMERIC,
  weighted_avg_apr NUMERIC,
  weighted_avg_term_months NUMERIC,
  weighted_avg_fico NUMERIC,
  weighted_avg_dti NUMERIC,
  weighted_avg_seasoning_months NUMERIC,
  current_delinquency_rate NUMERIC,
  delinquent_30_count BIGINT,
  delinquent_60_count BIGINT,
  delinquent_90_count BIGINT,
  default_count BIGINT,
  current_count BIGINT,
  top_states JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_principal NUMERIC;
  v_fico_principal NUMERIC;
  v_dti_principal NUMERIC;
  v_seasoning_principal NUMERIC;
BEGIN
  -- First get total principal for weighting
  SELECT COALESCE(SUM(l.original_principal), 0)
  INTO v_total_principal
  FROM loans l
  WHERE l.loan_pool_id = pool_id_param;

  -- Get principal for loans with FICO scores
  SELECT COALESCE(SUM(l.original_principal), 0)
  INTO v_fico_principal
  FROM loans l
  WHERE l.loan_pool_id = pool_id_param
    AND l.fico_score IS NOT NULL;

  -- Get principal for loans with DTI
  SELECT COALESCE(SUM(l.original_principal), 0)
  INTO v_dti_principal
  FROM loans l
  WHERE l.loan_pool_id = pool_id_param
    AND l.dti_ratio IS NOT NULL;

  -- Get principal for loans with seasoning (origination_date)
  SELECT COALESCE(SUM(l.original_principal), 0)
  INTO v_seasoning_principal
  FROM loans l
  WHERE l.loan_pool_id = pool_id_param
    AND l.origination_date IS NOT NULL;

  RETURN QUERY
  SELECT
    -- Basic counts
    COUNT(*)::BIGINT AS total_loans,
    COALESCE(SUM(l.original_principal), 0) AS total_principal,
    COALESCE(SUM(l.current_balance), 0) AS total_outstanding_balance,

    -- Weighted average APR
    CASE
      WHEN v_total_principal > 0 THEN
        ROUND(SUM(l.interest_rate * l.original_principal) / v_total_principal, 2)
      ELSE 0
    END AS weighted_avg_apr,

    -- Weighted average term
    CASE
      WHEN v_total_principal > 0 THEN
        ROUND(SUM(l.term_months * l.original_principal) / v_total_principal, 0)
      ELSE 0
    END AS weighted_avg_term_months,

    -- Weighted average FICO (only for loans with FICO)
    CASE
      WHEN v_fico_principal > 0 THEN
        ROUND(SUM(CASE WHEN l.fico_score IS NOT NULL THEN l.fico_score * l.original_principal ELSE 0 END) / v_fico_principal, 0)
      ELSE NULL
    END AS weighted_avg_fico,

    -- Weighted average DTI (only for loans with DTI)
    CASE
      WHEN v_dti_principal > 0 THEN
        ROUND(SUM(CASE WHEN l.dti_ratio IS NOT NULL THEN l.dti_ratio * l.original_principal ELSE 0 END) / v_dti_principal, 2)
      ELSE NULL
    END AS weighted_avg_dti,

    -- Weighted average seasoning (months since origination)
    CASE
      WHEN v_seasoning_principal > 0 THEN
        ROUND(
          SUM(
            CASE WHEN l.origination_date IS NOT NULL
            THEN EXTRACT(EPOCH FROM (NOW() - l.origination_date::timestamp)) / 2592000 * l.original_principal
            ELSE 0 END
          ) / v_seasoning_principal, 1
        )
      ELSE NULL
    END AS weighted_avg_seasoning_months,

    -- Delinquency rate (30+ days / total)
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          COUNT(*) FILTER (WHERE l.status IN ('delinquent_30', 'delinquent_60', 'delinquent_90', 'default'))::NUMERIC
          / COUNT(*)::NUMERIC, 4
        )
      ELSE 0
    END AS current_delinquency_rate,

    -- Status breakdown
    COUNT(*) FILTER (WHERE l.status = 'delinquent_30')::BIGINT AS delinquent_30_count,
    COUNT(*) FILTER (WHERE l.status = 'delinquent_60')::BIGINT AS delinquent_60_count,
    COUNT(*) FILTER (WHERE l.status = 'delinquent_90')::BIGINT AS delinquent_90_count,
    COUNT(*) FILTER (WHERE l.status = 'default')::BIGINT AS default_count,
    COUNT(*) FILTER (WHERE l.status = 'current')::BIGINT AS current_count,

    -- Top 5 states as JSONB
    (
      SELECT COALESCE(
        jsonb_object_agg(state_data.borrower_state, state_data.pct),
        '{}'::jsonb
      )
      FROM (
        SELECT
          l2.borrower_state,
          ROUND(COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM loans WHERE loan_pool_id = pool_id_param), 0), 4) AS pct
        FROM loans l2
        WHERE l2.loan_pool_id = pool_id_param
          AND l2.borrower_state IS NOT NULL
        GROUP BY l2.borrower_state
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) state_data
    ) AS top_states

  FROM loans l
  WHERE l.loan_pool_id = pool_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pool_loan_stats(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_pool_loan_stats IS 'Calculates aggregate statistics for a loan pool efficiently using SQL. Returns weighted averages, delinquency rates, and geographic distribution.';
