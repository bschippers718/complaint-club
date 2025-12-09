# DNS Setup for 311complaints.nyc

## Current Status
- **Domain**: 311complaints.nyc
- **Status**: Invalid Configuration (needs DNS record)
- **Required Record**: A record pointing to `216.198.79.1`

## Step-by-Step Instructions

### Step 1: Go to Your Domain Registrar

Log in to where you purchased `311complaints.nyc`. Common registrars:
- Namecheap
- GoDaddy
- Google Domains
- Cloudflare
- Hover
- Network Solutions
- Others

### Step 2: Find DNS Management

Look for one of these sections:
- **DNS Management**
- **DNS Settings**
- **DNS Records**
- **Advanced DNS**
- **Name Servers / DNS**

### Step 3: Add the A Record

Add a new DNS record with these exact values:

| Field | Value |
|-------|-------|
| **Type** | `A` (or `A Record`) |
| **Name** | `@` (or leave blank, or enter just the domain without subdomain) |
| **Value** | `216.198.79.1` |
| **TTL** | `3600` (or default/automatic) |

**Important Notes:**
- The `@` symbol represents the root domain (311complaints.nyc)
- Some registrars use a blank field instead of `@`
- Some registrars require you to enter just the domain name
- Make sure there's NO `www` or other subdomain prefix

### Step 4: Save the Record

Click **Save**, **Add Record**, or **Update DNS** (varies by registrar)

### Step 5: Wait for DNS Propagation

- **Typical time**: 15 minutes to 1 hour
- **Maximum time**: Up to 48 hours (rare)
- You can check propagation at: https://www.whatsmydns.net/#A/311complaints.nyc

### Step 6: Verify in Vercel

1. Go back to Vercel Dashboard → Domains
2. Click **"Refresh"** button next to your domain
3. Status should change from "Invalid Configuration" to:
   - ⏳ **"Pending"** (waiting for SSL certificate)
   - ✅ **"Valid Configuration"** (ready!)

## Registrar-Specific Instructions

### Namecheap
1. Go to Domain List → Manage → Advanced DNS
2. Click "Add New Record"
3. Select Type: **A Record**
4. Host: `@`
5. Value: `216.198.79.1`
6. TTL: Automatic
7. Click Save

### GoDaddy
1. Go to My Products → DNS
2. Click "Add" in the Records section
3. Type: **A**
4. Name: `@`
5. Value: `216.198.79.1`
6. TTL: 600 (or default)
7. Click Save

### Google Domains
1. Go to DNS → Custom resource records
2. Click "Add record"
3. Name: `@` (or leave blank)
4. Type: **A**
5. Data: `216.198.79.1`
6. TTL: 3600
7. Click Add

### Cloudflare
1. Go to DNS → Records
2. Click "Add record"
3. Type: **A**
4. Name: `@` (or root domain)
5. IPv4 address: `216.198.79.1`
6. Proxy status: DNS only (gray cloud, not orange)
7. Click Save

### Hover
1. Go to Domains → DNS
2. Click "Add Record"
3. Type: **A**
4. Hostname: `@` (or leave blank)
5. Points to: `216.198.79.1`
6. TTL: 3600
7. Click Add Record

## Troubleshooting

### Still showing "Invalid Configuration" after 1 hour?
1. **Double-check the record**:
   - Make sure Type is `A` (not AAAA, CNAME, etc.)
   - Make sure Name is `@` or blank (not `www` or other subdomain)
   - Make sure Value is exactly `216.198.79.1`

2. **Remove conflicting records**:
   - If you have a CNAME record for `@`, remove it (A and CNAME can't coexist)
   - If you have other A records for `@`, you may need to remove them

3. **Check DNS propagation**:
   - Visit: https://www.whatsmydns.net/#A/311complaints.nyc
   - See if the A record is showing up globally

4. **Wait longer**:
   - Some DNS changes can take up to 48 hours
   - Check back in a few hours

### SSL Certificate Not Issuing?
- Wait 5-10 minutes after DNS is correct
- Vercel automatically provisions SSL via Let's Encrypt
- Check Vercel dashboard for SSL status

## Quick Verification Commands

After adding the DNS record, you can verify it's working:

```bash
# Check DNS record
dig 311complaints.nyc A

# Or using nslookup
nslookup 311complaints.nyc
```

You should see `216.198.79.1` in the response.

## Next Steps After DNS is Configured

1. ✅ DNS record added → Wait 15-30 minutes
2. ✅ Vercel verifies domain → Status changes to "Pending"
3. ✅ SSL certificate issued → Status changes to "Valid Configuration"
4. ✅ Visit https://311complaints.nyc → Your app should load!

## Need More Help?

- **Vercel Support**: https://vercel.com/support
- **DNS Propagation Checker**: https://www.whatsmydns.net/
- **Vercel Domain Docs**: https://vercel.com/docs/concepts/projects/domains
