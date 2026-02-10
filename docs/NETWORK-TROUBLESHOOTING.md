# Network Troubleshooting Guide

## Issue: Node.js Cannot Connect to Cloudflare Workers

### Problem Description

In certain network environments, Node.js is unable to make HTTPS connections to Cloudflare Workers domains (`*.workers.dev`), resulting in `ECONNRESET` errors during authentication and API calls.

### Symptoms

- Login fails with `CredentialsSignin` error
- Console shows: `Error: fetch failed` with `ECONNRESET`
- PowerShell/browser can access the API successfully
- Only Node.js/server-side fetch fails

### Root Cause

Some ISPs or network configurations specifically block `workers.dev` domains when accessed through Node.js's OpenSSL-based HTTP stack, while allowing Windows' native HTTP stack (used by PowerShell and browsers) to connect successfully.

**Why PowerShell works but Node.js doesn't:**

- **PowerShell** uses Windows HTTP Services (WinHTTP) with Windows' TLS stack
- **Node.js** uses OpenSSL with a different TLS fingerprint
- ISPs with Deep Packet Inspection (DPI) can differentiate between these and block Node.js selectively

### Solution: PowerShell Workaround (Windows Only)

A PowerShell-based HTTP client is built into the D1 client that can be enabled via environment variable.

#### Setup Instructions

1. **Add to your `.env.local` file:**

   ```env
   USE_POWERSHELL_FETCH=true
   ```

2. **Restart your development server:**
   ```powershell
   pnpm run dev
   ```

#### How It Works

When `USE_POWERSHELL_FETCH=true` is set:

- The D1 client detects Node.js fetch will fail
- Creates a temporary PowerShell script for each API call
- Executes the script using Windows' native HTTP stack
- Returns the JSON response to Node.js
- Cleans up temporary files automatically

#### Performance Note

PowerShell-based requests are slower (~500ms overhead) but functional. This is acceptable for development but not recommended for production.

### Alternative Solutions

#### 1. Custom Domain (Recommended for Production)

Instead of `*.workers.dev`, use your own domain:

- Go to Cloudflare Dashboard → Workers & Pages → Your Worker
- Add a custom domain (e.g., `api.yourdomain.com`)
- Update `NEXT_PUBLIC_D1_API_URL` in `.env.local`

#### 2. VPN/Proxy

Use a VPN to bypass ISP restrictions (may not always work)

#### 3. Local Development Database

Use SQLite locally with the same schema as D1

### Testing Connection

Test if Node.js can reach the API:

```powershell
node -e "fetch('https://cloudflare-d1-rest-api.shweloader.workers.dev/query', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_TOKEN' }, body: JSON.stringify({ query: 'SELECT 1' }) }).then(r => r.json()).then(console.log).catch(e => console.error('FAILED:', e.message))"
```

Test if PowerShell works:

```powershell
Invoke-RestMethod -Uri "https://cloudflare-d1-rest-api.shweloader.workers.dev/query" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer YOUR_TOKEN"} -Body '{"query":"SELECT 1"}'
```

### Important Notes

- **This workaround is Windows-only** and will not work on Linux/Mac
- **The `.env.local` file is gitignored** - each developer configures their own environment
- **Team members without network issues don't need this** - the code works normally without the flag
- **Not suitable for production** - use a custom domain for deployed applications

### Related Files

- `src/lib/api/d1-client.ts` - Contains the PowerShell workaround implementation
- `.env.local` - Personal environment configuration (gitignored)
- `docs/DEPLOYMENT.md` - Production deployment guidelines

---

**Created:** 2026-02-09  
**Last Updated:** 2026-02-09
