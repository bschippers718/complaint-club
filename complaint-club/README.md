# 🗽 Complaint Club - NYC 311 Leaderboard

A real-time leaderboard showing which NYC neighborhoods complain the most. Track rats, noise, parking violations, and more!

![Complaint Club](https://img.shields.io/badge/NYC-311%20Data-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## Features

- 🏆 **Citywide Leaderboard** - Neighborhoods ranked by complaint volume
- 📊 **Category Filters** - Rats, noise, parking, trash, heat/water
- 🔥 **Chaos Score** - Custom metric combining all complaint types
- 📍 **My Block** - See complaints near your location
- ⚔️ **Compare Tool** - Battle two neighborhoods head-to-head
- 📤 **Share Cards** - Generate social media images

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Recharts
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Data Source**: NYC Open Data 311 API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account

### 1. Clone and Install

```bash
cd complaint-club
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_aggregation_functions.sql`
   - `supabase/migrations/003_helper_rpcs.sql`

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=generate_a_random_secret
```

### 4. Seed Neighborhood Data

The app needs NYC neighborhood boundaries. You can seed them by calling:

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Authorization: Bearer your_cron_secret"
```

Or run the initial data load manually via the Supabase SQL editor using the GeoJSON from NYC Open Data.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Initial Data Backfill

To populate historical data, call the ETL endpoint:

```bash
# Backfill last 30 days
curl -X POST http://localhost:3000/api/cron/ingest \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json" \
  -d '{"since": "2024-11-01", "limit": 10000}'

# Run aggregation
curl http://localhost:3000/api/cron/aggregate \
  -H "Authorization: Bearer your_cron_secret"
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The `vercel.json` configures cron jobs:
- **ETL Ingest**: Every 5 minutes
- **Aggregation**: Every hour

> Note: Vercel Cron requires a Pro plan for intervals under 1 day.

### Environment Variables for Production

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret!) |
| `CRON_SECRET` | Secret for authenticating cron job requests |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leaderboard` | GET | Get ranked neighborhoods |
| `/api/neighborhood/[id]` | GET | Get neighborhood details |
| `/api/compare` | GET | Compare two neighborhoods |
| `/api/nearby` | GET | Get complaints near a location |
| `/api/neighborhoods` | GET | List all neighborhoods |
| `/api/share/[id]` | GET | Generate share card image |
| `/api/cron/ingest` | GET | Run ETL ingestion |
| `/api/cron/aggregate` | GET | Run aggregation |
| `/api/seed` | POST | Seed neighborhood boundaries |

## Data Source

Data comes from the [NYC 311 Service Requests](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9) dataset on NYC Open Data.

## Project Structure

```
complaint-club/
├── app/
│   ├── api/               # API routes
│   │   ├── cron/          # ETL and aggregation jobs
│   │   ├── leaderboard/
│   │   ├── neighborhood/
│   │   ├── compare/
│   │   ├── nearby/
│   │   └── share/
│   ├── compare/           # Compare page
│   ├── my-block/          # Location-based page
│   ├── n/[id]/            # Neighborhood detail page
│   └── page.tsx           # Home/leaderboard
├── components/            # React components
├── lib/                   # Utilities and types
├── supabase/
│   └── migrations/        # Database schema
└── scripts/               # Helper scripts
```

## License

MIT

---

Built with 🗽 for NYC
