# LEA Capacity Calculator - Architecture

## Overview

A public-facing calculator that helps prospects understand the capacity gains from using LEA. Users input their business metrics, provide their email, and receive FTE-equivalent capacity analysis. All submissions are captured as leads.

**Live URL:** https://myroi.getlea.io
**Admin:** https://myroi.getlea.io/admin
**Repo:** https://github.com/maxdklein/lead-gen-calculator

---

## Key Design Decisions

### No Pricing Exposure
The calculator shows capacity/time savings only - no LEA pricing, no ROI percentages, no investment comparisons. This prevents competitors from reverse-engineering pricing while still demonstrating value.

### FTE-Focused Messaging
Primary metric is "FTEs worth of capacity gained without adding headcount." Hours saved shown as secondary info. Backfill savings displayed separately when applicable (at $50/hr baseline).

### Email Gate
Results are gated behind email capture. User must submit email before seeing their analysis. This ensures every calculation generates a lead.

### Single API Architecture
One POST endpoint (`/api/calculate`) handles everything: validates input, calculates results, saves lead, returns data. Designed for easy Webflow integration.

---

## Project Structure

```
lead-gen-calculator/
├── server.js                 # Express server, all API routes
├── lib/
│   └── roi-calculator.js     # ROI calculation logic (from sales-proposal-portal)
├── db/
│   ├── db.js                 # Database queries
│   └── schema.sql            # Tables + seed data
├── public/
│   ├── index.html            # Calculator UI (Tailwind CSS)
│   ├── calculator.js         # Multi-step form logic + PDF export
│   └── admin/
│       ├── index.html        # Leads dashboard
│       ├── login.html        # Admin login
│       ├── admin.js          # Dashboard logic
│       ├── admin.css         # Dashboard styles
│       ├── benefits.html     # Strategic benefits CMS
│       └── benefits.js       # Benefits CMS logic
├── WEBFLOW-INTEGRATION.md    # API docs for Webflow developer
└── README.md                 # Setup instructions
```

---

## Database Schema

### leads
Stores all calculator submissions with contact info, inputs, calculated results, and tracking.

| Column | Purpose |
|--------|---------|
| email, first_name, last_name, company_name, phone | Contact info |
| company_type, use_case | Selection choices |
| monthly_documents, annual_backfill, etc. | Business inputs |
| monthly_hours_saved, ftes_avoided, backfill_cost_saved | Calculated results |
| strategic_benefits | JSONB array of benefits shown |
| utm_source, utm_medium, utm_campaign | Campaign tracking |
| status, notes | Lead management |

### strategic_benefits
CMS-managed benefits displayed in results, organized by use case.

| Column | Purpose |
|--------|---------|
| use_case | Which use case this benefit belongs to |
| benefit_text | The benefit copy |
| display_order | Sort order |
| is_active | Toggle visibility |

### roi_defaults
System-wide calculation constants (single row, id=1).

### session
Express session storage for admin auth.

---

## Calculator Flow

```
Step 1: Company Type
  └─> wealth_management | private_markets_platform | point_solutions_b2b

Step 2: Use Case (filtered by company type)
  └─> critical_business_process | m_and_a_transitions |
      prospects_onboarding | new_investor_onboarding

Step 3: Business Inputs (dynamic based on use case)
  └─> Documents, transactions, clients, etc.

Step 4: Email Capture
  └─> Email (required), name, company, phone (optional)
  └─> Submit → POST /api/calculate

Step 5: Results
  └─> FTEs (hero metric)
  └─> Hours/month, hours/year
  └─> Backfill savings (if applicable)
  └─> Strategic benefits
  └─> CTA: Schedule a Demo
```

---

## Use Case → Company Type Mapping

| Company Type | Available Use Cases |
|--------------|---------------------|
| Wealth Management | Critical Business Process, M&A Transitions, Prospects & Onboarding |
| Private Markets Platform | New Investor Onboarding, Critical Business Process |
| Point Solutions / B2B | Critical Business Process, Prospects & Onboarding |

---

## API Endpoints

### Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calculate` | POST | Submit lead, get results |
| `/api/roi-defaults` | GET | Calculation constants |
| `/api/strategic-benefits/:useCase` | GET | Benefits for display |

### Admin (session auth required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/auth` | POST | Login |
| `/api/admin/auth/status` | GET | Check auth |
| `/api/admin/auth/logout` | POST | Logout |
| `/api/admin/stats` | GET | Dashboard metrics |
| `/api/admin/leads` | GET | List/filter leads |
| `/api/admin/leads/:id` | GET/PUT | View/update lead |
| `/api/admin/leads/export` | GET | CSV download |
| `/api/admin/benefits` | GET/POST | List/create benefits |
| `/api/admin/benefits/:id` | PUT/DELETE | Update/delete benefit |
| `/api/admin/benefits/reorder` | POST | Reorder benefits |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session encryption key |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Set to `production` on Railway |

---

## Deployment

Hosted on Railway with auto-deploy from `main` branch.

1. Push to `main`
2. Railway detects changes, rebuilds
3. Schema migrations run on server start
4. Live at myroi.getlea.io

---

## Webflow Integration

See `WEBFLOW-INTEGRATION.md` for complete API documentation. Key points:

- Single POST to `/api/calculate` with form data
- Returns FTEs, hours, backfill savings, benefits
- Strategic benefits can be managed in Webflow CMS (ignore API response)
- CORS enabled for cross-origin requests

---

## Development Guidelines

1. **No pricing in responses** - Never expose ARR, investment, or ROI percentages
2. **Test all use cases** - Each has different input fields and calculations
3. **Check strategic benefits** - Unique constraint prevents duplicates; CMS at /admin/benefits
4. **Session handling** - Uses `trust proxy` and `sameSite: lax` for Railway's proxy
5. **PDF export** - Uses html2canvas + jsPDF, matches web results layout

---

## Related Projects

- `sales-proposal-portal` - Full proposal system (source of roi-calculator.js)
- Webflow site (getlea.io) - Marketing site, will embed calculator
