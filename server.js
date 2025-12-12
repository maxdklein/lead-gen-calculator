require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const { pool, initializeDatabase, roiDefaultsQueries, strategicBenefitsQueries, leadsQueries, adminQueries } = require('./db/db');
const { calculateROI, getStrategicROI, mergeRoiConfig, USE_CASE_LABELS, COMPANY_TYPE_LABELS } = require('./lib/roi-calculator');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy (required for secure cookies behind Railway's proxy)
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'lead-gen-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Admin auth middleware
function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
}

// =====================
// PUBLIC API ENDPOINTS
// =====================

// Get ROI defaults (for calculator initialization)
app.get('/api/roi-defaults', async (req, res) => {
  try {
    const defaults = await roiDefaultsQueries.get();
    res.json(defaults);
  } catch (error) {
    console.error('Error fetching ROI defaults:', error);
    res.status(500).json({ error: 'Failed to fetch ROI defaults' });
  }
});

// Get strategic benefits for a use case
app.get('/api/strategic-benefits/:useCase', async (req, res) => {
  try {
    const { useCase } = req.params;

    // Try database first
    let benefits = await strategicBenefitsQueries.getByUseCase(useCase);

    // Fall back to hardcoded if empty
    if (!benefits || benefits.length === 0) {
      const strategicROI = getStrategicROI(useCase);
      benefits = strategicROI.strategic || [];
    }

    res.json({ benefits });
  } catch (error) {
    console.error('Error fetching strategic benefits:', error);
    res.status(500).json({ error: 'Failed to fetch strategic benefits' });
  }
});

// Calculate ROI and save lead
app.post('/api/calculate', async (req, res) => {
  try {
    const {
      // Contact info
      email, first_name, last_name, company_name, phone,
      // ROI config
      company_type, use_case, roi_model, fte_cost, backfill_rate_type,
      // Business inputs
      monthly_documents, annual_backfill,
      m_and_a_transactions_per_year, avg_households_per_transaction, historical_households_to_migrate,
      annual_new_clients, annual_investors_onboarded,
      // UTM tracking
      utm_source, utm_medium, utm_campaign
    } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!use_case) {
      return res.status(400).json({ error: 'Use case is required' });
    }

    // Get ROI defaults (with fallback if not seeded)
    let roiDefaults = await roiDefaultsQueries.get();
    if (!roiDefaults) {
      roiDefaults = {
        triage_time_per_doc: 5,
        data_entry_time_per_doc: 15,
        analyst_hourly_rate: 50,
        backfill_hourly_rate: 150,
        docs_per_household: 10,
        docs_per_client: 10,
        docs_per_investor: 5,
        default_fte_cost: 85000
      };
    }

    // Prepare inputs for calculation
    const inputs = {
      use_case,
      roi_model,
      fte_cost,
      backfill_rate_type,
      monthly_documents,
      annual_backfill,
      m_and_a_transactions_per_year,
      avg_households_per_transaction,
      historical_households_to_migrate,
      annual_new_clients,
      annual_investors_onboarded
    };

    // Calculate ROI
    const roiResults = calculateROI(inputs, roiDefaults);

    if (!roiResults) {
      return res.status(400).json({ error: 'Unable to calculate ROI' });
    }

    // Get strategic benefits for this use case
    let strategicBenefits = await strategicBenefitsQueries.getByUseCase(use_case);
    if (!strategicBenefits || strategicBenefits.length === 0) {
      const strategicROI = getStrategicROI(use_case);
      strategicBenefits = strategicROI.strategic || [];
    }

    // Get client IP and user agent
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const user_agent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    // Save lead to database
    const lead = await leadsQueries.create({
      email,
      first_name,
      last_name,
      company_name,
      phone,
      company_type,
      use_case,
      roi_model: roiResults.roi_model,
      fte_cost: roiResults.fte_cost,
      backfill_rate_type: roiResults.backfill_rate_type,
      monthly_documents: roiResults.derived_monthly_documents,
      annual_backfill: roiResults.derived_annual_backfill,
      m_and_a_transactions_per_year,
      avg_households_per_transaction,
      historical_households_to_migrate,
      annual_new_clients,
      annual_investors_onboarded,
      monthly_hours_saved: roiResults.monthly_hours_saved,
      annual_savings: roiResults.annual_savings,
      backfill_cost_saved: roiResults.backfill_cost_saved,
      ftes_avoided: roiResults.ftes_avoided,
      strategic_benefits: strategicBenefits,
      utm_source,
      utm_medium,
      utm_campaign,
      ip_address,
      user_agent,
      referrer
    });

    // Return results (no pricing info)
    res.json({
      success: true,
      results: {
        monthly_hours_saved: roiResults.monthly_hours_saved,
        annual_savings: roiResults.annual_savings,
        annual_recurring_savings: roiResults.annual_recurring_savings,
        backfill_cost_saved: roiResults.backfill_cost_saved,
        ftes_avoided: roiResults.ftes_avoided,
        hours_per_unit: roiResults.hours_per_unit,
        unit_label: roiResults.unit_label,
        roi_model: roiResults.roi_model,
        strategic_benefits: strategicBenefits,
        use_case_label: USE_CASE_LABELS[use_case] || use_case,
        company_type_label: COMPANY_TYPE_LABELS[company_type] || company_type
      }
    });
  } catch (error) {
    console.error('Error calculating ROI:', error);
    res.status(500).json({ error: 'Failed to calculate ROI' });
  }
});

// =====================
// ADMIN API ENDPOINTS
// =====================

// Admin login
app.post('/api/admin/auth', async (req, res) => {
  try {
    const { password } = req.body;

    // Simple password auth (no email required for single admin)
    if (password === process.env.ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      req.session.adminEmail = 'admin';
      return res.json({ success: true });
    }

    res.status(401).json({ error: 'Invalid password' });
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Check admin auth status
app.get('/api/admin/auth/status', (req, res) => {
  res.json({ isAuthenticated: !!req.session.isAdmin });
});

// Admin logout
app.post('/api/admin/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get dashboard stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await leadsQueries.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all leads with filtering
app.get('/api/admin/leads', requireAdmin, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      company_type: req.query.company_type,
      use_case: req.query.use_case,
      search: req.query.search,
      from_date: req.query.from,
      to_date: req.query.to,
      sort: req.query.sort,
      order: req.query.order,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await leadsQueries.getAll(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get single lead
app.get('/api/admin/leads/:id', requireAdmin, async (req, res) => {
  try {
    const lead = await leadsQueries.getById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Update lead status/notes
app.put('/api/admin/leads/:id', requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const lead = await leadsQueries.update(req.params.id, { status, notes });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
app.delete('/api/admin/leads/:id', requireAdmin, async (req, res) => {
  try {
    await leadsQueries.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Export leads to CSV
app.get('/api/admin/leads/export', requireAdmin, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      from_date: req.query.from,
      to_date: req.query.to
    };

    const leads = await leadsQueries.exportCSV(filters);

    // Generate CSV
    const headers = [
      'Email', 'First Name', 'Last Name', 'Company', 'Phone',
      'Company Type', 'Use Case', 'ROI Model',
      'Monthly Hours Saved', 'Annual Savings', 'Backfill Savings', 'FTEs Avoided',
      'Status', 'Created At', 'Contacted At', 'Notes'
    ];

    let csv = headers.join(',') + '\n';

    for (const lead of leads) {
      const row = [
        lead.email,
        lead.first_name || '',
        lead.last_name || '',
        lead.company_name || '',
        lead.phone || '',
        COMPANY_TYPE_LABELS[lead.company_type] || lead.company_type || '',
        USE_CASE_LABELS[lead.use_case] || lead.use_case || '',
        lead.roi_model || '',
        lead.monthly_hours_saved || '',
        lead.annual_savings || '',
        lead.backfill_cost_saved || '',
        lead.ftes_avoided || '',
        lead.status || '',
        lead.created_at ? new Date(lead.created_at).toISOString() : '',
        lead.contacted_at ? new Date(lead.contacted_at).toISOString() : '',
        (lead.notes || '').replace(/"/g, '""')
      ].map(val => `"${val}"`).join(',');

      csv += row + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// =====================
// SERVE FRONTEND
// =====================

// Serve admin pages
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// Serve main calculator
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================
// START SERVER
// =====================

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Lead Gen Calculator running on port ${PORT}`);
      console.log(`Calculator: http://localhost:${PORT}`);
      console.log(`Admin: http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
