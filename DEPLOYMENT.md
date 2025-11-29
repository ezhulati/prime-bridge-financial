# PrimeBridge Finance - Deployment Checklist

## Pre-Deployment

### 1. Environment Variables
Ensure these are set in your deployment platform:

```bash
# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL
PUBLIC_SITE_URL=https://primebridge.finance

# Optional: Analytics
# PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### 2. Database Setup

#### Run Migrations
```bash
# Option 1: Supabase CLI
supabase db push

# Option 2: Manual - Run in Supabase SQL Editor
# 1. supabase/migrations/20251129020000_model1_lender_marketplace.sql
# 2. supabase/migrations/20251129030000_loans_table.sql
```

#### Run Seed Data (for testing)
```bash
# Run in Supabase SQL Editor
# supabase/seed.sql
```

### 3. Supabase Configuration

#### Authentication
- [ ] Enable Email/Password sign-in
- [ ] Configure email templates (confirmation, password reset)
- [ ] Set site URL to `https://primebridge.finance`
- [ ] Add redirect URLs:
  - `https://primebridge.finance/login`
  - `https://primebridge.finance/lender/dashboard`
  - `https://primebridge.finance/investor/dashboard`

#### Storage
- [ ] Create bucket: `loan-documents` (private)
- [ ] Create bucket: `public-assets` (public)
- [ ] Set up storage policies for authenticated uploads

#### Row Level Security
- [ ] Verify all RLS policies are enabled
- [ ] Test lender can only see their own pools
- [ ] Test investor can only see published deals
- [ ] Test admin has full access

---

## Deployment Steps

### Option A: Netlify (Recommended)

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git push origin main
   ```

2. **Netlify Configuration**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18+

3. **Environment Variables**
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`

4. **Deploy**
   - Trigger deploy from Netlify dashboard
   - Or push to main branch for auto-deploy

### Option B: Vercel

1. **Import Project**
   - Connect GitHub repo
   - Framework preset: Astro

2. **Configuration**
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Environment Variables**
   - Add via Vercel dashboard

4. **Deploy**
   - Push to main for auto-deploy

---

## Post-Deployment

### 1. Verify Core Flows

#### Public Pages
- [ ] Homepage loads correctly
- [ ] `/platform` page loads
- [ ] `/about` page loads
- [ ] `/contact` page loads
- [ ] All navigation links work
- [ ] Mobile responsive

#### Authentication
- [ ] User can register as lender
- [ ] User can register as investor
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works

#### Lender Flow
- [ ] Lender dashboard loads
- [ ] Can create new pool
- [ ] Can upload loan tape (CSV)
- [ ] Column mapping works
- [ ] Loans import successfully
- [ ] Can submit pool for review

#### Investor Flow
- [ ] Investor dashboard loads
- [ ] Deal room shows published deals
- [ ] Individual deal page loads
- [ ] Can submit soft commitment
- [ ] Portfolio shows commitments

#### Admin Flow
- [ ] Admin dashboard loads
- [ ] Can view lenders
- [ ] Can approve/reject lenders
- [ ] Can view loan pools
- [ ] Can approve pools and create deals
- [ ] Can view investor commitments

### 2. SEO Verification
- [ ] Meta titles render correctly
- [ ] Open Graph images work (test with Facebook debugger)
- [ ] Twitter cards work (test with Twitter card validator)
- [ ] Canonical URLs are correct
- [ ] robots.txt allows indexing
- [ ] sitemap.xml exists (if added)

### 3. Performance
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals pass
- [ ] Images optimized
- [ ] CSS/JS minified

### 4. Security
- [ ] HTTPS enforced
- [ ] Supabase RLS verified
- [ ] No API keys in client code
- [ ] CSP headers configured
- [ ] XSS protection enabled

---

## Create Test Accounts

After deployment, create these test accounts via Supabase Auth:

```
Admin:
- Email: admin@primebridge.finance
- Password: [secure password]
- Then run: UPDATE users SET role = 'admin' WHERE email = 'admin@primebridge.finance';

Lender:
- Email: demo-lender@example.com
- Password: [secure password]
- Role: lender (set during registration)

Investor:
- Email: demo-investor@example.com
- Password: [secure password]
- Role: investor (set during registration)
```

After creating auth users, run `supabase/seed.sql` to populate profiles.

---

## Monitoring

### Set Up Alerts
- [ ] Supabase database alerts
- [ ] Netlify/Vercel deployment notifications
- [ ] Error tracking (Sentry, LogRocket)

### Key Metrics to Track
- New user registrations
- Loan pools submitted
- Deals created
- Investor commitments
- Page load times
- Error rates

---

## DNS Configuration

For `primebridge.finance`:

```
Type    Name    Value
A       @       [Netlify/Vercel IP]
CNAME   www     [your-site].netlify.app
```

Or use Netlify/Vercel DNS for automatic configuration.

---

## Rollback Plan

If issues occur:

1. **Netlify**: Use deploy history to rollback
2. **Vercel**: Use deployment list to revert
3. **Database**:
   - Keep migration backups
   - Test rollback scripts before production

---

## Support Contacts

- Supabase: https://supabase.com/dashboard/support
- Netlify: https://www.netlify.com/support/
- Vercel: https://vercel.com/support

---

## Launch Day Checklist

- [ ] All tests passing
- [ ] Staging verified
- [ ] Database backed up
- [ ] Monitoring configured
- [ ] Team notified
- [ ] DNS propagated
- [ ] SSL certificate active
- [ ] Final smoke test
- [ ] Announce launch!
