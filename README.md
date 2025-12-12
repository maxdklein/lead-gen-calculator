# Lead Gen Calculator

Public-facing ROI calculator for lead generation. Users enter company profile, use case, and business inputs, provide their email, and see their ROI results. Leads are saved to a database and viewable in an admin dashboard.

## Features

- **Multi-step calculator** with company type, use case, ROI model, and business inputs
- **Email gate** before showing results (soft lead capture)
- **No pricing exposure** - shows cost savings only, not LEA pricing
- **PDF export** with branded ROI analysis
- **Admin dashboard** for viewing and managing leads
- **UTM tracking** for campaign attribution

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: Vanilla JavaScript
- **Hosting**: Railway

## Local Development

1. Clone the repo:
   ```bash
   git clone https://github.com/maxdklein/lead-gen-calculator.git
   cd lead-gen-calculator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and admin password
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

5. Open:
   - Calculator: http://localhost:3001
   - Admin: http://localhost:3001/admin

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Random string for session encryption |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `PORT` | No | Server port (default: 3001) |

## Database Setup

The schema is auto-initialized on server start. For manual setup:

```bash
psql $DATABASE_URL -f db/schema.sql
```

## Deployment (Railway)

1. Create a new Railway project
2. Add PostgreSQL plugin
3. Connect GitHub repo
4. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway PostgreSQL)
   - `SESSION_SECRET`
   - `ADMIN_PASSWORD`
   - `NODE_ENV=production`

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/calculate` | Submit lead + get ROI results |
| `GET` | `/api/roi-defaults` | Get calculation defaults |
| `GET` | `/api/strategic-benefits/:useCase` | Get benefits for display |

### Admin (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/auth` | Admin login |
| `GET` | `/api/admin/stats` | Dashboard metrics |
| `GET` | `/api/admin/leads` | List leads with filters |
| `GET` | `/api/admin/leads/:id` | Get lead details |
| `PUT` | `/api/admin/leads/:id` | Update status/notes |
| `GET` | `/api/admin/leads/export` | CSV download |

## Lead Status Flow

- `new` → Fresh lead, not yet contacted
- `contacted` → Outreach initiated
- `qualified` → Good fit, active opportunity
- `converted` → Became a customer
- `disqualified` → Not a fit

## UTM Tracking

Append UTM parameters to calculator URL for campaign tracking:

```
https://calculator.getlea.io/?utm_source=linkedin&utm_medium=paid&utm_campaign=q1-2025
```
