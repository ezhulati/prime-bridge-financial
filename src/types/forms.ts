import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['borrower', 'investor'], {
    required_error: 'Select a role',
  }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

// Company schema
export const companySchema = z.object({
  legal_name: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().optional(),
  revenue: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .positive('Revenue must be positive')
    .optional(),
  ebitda: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

// Application schema
export const applicationSchema = z.object({
  amount_requested: z
    .number({ required_error: 'Enter the amount requested' })
    .min(500000, 'Minimum amount is $500,000')
    .max(10000000, 'Maximum amount is $10,000,000'),
  purpose: z.string().min(10, 'Describe the purpose of the loan (at least 10 characters)'),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

// Investor request access schema
export const investorRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firm_name: z.string().optional(),
  check_size_min: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .positive()
    .optional(),
  check_size_max: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .positive()
    .optional(),
  accredited: z.boolean().refine((val) => val === true, {
    message: 'You must confirm accredited investor status',
  }),
});

export type InvestorRequestFormData = z.infer<typeof investorRequestSchema>;

// Investor interest schema
export const investorInterestSchema = z.object({
  amount_indicated: z
    .number({ required_error: 'Enter the amount you want to invest' })
    .positive('Amount must be positive'),
});

export type InvestorInterestFormData = z.infer<typeof investorInterestSchema>;

// Admin deal schema
export const dealSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  summary: z.string().optional(),
  interest_rate: z
    .number({ invalid_type_error: 'Enter a valid interest rate' })
    .min(0)
    .max(1)
    .optional(),
  term_months: z
    .number({ invalid_type_error: 'Enter a valid term' })
    .int()
    .positive()
    .optional(),
  funding_needed: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .positive()
    .optional(),
});

export type DealFormData = z.infer<typeof dealSchema>;
