import type { APIRoute } from 'astro';

const SITE_URL = 'https://primebridge.finance';

export const GET: APIRoute = async () => {
  const robotsTxt = `# PrimeBridge Finance - robots.txt

User-agent: *

# Allow public marketing pages
Allow: /
Allow: /about
Allow: /platform
Allow: /lenders
Allow: /investors
Allow: /invest
Allow: /contact
Allow: /privacy
Allow: /terms

# Block authentication pages
Disallow: /login
Disallow: /signup

# Block all app/dashboard pages
Disallow: /admin
Disallow: /admin/*
Disallow: /lender
Disallow: /lender/*
Disallow: /investor
Disallow: /investor/*
Disallow: /dashboard
Disallow: /dashboard/*

# Block API routes
Disallow: /api
Disallow: /api/*

# Sitemap location
Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(robotsTxt.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  });
};
