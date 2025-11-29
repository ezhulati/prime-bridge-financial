export type UserRole = 'borrower' | 'investor' | 'admin';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'term_sheet'
  | 'in_funding'
  | 'funded'
  | 'rejected';

export type InvestorInterestStatus = 'interested' | 'committed' | 'withdrawn';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          role: UserRole;
          name: string | null;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          role: UserRole;
          name?: string | null;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          role?: UserRole;
          name?: string | null;
          email?: string;
          created_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          owner_user_id: string;
          legal_name: string;
          industry: string | null;
          revenue: number | null;
          ebitda: number | null;
          address: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          legal_name: string;
          industry?: string | null;
          revenue?: number | null;
          ebitda?: number | null;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          legal_name?: string;
          industry?: string | null;
          revenue?: number | null;
          ebitda?: number | null;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          company_id: string;
          amount_requested: number;
          purpose: string | null;
          status: ApplicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          amount_requested: number;
          purpose?: string | null;
          status?: ApplicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          amount_requested?: number;
          purpose?: string | null;
          status?: ApplicationStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          application_id: string;
          type: string;
          file_url: string;
          file_name: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          type: string;
          file_url: string;
          file_name?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          type?: string;
          file_url?: string;
          file_name?: string | null;
          uploaded_at?: string;
        };
      };
      investors: {
        Row: {
          id: string;
          user_id: string;
          firm_name: string | null;
          check_size_min: number | null;
          check_size_max: number | null;
          accredited: boolean;
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          firm_name?: string | null;
          check_size_min?: number | null;
          check_size_max?: number | null;
          accredited?: boolean;
          approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          firm_name?: string | null;
          check_size_min?: number | null;
          check_size_max?: number | null;
          accredited?: boolean;
          approved?: boolean;
          created_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          application_id: string;
          title: string;
          summary: string | null;
          interest_rate: number | null;
          term_months: number | null;
          funding_needed: number | null;
          memo_url: string | null;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          title: string;
          summary?: string | null;
          interest_rate?: number | null;
          term_months?: number | null;
          funding_needed?: number | null;
          memo_url?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          title?: string;
          summary?: string | null;
          interest_rate?: number | null;
          term_months?: number | null;
          funding_needed?: number | null;
          memo_url?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      investor_interest: {
        Row: {
          id: string;
          investor_id: string;
          deal_id: string;
          amount_indicated: number;
          status: InvestorInterestStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          investor_id: string;
          deal_id: string;
          amount_indicated: number;
          status?: InvestorInterestStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          investor_id?: string;
          deal_id?: string;
          amount_indicated?: number;
          status?: InvestorInterestStatus;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type Application = Database['public']['Tables']['applications']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Investor = Database['public']['Tables']['investors']['Row'];
export type Deal = Database['public']['Tables']['deals']['Row'];
export type InvestorInterest = Database['public']['Tables']['investor_interest']['Row'];
