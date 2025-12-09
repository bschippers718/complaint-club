# Custom Domain Setup: 311complaints.nyc

This guide will help you connect your custom domain `311complaints.nyc` to your Vercel deployment.

> **Note**: `.nyc` domains cannot be purchased through Vercel, but you can connect a domain you already own.

## Prerequisites

- You must already own `311complaints.nyc` (purchased from a domain registrar)
- Access to your domain registrar's DNS settings

## Step 1: Add Domain in Vercel Dashboard

1. **Go to your Vercel project**
   - Visit: https://vercel.com/[your-team]/complaint-club
   - Or navigate to: Project Settings → Domains

2. **Add the domain**
   - Click **"Add Domain"** or **"Add"** button
   - Enter: `311complaints.nyc`
   - Click **"Add"**

3. **Vercel will show you DNS configuration options**
   - You'll see instructions for configuring DNS records
   - Note the CNAME or A record values provided

## Step 2: Configure DNS Records

You have two options for DNS configuration:

### Option A: CNAME Record (Recommended)

1. **Go to your domain registrar** (where you purchased `311complaints.nyc`)
   - Common registrars: Namecheap, GoDaddy, Google Domains, Cloudflare, etc.

2. **Add a CNAME record:**
   - **Type**: CNAME
   - **Name/Host**: `@` (or leave blank for root domain) or `www` (if you want www.311complaints.nyc)
   - **Value/Target**: `cname.vercel-dns.com` (or the specific CNAME Vercel provides)
   - **TTL**: 3600 (or default)

   **Note**: Some registrars don't support CNAME on the root domain (@). If that's the case, use Option B.

### Option B: A Record (If CNAME not supported on root)

1. **Add A records** pointing to Vercel's IP addresses:
   - **Type**: A
   - **Name/Host**: `@` (root domain)
   - **Value**: `76.76.19.1` (Vercel will provide the exact IPs)
   - **TTL**: 3600

   - Repeat for additional IPs if Vercel provides multiple

2. **For www subdomain** (optional):
   - **Type**: CNAME
   - **Name/Host**: `www`
   - **Value**: `cname.vercel-dns.com`

## Step 3: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes** for most changes
- You can check propagation status at: https://www.whatsmydns.net/

## Step 4: SSL Certificate

- Vercel automatically provisions SSL certificates via Let's Encrypt
- Once DNS is configured correctly, Vercel will automatically:
  1. Verify domain ownership
  2. Issue SSL certificate
  3. Enable HTTPS

- This usually happens within **5-10 minutes** after DNS is configured

## Step 5: Verify Domain Status

1. **Check in Vercel Dashboard**
   - Go to: Project Settings → Domains
   - You should see `311complaints.nyc` with status:
     - ✅ **Valid Configuration** (ready)
     - ⏳ **Pending** (waiting for DNS/SSL)
     - ❌ **Invalid Configuration** (check DNS settings)

2. **Test the domain**
   - Visit: `https://311complaints.nyc`
   - Should redirect to your Vercel deployment

## Troubleshooting

### Domain shows "Invalid Configuration"
- **Check DNS records**: Make sure CNAME or A records are correct
- **Wait longer**: DNS propagation can take time
- **Check TTL**: Lower TTL values help with faster updates

### SSL Certificate not issuing
- **Verify DNS**: Ensure DNS is pointing to Vercel
- **Check domain status**: In Vercel dashboard → Domains
- **Wait**: SSL provisioning can take 5-10 minutes after DNS is correct

### Domain not resolving
- **Check DNS propagation**: Use https://www.whatsmydns.net/
- **Verify records**: Double-check CNAME/A record values
- **Contact registrar**: Some registrars have specific requirements

## Optional: Redirect www to root (or vice versa)

If you want to redirect `www.311complaints.nyc` → `311complaints.nyc`:

1. Add both domains in Vercel
2. In Vercel dashboard → Domains → Configure redirect
3. Or add redirect in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "https://www.311complaints.nyc/:path*",
      "destination": "https://311complaints.nyc/:path*",
      "permanent": true
    }
  ]
}
```

## Quick Reference

- **Vercel Project**: complaint-club
- **Current URL**: complaint-club.vercel.app
- **Target Domain**: 311complaints.nyc
- **DNS Type**: CNAME (preferred) or A record
- **SSL**: Automatic via Let's Encrypt

## Need Help?

- Vercel Docs: https://vercel.com/docs/concepts/projects/domains
- Vercel Support: https://vercel.com/support
