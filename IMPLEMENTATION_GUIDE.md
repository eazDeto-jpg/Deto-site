# Deto Backend Security & Enhancement Implementation Guide

**Date:** April 13, 2026  
**Status:** Ready for Implementation  
**Priority:** CRITICAL

---

## 📋 Overview

This guide provides step-by-step instructions to implement all security fixes and enhancements to your Deto webapp backend.

---

## 🔴 PHASE 1: Critical Security Fixes (DO FIRST!)

### Step 1.1: Rotate All Exposed Secrets

**Status:** CRITICAL - Your secrets are exposed in GitHub!

#### Supabase:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings → API**
4. Click **Rotate** on both `anon` and `service_role` keys
5. Copy the new keys

#### Brevo:
1. Go to https://app.brevo.com
2. Go to **Settings → API Keys**
3. Delete the old API key
4. Create a new API key
5. Copy the new key

#### Vercel:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Delete old secrets
5. Add new ones (see Step 1.3)

### Step 1.2: Remove Secrets from Git History

```bash
# Clone your repo
git clone https://github.com/eazDeto-jpg/Deto-site.git
cd Deto-site

# Remove .env.local from git history
git filter-branch --tree-filter 'rm -f .env.local' -- --all

# Force push (WARNING: This affects all collaborators)
git push origin --force --all

# Verify it's gone
git log --all --full-history -- .env.local
```

### Step 1.3: Update Environment Variables

1. Create `.env.local` locally (never commit):
```bash
cp .env.example .env.local
```

2. Fill in your NEW secrets:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_KEY=your-new-service-key
ADMIN_SECRET=your-new-admin-secret
BREVO_API_KEY=your-new-brevo-api-key
REMINDER_SECRET=your-new-reminder-secret
```

3. Set in Vercel:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add ADMIN_SECRET
vercel env add BREVO_API_KEY
vercel env add REMINDER_SECRET
```

### Step 1.4: Verify .gitignore

Check that `.gitignore` includes:
```
.env
.env.local
.env.*.local
.env.production.local
```

---

## 🔐 PHASE 2: Implement Authentication Improvements

### Step 2.1: Add Rate Limiting to Login

1. Copy `auth-utils.js` to your project
2. Update `login.html` with improved version:
   - Import `auth-utils.js`
   - Add rate limiting checks
   - Add CAPTCHA support

3. Configure hCaptcha:
   - Go to https://www.hcaptcha.com/
   - Create account and get Site Key
   - Replace `your-hcaptcha-site-key` in login forms

### Step 2.2: Implement CAPTCHA

1. Install hCaptcha or reCAPTCHA
2. Add CAPTCHA verification on backend
3. Test with multiple failed attempts

### Step 2.3: Migrate Detailer Auth to Supabase Auth

**Current:** Custom token system (risky)  
**Target:** Supabase Auth (secure)

```javascript
// Before: Custom token
localStorage.setItem('deto_detailer_token', token);

// After: Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

---

## 🗄️ PHASE 3: Enhance Database Schema

### Step 3.1: Run Enhanced Schema SQL

1. Go to Supabase SQL Editor
2. Copy entire `supabase-enhanced-schema.sql`
3. Run the query
4. Verify all tables created:
   - ✅ customers
   - ✅ payments
   - ✅ email_logs
   - ✅ audit_logs
   - ✅ detailer_ratings
   - ✅ notifications

### Step 3.2: Verify RLS Policies

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('customers', 'payments', 'boekingen', 'detailers')
ORDER BY tablename;
```

Expected output: `rowsecurity = 't'` for all tables

### Step 3.3: Test Database Queries

```sql
-- Test customer insert
INSERT INTO customers (email, full_name) 
VALUES ('test@example.com', 'Test User');

-- Test payment insert
INSERT INTO payments (booking_id, customer_id, stripe_payment_id, amount_cents, status)
VALUES ('booking-uuid', 'customer-uuid', 'stripe-id', 7500, 'succeeded');

-- Test email log
INSERT INTO email_logs (recipient_email, subject, email_type, status)
VALUES ('test@example.com', 'Test Subject', 'confirmation', 'sent');
```

---

## 🔒 PHASE 4: Implement API Security

### Step 4.1: Add API Security Middleware

1. Copy `api-security.js` to your project
2. Import in your API handlers:

```javascript
import {
  validateInput,
  sanitizeOutput,
  getCorsHeaders,
  RateLimiter
} from './api-security.js';
```

### Step 4.2: Implement CORS Protection

```javascript
// In your API handler
const origin = request.headers.get('origin');
const corsHeaders = getCorsHeaders(origin);

if (!corsHeaders['Access-Control-Allow-Origin']) {
  return new Response('CORS not allowed', { status: 403 });
}
```

### Step 4.3: Add Input Validation

```javascript
const schema = {
  email: {
    required: true,
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    required: true,
    type: 'string',
    minLength: 8,
    maxLength: 128
  }
};

const validation = validateInput(data, schema);
if (!validation.isValid) {
  return createErrorResponse(400, 'Validation failed', validation.errors);
}
```

---

## 📧 PHASE 5: Setup Email System

### Step 5.1: Configure Brevo Integration

1. Copy `email-templates.js` to your project
2. Create Brevo API client:

```javascript
import axios from 'axios';

const brevoClient = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'api-key': process.env.BREVO_API_KEY
  }
});
```

### Step 5.2: Send Booking Confirmation Email

```javascript
import { getBookingConfirmationEmail } from './email-templates.js';

const { html, text, subject } = getBookingConfirmationEmail(booking, customer);

await brevoClient.post('/smtp/email', {
  to: [{ email: customer.email, name: customer.full_name }],
  subject,
  htmlContent: html,
  textContent: text,
  sender: {
    name: 'Deto',
    email: 'noreply@deto.site'
  }
});
```

### Step 5.3: Log Email Sends

```javascript
// After sending email
await supabase.from('email_logs').insert({
  recipient_email: customer.email,
  subject,
  email_type: 'confirmation',
  booking_id: booking.id,
  status: 'sent',
  sent_at: new Date().toISOString()
});
```

---

## 📊 PHASE 6: Add Monitoring & Logging

### Step 6.1: Setup Error Logging

```javascript
// Log errors to Supabase
async function logError(error, context) {
  await supabase.from('audit_logs').insert({
    action: 'error',
    resource_type: context.type,
    error_message: error.message,
    status: 'failure'
  });
}
```

### Step 6.2: Setup Audit Logging

```javascript
// Log all important actions
async function logAuditEvent(userId, action, resource) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: resource.type,
    resource_id: resource.id,
    status: 'success'
  });
}
```

### Step 6.3: Setup Performance Monitoring

```javascript
// Track API response times
function logApiRequest(method, path, duration, status) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method,
    path,
    duration: `${duration}ms`,
    status
  }));
}
```

---

## 🧪 PHASE 7: Testing

### Step 7.1: Test Authentication

- [ ] Test customer login with valid credentials
- [ ] Test customer login with invalid credentials
- [ ] Test rate limiting (5 attempts in 15 minutes)
- [ ] Test CAPTCHA validation
- [ ] Test password reset flow

### Step 7.2: Test Database

- [ ] Test customer table insert/read
- [ ] Test payment table insert/read
- [ ] Test RLS policies
- [ ] Test email logs
- [ ] Test audit logs

### Step 7.3: Test API Security

- [ ] Test CORS with allowed origin
- [ ] Test CORS with blocked origin
- [ ] Test input validation
- [ ] Test output sanitization
- [ ] Test rate limiting

### Step 7.4: Test Email System

- [ ] Test booking confirmation email
- [ ] Test booking reminder email
- [ ] Test password reset email
- [ ] Test email logging

---

## 📋 Deployment Checklist

- [ ] All secrets rotated
- [ ] .env.local removed from git
- [ ] .gitignore updated
- [ ] Enhanced schema deployed
- [ ] RLS policies verified
- [ ] Auth improvements implemented
- [ ] API security added
- [ ] Email system configured
- [ ] Monitoring setup
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Deployed to production

---

## 🚀 Deployment Steps

### 1. Create Feature Branch
```bash
git checkout -b security-enhancements
git add .
git commit -m "Implement security enhancements and backend improvements"
```

### 2. Deploy to Staging
```bash
git push origin security-enhancements
# Create PR and test in staging environment
```

### 3. Deploy to Production
```bash
git checkout main
git merge security-enhancements
git push origin main
# Vercel will auto-deploy
```

### 4. Verify Deployment
- [ ] Check Vercel deployment status
- [ ] Test login flow
- [ ] Test booking flow
- [ ] Check email delivery
- [ ] Monitor error logs

---

## 🔗 Resources

- [Supabase Security](https://supabase.com/docs/guides/auth)
- [OWASP Security Guidelines](https://owasp.org/)
- [Brevo Email API](https://developers.brevo.com/docs/send-transactional-emails)
- [hCaptcha Documentation](https://docs.hcaptcha.com/)

---

## 📞 Support

If you encounter issues:
1. Check the error logs in Supabase
2. Review the audit logs for context
3. Check Brevo delivery status
4. Test with curl or Postman

---

**Last Updated:** April 13, 2026  
**Next Review:** After deployment
