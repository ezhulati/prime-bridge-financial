import { defineMiddleware } from 'astro:middleware';
import { getAuthUser, hasRole, getLoginRedirect, getUnauthorizedRedirect } from './lib/auth';
import { createSupabaseServerClient } from './lib/supabase';

// Define protected routes and their required roles
const protectedRoutes: { pattern: RegExp; roles: string[]; requireApproved?: boolean }[] = [
  // Lender routes (require approved status for pool submission)
  { pattern: /^\/lender/, roles: ['lender', 'admin'] },

  // Investor routes (require approved status)
  { pattern: /^\/investor/, roles: ['investor', 'admin'], requireApproved: true },

  // Admin routes
  { pattern: /^\/admin/, roles: ['admin'] },
];

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/lenders',      // Public lender landing page
  '/investors',    // Public investor landing page
  '/lender/register',
  '/investor/register',
  '/about',
  '/contact',
  '/platform',
  '/invest',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    // For API routes, just continue
    if (pathname.startsWith('/api/')) {
      return next();
    }

    // For page routes, check if user is already logged in and redirect appropriately
    const authUser = await getAuthUser(context.cookies);
    if (authUser?.user && (pathname === '/login' || pathname === '/signup')) {
      const redirectUrl = getUnauthorizedRedirect(authUser.user.role);
      return context.redirect(redirectUrl);
    }

    return next();
  }

  // Check if route requires protection
  const matchedRoute = protectedRoutes.find(route => route.pattern.test(pathname));

  if (!matchedRoute) {
    // Route not explicitly protected, allow access
    return next();
  }

  // Get authenticated user
  const authUser = await getAuthUser(context.cookies);

  // Not authenticated - redirect to login
  if (!authUser) {
    return context.redirect(getLoginRedirect(pathname));
  }

  // No user profile found - something went wrong during signup
  if (!authUser.user) {
    return context.redirect('/login?error=profile_not_found');
  }

  // Check role authorization
  if (!hasRole(authUser.user, ...matchedRoute.roles as any)) {
    // User doesn't have required role - redirect to their dashboard
    return context.redirect(getUnauthorizedRedirect(authUser.user.role));
  }

  // Check if investor approval is required
  if (matchedRoute.requireApproved && authUser.user.role === 'investor') {
    const supabase = createSupabaseServerClient(context.cookies);
    const { data: investor } = await supabase
      .from('investors')
      .select('approved')
      .eq('user_id', authUser.user.id)
      .single();

    if (!investor?.approved) {
      // Investor not approved yet - redirect to pending page
      return context.redirect('/investor/pending');
    }
  }

  // Add user to locals for use in pages
  context.locals.user = authUser.user;
  context.locals.authUser = authUser;

  return next();
});
