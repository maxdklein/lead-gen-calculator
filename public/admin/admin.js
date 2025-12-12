// Lead Gen Admin Dashboard

// State
let currentPage = 1;
let totalPages = 1;
let currentSort = 'created_at';
let currentOrder = 'desc';
let currentLead = null;

// Label mappings
const COMPANY_TYPE_LABELS = {
  wealth_management: 'Wealth Management',
  private_markets_platform: 'Private Markets Platform',
  point_solutions_b2b: 'Point Solutions / B2B'
};

const USE_CASE_LABELS = {
  critical_business_process: 'Critical Business Process',
  m_and_a_transitions: 'M&A Transitions',
  prospects_onboarding: 'Prospects & Onboarding',
  new_investor_onboarding: 'New Investor Onboarding'
};

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  disqualified: 'Disqualified'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const authResponse = await fetch('/api/admin/auth/status');
  const authData = await authResponse.json();

  if (!authData.isAuthenticated) {
    window.location.href = '/admin/login.html';
    return;
  }

  setupEventListeners();
  loadStats();
  loadLeads();
});

function setupEventListeners() {
  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Filters
  document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; loadLeads(); });
  document.getElementById('filter-company-type').addEventListener('change', () => { currentPage = 1; loadLeads(); });
  document.getElementById('filter-use-case').addEventListener('change', () => { currentPage = 1; loadLeads(); });

  // Search with debounce
  let searchTimeout;
  document.getElementById('filter-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadLeads();
    }, 300);
  });

  // Export
  document.getElementById('export-btn').addEventListener('click', exportCSV);

  // Pagination
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadLeads();
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadLeads();
    }
  });

  // Sort headers
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sort = th.dataset.sort;
      if (currentSort === sort) {
        currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = sort;
        currentOrder = 'desc';
      }
      updateSortHeaders();
      loadLeads();
    });
  });

  // Modal
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveLead);
}

async function logout() {
  await fetch('/api/admin/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
}

async function loadStats() {
  try {
    const response = await fetch('/api/admin/stats');
    const stats = await response.json();

    document.getElementById('stat-total').textContent = stats.total_leads || 0;
    document.getElementById('stat-new').textContent = stats.new_leads || 0;
    document.getElementById('stat-week').textContent = stats.this_week || 0;
    document.getElementById('stat-month').textContent = stats.this_month || 0;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

async function loadLeads() {
  const tbody = document.getElementById('leads-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading leads...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 25,
      sort: currentSort,
      order: currentOrder
    });

    const status = document.getElementById('filter-status').value;
    const companyType = document.getElementById('filter-company-type').value;
    const useCase = document.getElementById('filter-use-case').value;
    const search = document.getElementById('filter-search').value;

    if (status) params.append('status', status);
    if (companyType) params.append('company_type', companyType);
    if (useCase) params.append('use_case', useCase);
    if (search) params.append('search', search);

    const response = await fetch(`/api/admin/leads?${params}`);
    const data = await response.json();

    totalPages = data.pages;
    renderLeads(data.leads);
    updatePagination(data);
  } catch (error) {
    console.error('Failed to load leads:', error);
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Failed to load leads</td></tr>';
  }
}

function renderLeads(leads) {
  const tbody = document.getElementById('leads-tbody');

  if (!leads || leads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">No leads found</td></tr>';
    return;
  }

  tbody.innerHTML = leads.map(lead => `
    <tr>
      <td>${formatDate(lead.created_at)}</td>
      <td>${escapeHtml(lead.email)}</td>
      <td>${escapeHtml(lead.company_name || '-')}</td>
      <td>${COMPANY_TYPE_LABELS[lead.company_type] || '-'}</td>
      <td>${USE_CASE_LABELS[lead.use_case] || '-'}</td>
      <td>${formatCurrency(lead.annual_savings)}</td>
      <td><span class="status-badge status-${lead.status}">${STATUS_LABELS[lead.status] || lead.status}</span></td>
      <td><button class="btn-view" onclick="viewLead(${lead.id})">View</button></td>
    </tr>
  `).join('');
}

function updatePagination(data) {
  document.getElementById('page-info').textContent = `Page ${data.page} of ${data.pages}`;
  document.getElementById('prev-page').disabled = data.page <= 1;
  document.getElementById('next-page').disabled = data.page >= data.pages;
}

function updateSortHeaders() {
  document.querySelectorAll('.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.sort === currentSort) {
      th.classList.add(currentOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });
}

async function viewLead(id) {
  try {
    const response = await fetch(`/api/admin/leads/${id}`);
    currentLead = await response.json();

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <div class="detail-section">
        <h3>Contact Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Email</span>
            <span class="detail-value">${escapeHtml(currentLead.email)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Phone</span>
            <span class="detail-value">${escapeHtml(currentLead.phone || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Name</span>
            <span class="detail-value">${escapeHtml([currentLead.first_name, currentLead.last_name].filter(Boolean).join(' ') || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Company</span>
            <span class="detail-value">${escapeHtml(currentLead.company_name || '-')}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Calculator Inputs</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Company Type</span>
            <span class="detail-value">${COMPANY_TYPE_LABELS[currentLead.company_type] || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Use Case</span>
            <span class="detail-value">${USE_CASE_LABELS[currentLead.use_case] || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">ROI Model</span>
            <span class="detail-value">${currentLead.roi_model === 'fte_avoidance' ? 'FTE Avoidance' : 'Time Savings'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Monthly Documents</span>
            <span class="detail-value">${formatNumber(currentLead.monthly_documents || 0)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Annual Backfill</span>
            <span class="detail-value">${formatNumber(currentLead.annual_backfill || 0)}</span>
          </div>
          ${currentLead.m_and_a_transactions_per_year ? `
          <div class="detail-item">
            <span class="detail-label">M&A Transactions/Year</span>
            <span class="detail-value">${currentLead.m_and_a_transactions_per_year}</span>
          </div>
          ` : ''}
          ${currentLead.avg_households_per_transaction ? `
          <div class="detail-item">
            <span class="detail-label">Households/Transaction</span>
            <span class="detail-value">${currentLead.avg_households_per_transaction}</span>
          </div>
          ` : ''}
          ${currentLead.annual_new_clients ? `
          <div class="detail-item">
            <span class="detail-label">Annual New Clients</span>
            <span class="detail-value">${currentLead.annual_new_clients}</span>
          </div>
          ` : ''}
          ${currentLead.annual_investors_onboarded ? `
          <div class="detail-item">
            <span class="detail-label">Annual Investors</span>
            <span class="detail-value">${currentLead.annual_investors_onboarded}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="detail-section">
        <h3>Calculated Results</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Monthly Hours Saved</span>
            <span class="detail-value">${formatNumber(Math.round(currentLead.monthly_hours_saved || 0))}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Annual Savings</span>
            <span class="detail-value">${formatCurrency(currentLead.annual_savings)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Backfill Savings</span>
            <span class="detail-value">${formatCurrency(currentLead.backfill_cost_saved)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">FTEs Avoided</span>
            <span class="detail-value">${(currentLead.ftes_avoided || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Lead Status</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Status</span>
            <select class="status-select" id="lead-status">
              <option value="new" ${currentLead.status === 'new' ? 'selected' : ''}>New</option>
              <option value="contacted" ${currentLead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
              <option value="qualified" ${currentLead.status === 'qualified' ? 'selected' : ''}>Qualified</option>
              <option value="converted" ${currentLead.status === 'converted' ? 'selected' : ''}>Converted</option>
              <option value="disqualified" ${currentLead.status === 'disqualified' ? 'selected' : ''}>Disqualified</option>
            </select>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created</span>
            <span class="detail-value">${formatDateTime(currentLead.created_at)}</span>
          </div>
          <div class="detail-item full-width">
            <span class="detail-label">Notes</span>
            <textarea class="notes-textarea" id="lead-notes" placeholder="Add notes about this lead...">${escapeHtml(currentLead.notes || '')}</textarea>
          </div>
        </div>
      </div>

      ${currentLead.utm_source || currentLead.utm_medium || currentLead.utm_campaign ? `
      <div class="detail-section">
        <h3>Tracking</h3>
        <div class="detail-grid">
          ${currentLead.utm_source ? `
          <div class="detail-item">
            <span class="detail-label">UTM Source</span>
            <span class="detail-value">${escapeHtml(currentLead.utm_source)}</span>
          </div>
          ` : ''}
          ${currentLead.utm_medium ? `
          <div class="detail-item">
            <span class="detail-label">UTM Medium</span>
            <span class="detail-value">${escapeHtml(currentLead.utm_medium)}</span>
          </div>
          ` : ''}
          ${currentLead.utm_campaign ? `
          <div class="detail-item">
            <span class="detail-label">UTM Campaign</span>
            <span class="detail-value">${escapeHtml(currentLead.utm_campaign)}</span>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}
    `;

    document.getElementById('modal-overlay').classList.add('active');
  } catch (error) {
    console.error('Failed to load lead:', error);
    alert('Failed to load lead details');
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  currentLead = null;
}

async function saveLead() {
  if (!currentLead) return;

  const status = document.getElementById('lead-status').value;
  const notes = document.getElementById('lead-notes').value;

  try {
    const response = await fetch(`/api/admin/leads/${currentLead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });

    if (response.ok) {
      closeModal();
      loadLeads();
      loadStats();
    } else {
      alert('Failed to save changes');
    }
  } catch (error) {
    console.error('Failed to save lead:', error);
    alert('Failed to save changes');
  }
}

async function exportCSV() {
  const params = new URLSearchParams();

  const status = document.getElementById('filter-status').value;
  if (status) params.append('status', status);

  window.location.href = `/api/admin/leads/export?${params}`;
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatCurrency(value) {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make viewLead available globally
window.viewLead = viewLead;
