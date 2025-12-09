# Setting Up Supabase MCP Server for Cursor

This will allow me to directly run migrations and manage your Supabase database.

## Step 1: Generate Supabase Personal Access Token

1. **Log in to Supabase**
   - Go to: https://supabase.com/dashboard
   - Sign in to your account

2. **Generate Access Token**
   - Navigate to: **Settings** → **Access Tokens** (or **Account** → **Access Tokens`)
   - Click **Generate New Token**
   - Give it a name like "Cursor MCP Server"
   - **Copy the token** - you'll need it in the next step

## Step 2: Create MCP Configuration File

I'll create the configuration file for you. You just need to add your access token.

The file should be at: `.cursor/mcp.json` in your project root.

## Step 3: Restart Cursor

After creating the config file, restart Cursor IDE to load the MCP server.

## Step 4: Verify Connection

Once configured, I'll be able to:
- ✅ Run SQL migrations directly
- ✅ Execute queries
- ✅ Fix chaos scores
- ✅ Manage your database

---

**Ready?** Once you have your Supabase Personal Access Token, let me know and I'll create the configuration file for you!

