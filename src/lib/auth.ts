import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from './supabase';
import type { User, UserRole } from '../types/database';

export interface AuthUser {
  id: string;
  email: string;
  user: User | null;
}

// Get the current authenticated user and their profile
export async function getAuthUser(cookies: AstroCookies): Promise<AuthUser | null> {
  const supabase = createSupabaseServerClient(cookies);

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Get the user profile from our users table
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single();

  return {
    id: authUser.id,
    email: authUser.email!,
    user,
  };
}

// Check if user has a specific role
export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Check if investor is approved
export async function isApprovedInvestor(cookies: AstroCookies): Promise<boolean> {
  const authUser = await getAuthUser(cookies);
  if (!authUser?.user || authUser.user.role !== 'investor') {
    return false;
  }

  const supabase = createSupabaseServerClient(cookies);
  const { data: investor } = await supabase
    .from('investors')
    .select('approved')
    .eq('user_id', authUser.user.id)
    .single();

  return investor?.approved ?? false;
}

// Route protection helpers
export function getLoginRedirect(currentPath: string): string {
  return `/login?redirect=${encodeURIComponent(currentPath)}`;
}

export function getUnauthorizedRedirect(role: UserRole): string {
  switch (role) {
    case 'lender':
      return '/lender/dashboard';
    case 'investor':
      return '/investor/dashboard';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}
