const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database from schema
async function initializeDatabase() {
  const fs = require('fs');
  const path = require('path');

  try {
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSQL);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// ROI Defaults queries
const roiDefaultsQueries = {
  get: async () => {
    const result = await pool.query('SELECT * FROM roi_defaults WHERE id = 1');
    return result.rows[0];
  }
};

// Strategic Benefits queries
const strategicBenefitsQueries = {
  getByUseCase: async (useCase) => {
    const result = await pool.query(
      'SELECT benefit_text FROM strategic_benefits WHERE use_case = $1 AND is_active = true ORDER BY display_order',
      [useCase]
    );
    return result.rows.map(row => row.benefit_text);
  },

  getAll: async () => {
    const result = await pool.query(
      'SELECT * FROM strategic_benefits ORDER BY use_case, display_order'
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query('SELECT * FROM strategic_benefits WHERE id = $1', [id]);
    return result.rows[0];
  },

  create: async ({ use_case, benefit_text, display_order, is_active }) => {
    const result = await pool.query(
      `INSERT INTO strategic_benefits (use_case, benefit_text, display_order, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [use_case, benefit_text, display_order || 0, is_active !== false]
    );
    return result.rows[0];
  },

  update: async (id, { benefit_text, display_order, is_active }) => {
    const result = await pool.query(
      `UPDATE strategic_benefits
       SET benefit_text = COALESCE($1, benefit_text),
           display_order = COALESCE($2, display_order),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [benefit_text, display_order, is_active, id]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    await pool.query('DELETE FROM strategic_benefits WHERE id = $1', [id]);
  },

  reorder: async (use_case, orderedIds) => {
    // Update display_order for each benefit in the array
    for (let i = 0; i < orderedIds.length; i++) {
      await pool.query(
        'UPDATE strategic_benefits SET display_order = $1 WHERE id = $2 AND use_case = $3',
        [i + 1, orderedIds[i], use_case]
      );
    }
  }
};

// Leads queries
const leadsQueries = {
  create: async (leadData) => {
    const {
      email, first_name, last_name, company_name, phone,
      company_type, use_case, roi_model, fte_cost, backfill_rate_type,
      monthly_documents, annual_backfill,
      m_and_a_transactions_per_year, avg_households_per_transaction, historical_households_to_migrate,
      annual_new_clients, annual_investors_onboarded,
      monthly_hours_saved, annual_savings, backfill_cost_saved, ftes_avoided,
      strategic_benefits,
      utm_source, utm_medium, utm_campaign, ip_address, user_agent, referrer
    } = leadData;

    const result = await pool.query(
      `INSERT INTO leads (
        email, first_name, last_name, company_name, phone,
        company_type, use_case, roi_model, fte_cost, backfill_rate_type,
        monthly_documents, annual_backfill,
        m_and_a_transactions_per_year, avg_households_per_transaction, historical_households_to_migrate,
        annual_new_clients, annual_investors_onboarded,
        monthly_hours_saved, annual_savings, backfill_cost_saved, ftes_avoided,
        strategic_benefits,
        utm_source, utm_medium, utm_campaign, ip_address, user_agent, referrer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        email, first_name, last_name, company_name, phone,
        company_type, use_case, roi_model, fte_cost, backfill_rate_type,
        monthly_documents, annual_backfill,
        m_and_a_transactions_per_year, avg_households_per_transaction, historical_households_to_migrate,
        annual_new_clients, annual_investors_onboarded,
        monthly_hours_saved, annual_savings, backfill_cost_saved, ftes_avoided,
        JSON.stringify(strategic_benefits),
        utm_source, utm_medium, utm_campaign, ip_address, user_agent, referrer
      ]
    );
    return result.rows[0];
  },

  getAll: async (filters = {}) => {
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.company_type) {
      query += ` AND company_type = $${paramIndex++}`;
      params.push(filters.company_type);
    }

    if (filters.use_case) {
      query += ` AND use_case = $${paramIndex++}`;
      params.push(filters.use_case);
    }

    if (filters.search) {
      query += ` AND (email ILIKE $${paramIndex} OR company_name ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.from_date) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(filters.to_date);
    }

    // Sorting
    const sortColumn = filters.sort || 'created_at';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';
    const allowedColumns = ['created_at', 'email', 'company_name', 'status', 'annual_savings'];
    if (allowedColumns.includes(sortColumn)) {
      query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    // Pagination
    const limit = parseInt(filters.limit) || 50;
    const page = parseInt(filters.page) || 1;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM leads WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit and offset
    let countParamIndex = 1;

    if (filters.status) {
      countQuery += ` AND status = $${countParamIndex++}`;
    }
    if (filters.company_type) {
      countQuery += ` AND company_type = $${countParamIndex++}`;
    }
    if (filters.use_case) {
      countQuery += ` AND use_case = $${countParamIndex++}`;
    }
    if (filters.search) {
      countQuery += ` AND (email ILIKE $${countParamIndex} OR company_name ILIKE $${countParamIndex} OR first_name ILIKE $${countParamIndex} OR last_name ILIKE $${countParamIndex})`;
      countParamIndex++;
    }
    if (filters.from_date) {
      countQuery += ` AND created_at >= $${countParamIndex++}`;
    }
    if (filters.to_date) {
      countQuery += ` AND created_at <= $${countParamIndex++}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      leads: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  },

  getById: async (id) => {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return result.rows[0];
  },

  update: async (id, updates) => {
    const { status, notes } = updates;

    let query = 'UPDATE leads SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    let paramIndex = 1;

    if (status !== undefined) {
      query += `, status = $${paramIndex++}`;
      params.push(status);

      // Track when contacted/qualified
      if (status === 'contacted') {
        query += ', contacted_at = CURRENT_TIMESTAMP';
      }
    }

    if (notes !== undefined) {
      query += `, notes = $${paramIndex++}`;
      params.push(notes);
    }

    query += ` WHERE id = $${paramIndex++} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);
    return result.rows[0];
  },

  delete: async (id) => {
    await pool.query('DELETE FROM leads WHERE id = $1', [id]);
  },

  getStats: async () => {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'new') as new_leads,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as this_month
      FROM leads
    `);

    const byCompanyType = await pool.query(`
      SELECT company_type, COUNT(*) as count
      FROM leads
      WHERE company_type IS NOT NULL
      GROUP BY company_type
    `);

    const byUseCase = await pool.query(`
      SELECT use_case, COUNT(*) as count
      FROM leads
      WHERE use_case IS NOT NULL
      GROUP BY use_case
    `);

    return {
      ...result.rows[0],
      by_company_type: byCompanyType.rows.reduce((acc, row) => {
        acc[row.company_type] = parseInt(row.count);
        return acc;
      }, {}),
      by_use_case: byUseCase.rows.reduce((acc, row) => {
        acc[row.use_case] = parseInt(row.count);
        return acc;
      }, {})
    };
  },

  exportCSV: async (filters = {}) => {
    let query = `
      SELECT
        email, first_name, last_name, company_name, phone,
        company_type, use_case, roi_model,
        monthly_hours_saved, annual_savings, backfill_cost_saved, ftes_avoided,
        status, created_at, contacted_at, notes
      FROM leads WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.from_date) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(filters.to_date);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }
};

// Admin users queries
const adminQueries = {
  findByEmail: async (email) => {
    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    return result.rows[0];
  },

  create: async (email, passwordHash) => {
    const result = await pool.query(
      'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, passwordHash]
    );
    return result.rows[0];
  }
};

module.exports = {
  pool,
  initializeDatabase,
  roiDefaultsQueries,
  strategicBenefitsQueries,
  leadsQueries,
  adminQueries
};
