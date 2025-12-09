# Setting Up Supabase MCP Server

This guide will help you configure the Supabase MCP server in Cursor so you can run migrations and manage your database directly.

## Step 1: Get Your Supabase Credentials

1. **Go to your Supabase project dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Get your credentials**
   - Go to **Settings** → **API**
   - Copy these values:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **Service Role Key** (the `service_role` secret key - keep this secure!)

## Step 2: Configure MCP Server in Cursor

1. **Open Cursor Settings**
   - Press `Cmd/Ctrl + ,` to open settings
   - Or go to: **Cursor** → **Settings** → **Features** → **MCP**

2. **Add Supabase MCP Server**

   You'll need to add the Supabase MCP server configuration. The configuration typically goes in your Cursor settings file (usually `~/.cursor/mcp.json` or in Cursor's settings UI).

   **Configuration format:**
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-supabase"
         ],
         "env": {
           "SUPABASE_URL": "https://your-project.supabase.co",
           "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
         }
       }
     }
   }
   ```

3. **Alternative: Use Cursor's MCP Settings UI**
   - In Cursor, go to **Settings** → **MCP**
   - Click **Add Server** or **Configure**
   - Select **Supabase** from the list (if available)
   - Enter your credentials:
     - **SUPABASE_URL**: Your project URL
     - **SUPABASE_SERVICE_ROLE_KEY**: Your service role key

## Step 3: Verify MCP Server is Connected

After configuring, you should be able to:
- Run SQL queries directly
- Execute migrations
- Manage database schema
- Query data

## Step 4: Test the Connection

Once configured, I'll be able to:
1. ✅ Run migrations directly
2. ✅ Execute SQL queries
3. ✅ Fix chaos scores
4. ✅ Verify database state
5. ✅ Manage your Supabase database

## Troubleshooting

### MCP Server not showing up
- Make sure you've installed the Supabase MCP server package
- Check that your credentials are correct
- Restart Cursor after configuration

### Connection errors
- Verify your `SUPABASE_URL` is correct (should end with `.supabase.co`)
- Make sure you're using the **Service Role Key** (not the anon key)
- Check that your Supabase project is active

### Can't find MCP settings
- Cursor's MCP settings might be in a different location
- Try looking in: **Settings** → **Features** → **Model Context Protocol**
- Or check Cursor's documentation for the latest MCP setup instructions

## Next Steps

Once the MCP server is configured:
1. I'll be able to run `APPLY_ALL_FIXES.sql` directly
2. Fix chaos scores automatically
3. Verify the database state
4. Run any other migrations you need

Let me know when you've configured it, and I'll test the connection!
