// ROI Calculator Frontend Logic

// State
let currentStep = 1;
const totalSteps = 4;
let formData = {
  company_type: '',
  use_case: '',
  roi_model: 'time_savings', // Default, hidden from user
  fte_cost: 85000,
  backfill_rate_type: 'staff', // Default, hidden from user
  // Business inputs (varies by use case)
  monthly_documents: 0,
  annual_backfill: 0,
  m_and_a_transactions_per_year: 0,
  avg_households_per_transaction: 0,
  historical_households_to_migrate: 0, // Auto-calculated for M&A
  annual_new_clients: 0,
  annual_investors_onboarded: 0,
  // Contact info
  email: '',
  first_name: '',
  last_name: '',
  company_name: '',
  phone: ''
};
let results = null;

// Use case configurations
const USE_CASES_BY_COMPANY = {
  wealth_management: [
    { value: 'critical_business_process', label: 'Critical Business Process', description: 'Billing systems, fee schedule data, compliance monitoring' },
    { value: 'm_and_a_transitions', label: 'M&A Transitions', description: 'Integrating acquired firms and migrating client data' },
    { value: 'prospects_onboarding', label: 'Prospects & Onboarding', description: 'Converting prospects and onboarding new clients' }
  ],
  private_markets_platform: [
    { value: 'new_investor_onboarding', label: 'New Investor Onboarding', description: 'Onboarding investors and processing subscription documents' },
    { value: 'critical_business_process', label: 'Critical Business Process', description: 'Fund administration, capital calls, distributions' }
  ],
  point_solutions_b2b: [
    { value: 'critical_business_process', label: 'Critical Business Process', description: 'Client data ingestion, document processing workflows' },
    { value: 'prospects_onboarding', label: 'Prospects & Onboarding', description: 'Converting prospects and onboarding new customers' }
  ]
};

// Simplified business inputs - removed historical_households_to_migrate (auto-calculated)
const BUSINESS_INPUTS_BY_USE_CASE = {
  critical_business_process: [
    { name: 'monthly_documents', label: 'Monthly Documents Processed', help: 'Average number of documents processed per month', placeholder: '500' },
    { name: 'annual_backfill', label: 'One-Time Backfill Documents', help: 'Historical documents to process (one-time)', placeholder: '5000' }
  ],
  m_and_a_transitions: [
    { name: 'm_and_a_transactions_per_year', label: 'M&A Transactions per Year', help: 'Number of acquisitions or mergers annually', placeholder: '3' },
    { name: 'avg_households_per_transaction', label: 'Avg Households per Transaction', help: 'Average number of client households per acquisition', placeholder: '200' }
  ],
  prospects_onboarding: [
    { name: 'annual_new_clients', label: 'Annual New Clients', help: 'Number of new clients onboarded per year', placeholder: '100' },
    { name: 'annual_backfill', label: 'One-Time Backfill Documents', help: 'Historical documents to process for existing clients', placeholder: '2000' }
  ],
  new_investor_onboarding: [
    { name: 'annual_investors_onboarded', label: 'Annual Investors Onboarded', help: 'Number of new investors onboarded per year', placeholder: '500' },
    { name: 'annual_backfill', label: 'One-Time Backfill Documents', help: 'Historical subscription docs to process', placeholder: '1000' }
  ]
};

// DOM Elements
const steps = document.querySelectorAll('.step');
const formSteps = document.querySelectorAll('.form-step');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const recalcBtn = document.getElementById('recalc-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateNavigation();

  // Parse UTM parameters
  const urlParams = new URLSearchParams(window.location.search);
  formData.utm_source = urlParams.get('utm_source') || '';
  formData.utm_medium = urlParams.get('utm_medium') || '';
  formData.utm_campaign = urlParams.get('utm_campaign') || '';
});

function setupEventListeners() {
  // Navigation
  prevBtn.addEventListener('click', goToPrevStep);
  nextBtn.addEventListener('click', goToNextStep);
  submitBtn.addEventListener('click', submitForm);
  exportPdfBtn.addEventListener('click', exportPDF);

  // Recalculate button
  if (recalcBtn) {
    recalcBtn.addEventListener('click', recalculateWithNewFteCost);
  }

  // FTE cost adjustment input
  const adjustFteCost = document.getElementById('adjust-fte-cost');
  if (adjustFteCost) {
    adjustFteCost.addEventListener('input', (e) => {
      const value = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = value ? formatNumber(parseInt(value)) : '';
    });
  }

  // Step 1: Company Type cards
  document.querySelectorAll('#step-1 .selection-card').forEach(card => {
    card.addEventListener('click', () => selectCompanyType(card.dataset.value));
  });
}

function selectCompanyType(value) {
  formData.company_type = value;

  // Update card selection visual
  document.querySelectorAll('#step-1 .selection-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.value === value);
  });

  // Populate use case cards for next step
  populateUseCaseCards();
  updateNavigation();
}

function populateUseCaseCards() {
  const container = document.getElementById('use-case-cards');
  const useCases = USE_CASES_BY_COMPANY[formData.company_type] || [];

  container.innerHTML = useCases.map(uc => `
    <div class="selection-card" data-value="${uc.value}">
      <h3>${uc.label}</h3>
      <p>${uc.description}</p>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.selection-card').forEach(card => {
    card.addEventListener('click', () => selectUseCase(card.dataset.value));
  });
}

function selectUseCase(value) {
  formData.use_case = value;

  // Update card selection visual
  document.querySelectorAll('#step-2 .selection-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.value === value);
  });

  // Populate business inputs for step 3
  populateBusinessInputs();

  updateNavigation();
}

function populateBusinessInputs() {
  const container = document.getElementById('business-inputs');
  const inputs = BUSINESS_INPUTS_BY_USE_CASE[formData.use_case] || [];

  // Update the description based on use case
  const description = document.getElementById('inputs-description');
  if (formData.use_case === 'm_and_a_transitions') {
    description.textContent = 'Tell us about your M&A activity';
  } else if (formData.use_case === 'new_investor_onboarding') {
    description.textContent = 'Tell us about your investor volume';
  } else if (formData.use_case === 'prospects_onboarding') {
    description.textContent = 'Tell us about your client volume';
  } else {
    description.textContent = 'Enter your document volumes';
  }

  container.innerHTML = inputs.map(input => `
    <div class="input-group">
      <label for="${input.name}">${input.label}</label>
      <input type="text" id="${input.name}" name="${input.name}" placeholder="${input.placeholder}" inputmode="numeric">
      <p class="help-text">${input.help}</p>
    </div>
  `).join('');

  // Add input handlers
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const value = e.target.value.replace(/[^0-9]/g, '');
      formData[input.name] = parseInt(value) || 0;
      e.target.value = value ? formatNumber(parseInt(value)) : '';
      updateNavigation();
    });
  });
}

function goToPrevStep() {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
  }
}

function goToNextStep() {
  if (currentStep < totalSteps && validateCurrentStep()) {
    currentStep++;
    updateStepDisplay();
  }
}

function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      return !!formData.company_type;
    case 2:
      return !!formData.use_case;
    case 3:
      return hasBusinessInputs();
    default:
      return true;
  }
}

function hasBusinessInputs() {
  const inputs = BUSINESS_INPUTS_BY_USE_CASE[formData.use_case] || [];
  // At least one required input should have a value
  return inputs.some(input => formData[input.name] > 0);
}

function updateStepDisplay() {
  // Update step indicators
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');
    if (stepNum === currentStep) {
      step.classList.add('active');
    } else if (stepNum < currentStep) {
      step.classList.add('completed');
    }
  });

  // Update form steps
  formSteps.forEach((formStep, index) => {
    formStep.classList.toggle('active', index + 1 === currentStep);
  });

  updateNavigation();
}

function updateNavigation() {
  // Show/hide prev button
  prevBtn.style.display = currentStep > 1 && currentStep < 4 ? 'block' : 'none';

  // Show/hide next button
  nextBtn.style.display = currentStep < 4 ? 'block' : 'none';
  nextBtn.disabled = !validateCurrentStep();

  // Hide nav buttons on results step
  const navButtons = document.querySelector('.nav-buttons');
  navButtons.style.display = currentStep === 4 ? 'none' : 'flex';
}

// Auto-calculate historical households for M&A
function calculateHistoricalHouseholds() {
  if (formData.use_case === 'm_and_a_transitions') {
    // annual transactions × 3 years × avg households
    formData.historical_households_to_migrate =
      formData.m_and_a_transactions_per_year * 3 * formData.avg_households_per_transaction;
  }
}

async function submitForm() {
  const email = document.getElementById('email').value;
  if (!email) {
    alert('Please enter your email address');
    return;
  }

  // Collect contact info
  formData.email = email;
  formData.first_name = document.getElementById('first_name').value;
  formData.last_name = document.getElementById('last_name').value;
  formData.company_name = document.getElementById('company_name').value;
  formData.phone = document.getElementById('phone').value;

  // Auto-calculate historical households for M&A
  calculateHistoricalHouseholds();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Calculating...';

  try {
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      results = data.results;
      displayResults();
    } else {
      alert(data.error || 'Failed to calculate ROI');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'View My Results';
  }
}

function displayResults() {
  // Hide email capture, show results
  document.getElementById('email-capture').style.display = 'none';
  document.getElementById('results-section').style.display = 'block';

  // Populate results (no backfill dollar amounts shown)
  document.getElementById('result-annual-savings').textContent = formatCurrency(results.annual_savings);
  document.getElementById('result-ftes').textContent = results.ftes_avoided.toFixed(1);
  document.getElementById('result-monthly-hours').textContent = formatNumber(Math.round(results.monthly_hours_saved));
  document.getElementById('result-annual-hours').textContent = formatNumber(Math.round(results.monthly_hours_saved * 12));

  // Show/hide consultant note for M&A
  const consultantNote = document.getElementById('consultant-note');
  if (consultantNote) {
    consultantNote.style.display = formData.use_case === 'm_and_a_transitions' ? 'block' : 'none';
  }

  // Populate strategic benefits
  const benefitsList = document.getElementById('strategic-benefits-list');
  benefitsList.innerHTML = results.strategic_benefits.map(benefit => `<li>${benefit}</li>`).join('');

  // Set the FTE cost in the adjustment field
  const adjustFteCost = document.getElementById('adjust-fte-cost');
  if (adjustFteCost) {
    adjustFteCost.value = formatNumber(formData.fte_cost);
  }

  // Update step indicator to show completion
  steps.forEach(step => step.classList.add('completed'));
}

async function recalculateWithNewFteCost() {
  const adjustFteCost = document.getElementById('adjust-fte-cost');
  const newFteCost = parseInt(adjustFteCost.value.replace(/[^0-9]/g, '')) || 85000;

  formData.fte_cost = newFteCost;
  formData.roi_model = 'fte_avoidance'; // Switch to FTE model when they adjust

  recalcBtn.disabled = true;
  recalcBtn.textContent = 'Calculating...';

  try {
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      results = data.results;
      // Update display
      document.getElementById('result-annual-savings').textContent = formatCurrency(results.annual_savings);
      document.getElementById('result-ftes').textContent = results.ftes_avoided.toFixed(1);
      document.getElementById('result-monthly-hours').textContent = formatNumber(Math.round(results.monthly_hours_saved));
      document.getElementById('result-annual-hours').textContent = formatNumber(Math.round(results.monthly_hours_saved * 12));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to recalculate. Please try again.');
  } finally {
    recalcBtn.disabled = false;
    recalcBtn.textContent = 'Recalculate';
  }
}

async function exportPDF() {
  exportPdfBtn.disabled = true;
  exportPdfBtn.textContent = 'Generating...';

  try {
    const { jsPDF } = window.jspdf;

    // Create PDF content container
    const pdfContent = document.createElement('div');
    pdfContent.style.cssText = `
      width: 612px;
      padding: 40px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const companyName = formData.company_name || 'Your Company';
    const useCaseLabel = results.use_case_label || '';

    pdfContent.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #08016A; padding-bottom: 20px; margin-bottom: 30px;">
        <div style="font-size: 24px; font-weight: bold; color: #08016A; margin-bottom: 8px;">LEA</div>
        <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">ROI Analysis</div>
        <div style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin-top: 12px;">${companyName}</div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">${useCaseLabel}</div>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <div style="flex: 1; background: linear-gradient(135deg, #0088BB, #006991); border-radius: 10px; padding: 24px; text-align: center; color: white;">
          <div style="font-size: 10px; text-transform: uppercase; opacity: 0.9; margin-bottom: 8px;">Annual Cost Savings</div>
          <div style="font-size: 28px; font-weight: 700;">${formatCurrency(results.annual_savings)}</div>
        </div>
        <div style="flex: 1; background: linear-gradient(135deg, #0088BB, #006991); border-radius: 10px; padding: 24px; text-align: center; color: white;">
          <div style="font-size: 10px; text-transform: uppercase; opacity: 0.9; margin-bottom: 8px;">FTEs Worth of Capacity</div>
          <div style="font-size: 28px; font-weight: 700;">${results.ftes_avoided.toFixed(1)}</div>
        </div>
      </div>

      <div style="background: #f7fafc; border-radius: 10px; padding: 24px; margin-bottom: 30px;">
        <div style="font-size: 14px; font-weight: 600; color: #08016A; margin-bottom: 16px;">Savings Breakdown</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #666;">Monthly Hours Saved</span>
            <span style="font-weight: 600; color: #08016A;">${formatNumber(Math.round(results.monthly_hours_saved))}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #666;">Annual Hours Saved</span>
            <span style="font-weight: 600; color: #08016A;">${formatNumber(Math.round(results.monthly_hours_saved * 12))}</span>
          </div>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #e6f5f9, #f0fdf4); border: 1px solid rgba(0, 136, 187, 0.2); border-radius: 10px; padding: 24px; margin-bottom: 30px;">
        <div style="font-size: 14px; font-weight: 600; color: #08016A; margin-bottom: 16px;">Strategic Value</div>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${results.strategic_benefits.map(b => `
            <li style="padding: 8px 0; padding-left: 20px; position: relative; color: #1a1a1a;">
              <span style="position: absolute; left: 0; color: #0088BB; font-size: 18px;">•</span>
              ${b}
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="text-align: center; padding: 20px; background: #08016A; border-radius: 10px; color: white;">
        <div style="font-size: 14px; margin-bottom: 8px;">Want to see it in action?</div>
        <div style="font-size: 12px; opacity: 0.9;">Schedule a demo to discuss your use case</div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">www.getlea.io</div>
      </div>
    `;

    // Append to document temporarily
    document.body.appendChild(pdfContent);

    // Generate canvas
    const canvas = await html2canvas(pdfContent, {
      scale: 2,
      backgroundColor: '#ffffff',
      width: 612,
      height: 792
    });

    // Remove temp element
    document.body.removeChild(pdfContent);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 612, 792);

    // Download
    const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '-');
    pdf.save(`${safeCompanyName}-ROI-Analysis.pdf`);

  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    exportPdfBtn.disabled = false;
    exportPdfBtn.textContent = 'Export PDF';
  }
}

// Utility functions
function formatCurrency(value) {
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
