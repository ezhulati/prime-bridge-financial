#!/usr/bin/env node
/**
 * Seed script for PrimeBridge Finance
 * Inserts test data using Supabase client with service role key
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// Valid UUIDs for test data
const IDS = {
  // Users
  admin: 'a0000000-0000-0000-0000-000000000001',
  lender1: '10000000-0000-0000-0000-000000000001',
  lender2: '10000000-0000-0000-0000-000000000002',
  investor1: '20000000-0000-0000-0000-000000000001',
  investor2: '20000000-0000-0000-0000-000000000002',
  // Lender profiles
  lenderProfile1: '30000000-0000-0000-0000-000000000001',
  lenderProfile2: '30000000-0000-0000-0000-000000000002',
  // Investor profiles
  investorProfile1: '40000000-0000-0000-0000-000000000001',
  investorProfile2: '40000000-0000-0000-0000-000000000002',
  // Loan pools
  pool1: '50000000-0000-0000-0000-000000000001',
  pool2: '50000000-0000-0000-0000-000000000002',
  pool3: '50000000-0000-0000-0000-000000000003',
  pool4: '50000000-0000-0000-0000-000000000004',
  // Deals
  deal1: '60000000-0000-0000-0000-000000000001',
  deal2: '60000000-0000-0000-0000-000000000002',
  deal3: '60000000-0000-0000-0000-000000000003',
  // Commitments
  commit1: '70000000-0000-0000-0000-000000000001',
  commit2: '70000000-0000-0000-0000-000000000002',
  commit3: '70000000-0000-0000-0000-000000000003',
  commit4: '70000000-0000-0000-0000-000000000004',
  commit5: '70000000-0000-0000-0000-000000000005',
  commit6: '70000000-0000-0000-0000-000000000006',
  commit7: '70000000-0000-0000-0000-000000000007',
  commit8: '70000000-0000-0000-0000-000000000008',
};

async function seed() {
  console.log('🌱 Starting seed process...\n');

  // 1. Insert Users
  console.log('📋 Inserting users...');
  const { error: usersError } = await supabase.from('users').upsert([
    {
      id: IDS.admin,
      email: 'admin@primebridge.finance',
      name: 'Platform Admin',
      role: 'admin'
    },
    {
      id: IDS.lender1,
      email: 'demo-lender@example.com',
      name: 'Alex Thompson',
      role: 'lender'
    },
    {
      id: IDS.lender2,
      email: 'lending@quickcredit.io',
      name: 'Sarah Chen',
      role: 'lender'
    },
    {
      id: IDS.investor1,
      email: 'demo-investor@example.com',
      name: 'Michael Roberts',
      role: 'investor'
    },
    {
      id: IDS.investor2,
      email: 'investments@familyoffice.com',
      name: 'Jennifer Walsh',
      role: 'investor'
    }
  ], { onConflict: 'email' });

  if (usersError) {
    console.error('  ❌ Users error:', usersError.message);
  } else {
    console.log('  ✓ Users inserted');
  }

  // 2. Insert Lenders
  console.log('📋 Inserting lenders...');
  const { error: lendersError } = await supabase.from('lenders').upsert([
    {
      id: IDS.lenderProfile1,
      user_id: IDS.lender1,
      company_name: 'QuickCredit Finance',
      legal_entity_name: 'QuickCredit Finance, LLC',
      ein: '12-3456789',
      website: 'https://quickcredit.example.com',
      primary_contact_name: 'Alex Thompson',
      primary_contact_email: 'demo-lender@example.com',
      primary_contact_phone: '(555) 123-4567',
      year_founded: 2019,
      headquarters_state: 'TX',
      lending_licenses: ['TX', 'CA', 'FL', 'NY', 'IL'],
      loan_types: ['consumer'],
      avg_loan_size: 8500.00,
      monthly_origination_volume: 12000000.00,
      total_loans_originated: 45000,
      weighted_avg_apr: 18.50,
      avg_loan_term_months: 36,
      historical_default_rate: 0.0425,
      historical_loss_rate: 0.0285,
      avg_fico_score: 680,
      bank_partner_name: 'Cross River Bank',
      bank_partner_state: 'NJ',
      status: 'approved',
      approved_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      risk_tier: 'B'
    },
    {
      id: IDS.lenderProfile2,
      user_id: IDS.lender2,
      company_name: 'AutoLend Pro',
      legal_entity_name: 'AutoLend Pro Inc.',
      ein: '98-7654321',
      website: 'https://autolendpro.example.com',
      primary_contact_name: 'Sarah Chen',
      primary_contact_email: 'lending@quickcredit.io',
      primary_contact_phone: '(555) 987-6543',
      year_founded: 2017,
      headquarters_state: 'CA',
      lending_licenses: ['CA', 'AZ', 'NV', 'OR', 'WA'],
      loan_types: ['auto'],
      avg_loan_size: 15000.00,
      monthly_origination_volume: 25000000.00,
      total_loans_originated: 82000,
      weighted_avg_apr: 12.75,
      avg_loan_term_months: 48,
      historical_default_rate: 0.0320,
      historical_loss_rate: 0.0180,
      avg_fico_score: 695,
      bank_partner_name: 'Celtic Bank',
      bank_partner_state: 'UT',
      status: 'approved',
      approved_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      risk_tier: 'A'
    }
  ], { onConflict: 'id' });

  if (lendersError) {
    console.error('  ❌ Lenders error:', lendersError.message);
  } else {
    console.log('  ✓ Lenders inserted');
  }

  // 3. Insert Investors
  console.log('📋 Inserting investors...');
  const { error: investorsError } = await supabase.from('investors').upsert([
    {
      id: IDS.investorProfile1,
      user_id: IDS.investor1,
      investor_type: 'individual',
      firm_name: null,
      min_check_size: 25000.00,
      max_check_size: 250000.00,
      target_yield_min: 10.00,
      target_yield_max: 18.00,
      preferred_duration_months: [12, 24, 36],
      preferred_loan_types: ['consumer', 'auto'],
      preferred_risk_tiers: ['A', 'B'],
      accreditation_status: 'verified',
      accreditation_type: 'income',
      accreditation_verified_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      kyc_status: 'passed',
      kyc_completed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      approved: true,
      approved_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      total_invested: 75000.00,
      total_deals: 2
    },
    {
      id: IDS.investorProfile2,
      user_id: IDS.investor2,
      investor_type: 'family_office',
      firm_name: 'Walsh Family Office',
      min_check_size: 100000.00,
      max_check_size: 2000000.00,
      target_yield_min: 8.00,
      target_yield_max: 15.00,
      preferred_duration_months: [12, 24, 36, 48],
      preferred_loan_types: ['consumer', 'auto', 'sme'],
      preferred_risk_tiers: ['A', 'B', 'C'],
      accreditation_status: 'verified',
      accreditation_type: 'entity',
      accreditation_verified_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      kyc_status: 'passed',
      kyc_completed_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      approved: true,
      approved_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      total_invested: 500000.00,
      total_deals: 5
    }
  ], { onConflict: 'id' });

  if (investorsError) {
    console.error('  ❌ Investors error:', investorsError.message);
  } else {
    console.log('  ✓ Investors inserted');
  }

  // 4. Insert Loan Pools
  console.log('📋 Inserting loan pools...');
  const { error: poolsError } = await supabase.from('loan_pools').upsert([
    {
      id: IDS.pool1,
      lender_id: IDS.lenderProfile1,
      pool_name: 'Q4 2024 Consumer Pool - Prime',
      pool_reference: 'QC-2024-Q4-001',
      loan_type: 'consumer',
      total_loans: 500,
      total_principal: 4250000.00,
      total_outstanding_balance: 4100000.00,
      weighted_avg_apr: 16.50,
      weighted_avg_fico: 705,
      weighted_avg_dti: 32.5,
      weighted_avg_term_months: 36,
      weighted_avg_seasoning_months: 4.5,
      current_delinquency_rate: 0.0180,
      historical_default_rate: 0.0320,
      historical_loss_rate: 0.0210,
      expected_loss: 0.0250,
      top_states: { TX: 0.35, CA: 0.25, FL: 0.18, NY: 0.12, IL: 0.10 },
      asking_price: 4018000.00,
      asking_price_percent: 98.00,
      originating_bank: 'Cross River Bank',
      bank_hold_completed: true,
      bank_hold_completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      submitted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      reviewed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      platform_risk_tier: 'A'
    },
    {
      id: IDS.pool2,
      lender_id: IDS.lenderProfile1,
      pool_name: 'Q4 2024 Consumer Pool - Near Prime',
      pool_reference: 'QC-2024-Q4-002',
      loan_type: 'consumer',
      total_loans: 750,
      total_principal: 5625000.00,
      total_outstanding_balance: 5400000.00,
      weighted_avg_apr: 22.00,
      weighted_avg_fico: 655,
      weighted_avg_dti: 38.2,
      weighted_avg_term_months: 36,
      weighted_avg_seasoning_months: 3.2,
      current_delinquency_rate: 0.0350,
      historical_default_rate: 0.0520,
      historical_loss_rate: 0.0380,
      expected_loss: 0.0420,
      top_states: { TX: 0.30, FL: 0.28, CA: 0.20, GA: 0.12, AZ: 0.10 },
      asking_price: 5130000.00,
      asking_price_percent: 95.00,
      originating_bank: 'Cross River Bank',
      bank_hold_completed: true,
      bank_hold_completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      submitted_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      reviewed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      platform_risk_tier: 'B'
    },
    {
      id: IDS.pool3,
      lender_id: IDS.lenderProfile2,
      pool_name: 'Auto Loans - Q4 2024',
      pool_reference: 'ALP-2024-Q4-001',
      loan_type: 'auto',
      total_loans: 320,
      total_principal: 6400000.00,
      total_outstanding_balance: 6100000.00,
      weighted_avg_apr: 11.50,
      weighted_avg_fico: 710,
      weighted_avg_dti: 28.5,
      weighted_avg_term_months: 48,
      weighted_avg_seasoning_months: 6.0,
      current_delinquency_rate: 0.0120,
      historical_default_rate: 0.0250,
      historical_loss_rate: 0.0150,
      expected_loss: 0.0180,
      top_states: { CA: 0.40, AZ: 0.20, NV: 0.15, OR: 0.13, WA: 0.12 },
      asking_price: 5978000.00,
      asking_price_percent: 98.00,
      originating_bank: 'Celtic Bank',
      bank_hold_completed: true,
      bank_hold_completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      submitted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      reviewed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      platform_risk_tier: 'A'
    },
    {
      id: IDS.pool4,
      lender_id: IDS.lenderProfile1,
      pool_name: 'Q1 2025 Consumer Pool',
      pool_reference: 'QC-2025-Q1-001',
      loan_type: 'consumer',
      total_loans: 0,
      total_principal: 0,
      total_outstanding_balance: 0,
      weighted_avg_apr: 0,
      weighted_avg_term_months: 36,
      originating_bank: 'Cross River Bank',
      bank_hold_completed: false,
      status: 'draft'
    }
  ], { onConflict: 'id' });

  if (poolsError) {
    console.error('  ❌ Loan pools error:', poolsError.message);
  } else {
    console.log('  ✓ Loan pools inserted');
  }

  // 5. Insert Deals
  console.log('📋 Inserting deals...');
  const { error: dealsError } = await supabase.from('deals').upsert([
    {
      id: IDS.deal1,
      loan_pool_id: IDS.pool1,
      lender_id: IDS.lenderProfile1,
      title: 'QuickCredit Consumer Pool - Prime Q4',
      description: 'High-quality consumer loan pool from QuickCredit Finance. This pool consists of 500 unsecured consumer loans originated through Cross River Bank partnership. Borrowers have strong credit profiles with an average FICO of 705. Pool is well-seasoned with 4.5 months average age and low current delinquency of 1.8%.',
      total_amount: 4000000.00,
      minimum_investment: 25000.00,
      target_yield: 12.50,
      term_months: 36,
      payment_frequency: 'monthly',
      risk_tier: 'A',
      loan_type: 'consumer',
      total_loans: 500,
      weighted_avg_fico: 705,
      expected_loss: 0.0250,
      amount_committed: 1250000.00,
      amount_funded: 0,
      investor_count: 3,
      status: 'published',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      funding_deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      platform_fee_percent: 2.50,
      servicing_fee_percent: 0.50
    },
    {
      id: IDS.deal2,
      loan_pool_id: IDS.pool2,
      lender_id: IDS.lenderProfile1,
      title: 'QuickCredit Consumer Pool - Near Prime Q4',
      description: 'Near-prime consumer loan pool offering higher yields. 750 loans with average FICO of 655. Higher expected loss compensated by 22% APR on underlying loans. Suitable for investors seeking higher returns with moderate risk tolerance.',
      total_amount: 5000000.00,
      minimum_investment: 25000.00,
      target_yield: 16.00,
      term_months: 36,
      payment_frequency: 'monthly',
      risk_tier: 'B',
      loan_type: 'consumer',
      total_loans: 750,
      weighted_avg_fico: 655,
      expected_loss: 0.0420,
      amount_committed: 750000.00,
      amount_funded: 0,
      investor_count: 2,
      status: 'published',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      funding_deadline: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
      platform_fee_percent: 2.50,
      servicing_fee_percent: 0.50
    },
    {
      id: IDS.deal3,
      loan_pool_id: IDS.pool3,
      lender_id: IDS.lenderProfile2,
      title: 'AutoLend Pro - Secured Auto Loans Q4',
      description: 'Secured auto loan pool with collateral backing. 320 loans from AutoLend Pro, originated via Celtic Bank. Lower yields but strong credit quality (710 FICO) and secured by vehicle titles. Ideal for conservative investors seeking stable returns.',
      total_amount: 6000000.00,
      minimum_investment: 50000.00,
      target_yield: 9.50,
      term_months: 48,
      payment_frequency: 'monthly',
      risk_tier: 'A',
      loan_type: 'auto',
      total_loans: 320,
      weighted_avg_fico: 710,
      expected_loss: 0.0180,
      amount_committed: 2500000.00,
      amount_funded: 0,
      investor_count: 4,
      status: 'published',
      published_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      funding_deadline: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000).toISOString(),
      platform_fee_percent: 2.00,
      servicing_fee_percent: 0.50
    }
  ], { onConflict: 'id' });

  if (dealsError) {
    console.error('  ❌ Deals error:', dealsError.message);
  } else {
    console.log('  ✓ Deals inserted');
  }

  // 6. Insert Commitments (one per investor per deal - unique constraint)
  console.log('📋 Inserting deal commitments...');
  const { error: commitmentsError } = await supabase.from('deal_commitments').upsert([
    // Deal 1: investor1 and investor2
    {
      id: IDS.commit1,
      deal_id: IDS.deal1,
      investor_id: IDS.investorProfile1,
      amount: 250000.00,
      commitment_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      confirmed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      principal_returned: 0,
      interest_earned: 0
    },
    {
      id: IDS.commit2,
      deal_id: IDS.deal1,
      investor_id: IDS.investorProfile2,
      amount: 1000000.00,
      commitment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      confirmed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      principal_returned: 0,
      interest_earned: 0
    },
    // Deal 2: investor1 and investor2
    {
      id: IDS.commit3,
      deal_id: IDS.deal2,
      investor_id: IDS.investorProfile1,
      amount: 100000.00,
      commitment_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      principal_returned: 0,
      interest_earned: 0
    },
    {
      id: IDS.commit4,
      deal_id: IDS.deal2,
      investor_id: IDS.investorProfile2,
      amount: 650000.00,
      commitment_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      confirmed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      principal_returned: 0,
      interest_earned: 0
    },
    // Deal 3: investor1 and investor2
    {
      id: IDS.commit5,
      deal_id: IDS.deal3,
      investor_id: IDS.investorProfile1,
      amount: 500000.00,
      commitment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      confirmed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      principal_returned: 0,
      interest_earned: 0
    },
    {
      id: IDS.commit6,
      deal_id: IDS.deal3,
      investor_id: IDS.investorProfile2,
      amount: 2000000.00,
      commitment_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      confirmed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      principal_returned: 0,
      interest_earned: 0
    }
  ], { onConflict: 'id' });

  if (commitmentsError) {
    console.error('  ❌ Commitments error:', commitmentsError.message);
  } else {
    console.log('  ✓ Deal commitments inserted');
  }

  // 7. Insert Activity Log
  console.log('📋 Inserting activity log...');
  const { error: activityError } = await supabase.from('activity_log').insert([
    {
      user_id: IDS.lender1,
      action: 'created_pool',
      entity_type: 'loan_pool',
      entity_id: IDS.pool1,
      details: { pool_name: 'Q4 2024 Consumer Pool - Prime' },
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: IDS.lender1,
      action: 'submitted_pool',
      entity_type: 'loan_pool',
      entity_id: IDS.pool1,
      details: {},
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: IDS.admin,
      action: 'approved_pool',
      entity_type: 'loan_pool',
      entity_id: IDS.pool1,
      details: { risk_tier: 'A' },
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: IDS.admin,
      action: 'created_deal',
      entity_type: 'deal',
      entity_id: IDS.deal1,
      details: { title: 'QuickCredit Consumer Pool - Prime Q4' },
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: IDS.investor1,
      action: 'committed',
      entity_type: 'deal',
      entity_id: IDS.deal1,
      details: { amount: 50000 },
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: IDS.investor2,
      action: 'committed',
      entity_type: 'deal',
      entity_id: IDS.deal1,
      details: { amount: 500000 },
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);

  if (activityError) {
    console.error('  ❌ Activity log error:', activityError.message);
  } else {
    console.log('  ✓ Activity log inserted');
  }

  console.log('\n✅ Seed process complete!');
  console.log('\n📝 Test accounts:');
  console.log('   Admin: admin@primebridge.finance');
  console.log('   Lender: demo-lender@example.com');
  console.log('   Investor: demo-investor@example.com');
  console.log('\n   Note: Create these users in Supabase Auth with passwords first.');
}

seed().catch(console.error);
