# Bunny Edge Scripting Deployment Checklist

## Quick Reference: Secrets vs Variables

| Category | Examples | Bunny Location | Access Method |
|----------|----------|-----------------|----------------|
| **Secrets** | `*_SECRET`, `*_TOKEN`, `*_KEY`, `*_PASSWORD` | Secrets tab | `BunnySDK.secret.get()` |
| **Public Variables** | `PUBLIC_*`, `*_DOMAIN`, `*_URL`, config values | Environment Variables tab | `Deno.env.get()` |

## Pre-Deployment Checklist

### 1. Identify All Variables

```bash
# Extract all variables from .env.local
grep -E "^[A-Z_]+=" .env.local | sort > /tmp/all_vars.txt

# Separate secrets from public variables
grep -E "(SECRET|TOKEN|KEY|PASSWORD)" /tmp/all_vars.txt > /tmp/secrets.txt
grep -vE "(SECRET|TOKEN|KEY|PASSWORD)" /tmp/all_vars.txt > /tmp/public_vars.txt

# Display for review
echo "=== SECRETS (add to Bunny Secrets tab) ==="
cat /tmp/secrets.txt
echo ""
echo "=== PUBLIC VARIABLES (add to Bunny Environment Variables tab) ==="
cat /tmp/public_vars.txt
```

### 2. Categorize Variables

**Secrets to add to Bunny Secrets tab:**
- [ ] `AUTH0_MANAGEMENT_CLIENT_ID`
- [ ] `AUTH0_MANAGEMENT_CLIENT_SECRET`
- [ ] `AUTH0_PROD_CLIENT_SECRET`
- [ ] `AUTH0_TEST_CLIENT_SECRET`
- [ ] `AUTH0_SECURITY_CLIENT_SECRET`
- [ ] `WORKOS_API_KEY`
- [ ] `WORKOS_CLIENT_ID`
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `DISCORD_BOT_TOKEN`
- [ ] `DISCORD_PUBLIC_KEY`
- [ ] `BUNNY_API_KEY`
- [ ] `EMAILJS_ACCESS_TOKEN`
- [ ] `POSTHOG_API_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

**Public Variables to add to Bunny Environment Variables tab:**
- [ ] `PUBLIC_AUTH0_DOMAIN`
- [ ] `PUBLIC_AUTH0_CLIENT_ID`
- [ ] `PUBLIC_AUTH0_AUDIENCE`
- [ ] `PUBLIC_WEBAUTHN_RP_ID`
- [ ] `PUBLIC_WEBAUTHN_RP_NAME`
- [ ] `AWS_REGION`
- [ ] `INVITATION_EXPIRY_HOURS`
- [ ] `AUTO_APPROVE_TRUSTED_DOMAINS`
- [ ] `REQUIRE_ADMIN_APPROVAL`
- [ ] `TEST_EMAIL_PATTERNS`
- [ ] `HONEYPOT_EMAIL_PATTERNS`
- [ ] `TRUSTED_DOMAINS`
- [ ] `EMAILJS_SERVICE_ID`
- [ ] `EMAILJS_TEMPLATE_ID`
- [ ] `EMAILJS_USER_ID`
- [ ] `N8N_BASE_URL`
- [ ] `SES_FROM_EMAIL`
- [ ] `POSTHOG_HOST`

## Bunny Dashboard Steps

### Step 1: Access Your Script

1. Go to [panel.bunny.net](https://panel.bunny.net)
2. Navigate to **Edge Scripting**
3. Select your script (e.g., "thepia-auth-api")
4. Click **Settings**

### Step 2: Add Secrets

1. Click **Secrets** tab
2. For each secret from the checklist above:
   - Click **Add Secret**
   - Name: `AUTH0_MANAGEMENT_CLIENT_SECRET`
   - Value: (paste from `.env.local`)
   - Click **Save**
3. Verify all secrets are listed

### Step 3: Add Environment Variables

1. Click **Environment Variables** tab
2. For each public variable from the checklist above:
   - Click **Add Variable**
   - Name: `PUBLIC_AUTH0_DOMAIN`
   - Value: `thepia.eu.auth0.com`
   - Click **Save**
3. Verify all variables are listed

### Step 4: Deploy Code

1. Click **Code** tab
2. Paste your compiled script code
3. Click **Save**
4. Click **Publish** to deploy

## Verification Steps

### 1. Check Bunny Dashboard

```bash
# Verify secrets are accessible in Bunny logs
# Add this to your script temporarily:
console.log("✓ Secrets configured:", !!globalThis.BunnySDK?.secret.get("AUTH0_MANAGEMENT_CLIENT_SECRET"));
console.log("✓ Variables configured:", !!Deno.env.get("PUBLIC_AUTH0_DOMAIN"));
```

### 2. Test API Endpoints

```bash
# Test that auth endpoints work
curl -X POST https://your-bunny-script.com/app/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "test"}'

# Check response includes proper auth headers
```

### 3. Monitor Logs

1. Go to **Edge Scripting** → Your Script
2. Click **Logs** tab
3. Look for:
   - ✅ No "undefined" values for secrets
   - ✅ No "undefined" values for public variables
   - ✅ Successful API calls

## Troubleshooting

### Issue: "undefined" for secrets

**Cause**: Secret not added to Bunny Secrets tab

**Fix**:
1. Go to Bunny Dashboard → Secrets tab
2. Add the missing secret
3. Redeploy script

### Issue: "undefined" for public variables

**Cause**: Variable not added to Bunny Environment Variables tab

**Fix**:
1. Go to Bunny Dashboard → Environment Variables tab
2. Add the missing variable
3. Redeploy script

### Issue: Script fails after deployment

**Cause**: Missing or incorrect variable values

**Fix**:
1. Check `.env.local` for correct values
2. Verify all variables are in Bunny Dashboard
3. Check Bunny logs for specific errors
4. Redeploy with correct values

## Automated Deployment Script

Use `scripts/deploy-to-bunny.sh` to automate this:

```bash
# This script:
# 1. Validates all required secrets in .env
# 2. Compiles the TypeScript code
# 3. Uploads to Bunny API
# 4. Publishes the script

./scripts/deploy-to-bunny.sh
```

## Post-Deployment

- [ ] Monitor Bunny logs for errors
- [ ] Test all API endpoints
- [ ] Verify auth flows work end-to-end
- [ ] Check performance metrics
- [ ] Document any issues found
- [ ] Update this checklist if new variables added

## Related Documentation

- [Secrets vs Variables Guide](./SECRETS_VS_VARIABLES_GUIDE.md)
- [Bunny Deployment Guide](./auth/deployment-bunny.md)
- [Environment Variable Caching](./ENVIRONMENT_VARIABLE_CACHING_PROXY.md)

