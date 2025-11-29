/**
 * PrimeBridge Finance - Model 1: Fintech Lender Marketplace
 * Database Types
 * "AngelList for Private Credit"
 */

// ============================================
// ENUMS
// ============================================

export type UserRole = 'admin' | 'lender' | 'investor';

export type LenderStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';

export type RiskTier = 'A' | 'B' | 'C' | 'D' | 'unrated';

export type InvestorType = 'individual' | 'family_office' | 'fund' | 'institutional' | 'ria';

export type AccreditationStatus = 'pending' | 'verified' | 'expired' | 'rejected';

export type KycStatus = 'pending' | 'passed' | 'failed' | 'review';

export type LoanType = 'consumer' | 'auto' | 'bnpl' | 'medical' | 'sme';

export type LoanPoolStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted';

export type DealStatus = 'draft' | 'published' | 'fully_committed' | 'funding' | 'funded' | 'performing' | 'completed' | 'defaulted';

export type CommitmentStatus = 'pending' | 'confirmed' | 'funded' | 'withdrawn' | 'returned';

export type DocumentType =
  | 'loan_tape'
  | 'performance_history'
  | 'static_pool_analysis'
  | 'servicing_agreement'
  | 'purchase_agreement'
  | 'bank_certification'
  | 'compliance_docs'
  | 'other';

export type LoanStatus = 'current' | 'delinquent_30' | 'delinquent_60' | 'delinquent_90' | 'default' | 'charged_off' | 'paid_off';

// ============================================
// USER
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ============================================
// LENDER (Fintech Company)
// ============================================

export interface Lender {
  id: string;
  user_id: string;

  // Company Information
  company_name: string;
  legal_entity_name: string | null;
  ein: string | null;
  website: string | null;

  // Contact
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string | null;

  // Business Details
  year_founded: number | null;
  headquarters_state: string | null;
  lending_licenses: string[] | null;

  // Loan Profile
  loan_types: LoanType[];
  avg_loan_size: number | null;
  monthly_origination_volume: number | null;
  total_loans_originated: number | null;
  weighted_avg_apr: number | null;
  avg_loan_term_months: number | null;

  // Performance Metrics
  historical_default_rate: number | null;
  historical_loss_rate: number | null;
  avg_fico_score: number | null;

  // Bank Partnership
  bank_partner_name: string | null;
  bank_partner_state: string | null;

  // Platform Status
  status: LenderStatus;
  approved_at: string | null;
  approved_by: string | null;

  // Admin
  admin_notes: string | null;
  risk_tier: RiskTier | null;

  created_at: string;
  updated_at: string;
}

// ============================================
// INVESTOR
// ============================================

export interface Investor {
  id: string;
  user_id: string;

  // Profile
  investor_type: InvestorType;
  firm_name: string | null;

  // Investment Criteria
  min_check_size: number | null;
  max_check_size: number | null;
  target_yield_min: number | null;
  target_yield_max: number | null;
  preferred_duration_months: number[] | null;
  preferred_loan_types: LoanType[] | null;
  preferred_risk_tiers: RiskTier[] | null;

  // Accreditation
  accreditation_status: AccreditationStatus;
  accreditation_type: string | null;
  accreditation_verified_at: string | null;
  accreditation_expires_at: string | null;
  accreditation_document_url: string | null;

  // KYC/AML
  kyc_status: KycStatus | null;
  kyc_completed_at: string | null;

  // Platform Status
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;

  // Investment Tracking
  total_invested: number;
  total_deals: number;

  admin_notes: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================
// LOAN POOL
// ============================================

export interface LoanPool {
  id: string;
  lender_id: string;

  // Pool Identification
  pool_name: string;
  pool_reference: string | null;

  // Pool Composition
  loan_type: LoanType;
  total_loans: number;
  total_principal: number;
  total_outstanding_balance: number;

  // Weighted Averages
  weighted_avg_apr: number;
  weighted_avg_fico: number | null;
  weighted_avg_dti: number | null;
  weighted_avg_term_months: number;
  weighted_avg_seasoning_months: number | null;

  // Risk Metrics
  current_delinquency_rate: number | null;
  historical_default_rate: number | null;
  historical_loss_rate: number | null;
  expected_loss: number | null;

  // Geographic Distribution
  top_states: Record<string, number> | null;

  // Pricing
  asking_price: number | null;
  asking_price_percent: number | null;

  // Bank Partnership Info
  originating_bank: string | null;
  bank_hold_completed: boolean;
  bank_hold_completed_at: string | null;

  // Workflow Status
  status: LoanPoolStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;

  // Admin Assessment
  admin_notes: string | null;
  risk_assessment: string | null;
  suggested_yield: number | null;
  platform_risk_tier: RiskTier | null;

  created_at: string;
  updated_at: string;

  // Relations (when joined)
  lender?: Lender;
  documents?: LoanPoolDocument[];
}

// ============================================
// LOAN POOL DOCUMENT
// ============================================

export interface LoanPoolDocument {
  id: string;
  loan_pool_id: string;

  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;

  description: string | null;

  uploaded_by: string;
  uploaded_at: string;
}

// ============================================
// LOAN (Individual loan from loan tape)
// ============================================

export interface Loan {
  id: string;
  loan_pool_id: string;

  // Loan Identification
  loan_reference: string;

  // Borrower Info (anonymized)
  borrower_state: string | null;
  borrower_zip: string | null;

  // Loan Terms
  original_principal: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  origination_date: string;
  maturity_date: string | null;

  // Credit Profile
  fico_score: number | null;
  dti_ratio: number | null;

  // Payment Info
  monthly_payment: number | null;
  payments_made: number;
  payments_remaining: number | null;

  // Status
  status: LoanStatus;
  days_delinquent: number;

  created_at: string;
  updated_at: string;
}

// ============================================
// DEAL
// ============================================

export interface Deal {
  id: string;
  loan_pool_id: string;
  lender_id: string;

  // Deal Terms
  title: string;
  description: string | null;

  // Offering Details
  total_amount: number;
  minimum_investment: number;
  target_yield: number;
  term_months: number;
  payment_frequency: 'monthly' | 'quarterly';

  // Risk Classification
  risk_tier: RiskTier;

  // Underlying Pool Summary
  loan_type: LoanType;
  total_loans: number;
  weighted_avg_fico: number | null;
  expected_loss: number | null;

  // Funding Status
  amount_committed: number;
  amount_funded: number;
  investor_count: number;

  // Deal Lifecycle
  status: DealStatus;
  published_at: string | null;
  funding_deadline: string | null;
  funded_at: string | null;

  // Documents
  credit_memo_url: string | null;
  term_sheet_url: string | null;

  // Platform Fees
  platform_fee_percent: number;
  servicing_fee_percent: number;

  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Relations (when joined)
  lender?: Lender;
  loan_pool?: LoanPool;
  commitments?: DealCommitment[];
}

// ============================================
// DEAL COMMITMENT
// ============================================

export interface DealCommitment {
  id: string;
  deal_id: string;
  investor_id: string;

  // Commitment Details
  amount: number;
  commitment_date: string;

  // Status
  status: CommitmentStatus;
  confirmed_at: string | null;
  funded_at: string | null;

  // Returns Tracking
  principal_returned: number;
  interest_earned: number;

  notes: string | null;

  created_at: string;
  updated_at: string;

  // Relations (when joined)
  deal?: Deal;
  investor?: Investor;
}

// ============================================
// ACTIVITY LOG
// ============================================

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: 'lender' | 'investor' | 'loan_pool' | 'deal' | 'commitment';
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ============================================
// STATUS LABELS & DISPLAY HELPERS
// ============================================

export const lenderStatusLabels: Record<LenderStatus, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export const loanPoolStatusLabels: Record<LoanPoolStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  converted: 'Converted to Deal',
};

export const dealStatusLabels: Record<DealStatus, string> = {
  draft: 'Draft',
  published: 'Open for Investment',
  fully_committed: 'Fully Committed',
  funding: 'Funding in Progress',
  funded: 'Funded',
  performing: 'Performing',
  completed: 'Completed',
  defaulted: 'Defaulted',
};

export const commitmentStatusLabels: Record<CommitmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  funded: 'Funded',
  withdrawn: 'Withdrawn',
  returned: 'Returned',
};

export const riskTierLabels: Record<RiskTier, string> = {
  A: 'A - Prime',
  B: 'B - Near Prime',
  C: 'C - Subprime',
  D: 'D - Deep Subprime',
  unrated: 'Unrated',
};

export const loanTypeLabels: Record<LoanType, string> = {
  consumer: 'Consumer Loans',
  auto: 'Auto Loans',
  bnpl: 'Buy Now Pay Later',
  medical: 'Medical Financing',
  sme: 'SME/Business Loans',
};

export const investorTypeLabels: Record<InvestorType, string> = {
  individual: 'Individual Investor',
  family_office: 'Family Office',
  fund: 'Investment Fund',
  institutional: 'Institutional',
  ria: 'Registered Investment Adviser',
};

export const documentTypeLabels: Record<DocumentType, string> = {
  loan_tape: 'Loan Tape',
  performance_history: 'Performance History',
  static_pool_analysis: 'Static Pool Analysis',
  servicing_agreement: 'Servicing Agreement',
  purchase_agreement: 'Purchase Agreement',
  bank_certification: 'Bank Certification',
  compliance_docs: 'Compliance Documents',
  other: 'Other',
};

export const loanStatusLabels: Record<LoanStatus, string> = {
  current: 'Current',
  delinquent_30: '30+ Days Delinquent',
  delinquent_60: '60+ Days Delinquent',
  delinquent_90: '90+ Days Delinquent',
  default: 'Default',
  charged_off: 'Charged Off',
  paid_off: 'Paid Off',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatYield(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getRiskTierColor(tier: RiskTier): string {
  const colors: Record<RiskTier, string> = {
    A: 'text-green-700 bg-green-100',
    B: 'text-blue-700 bg-blue-100',
    C: 'text-amber-700 bg-amber-100',
    D: 'text-red-700 bg-red-100',
    unrated: 'text-gray-700 bg-gray-100',
  };
  return colors[tier];
}
