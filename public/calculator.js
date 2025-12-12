// Capacity Calculator Frontend Logic

// State
let currentStep = 1;
const totalSteps = 4;
let formData = {
  company_type: '',
  use_case: '',
  roi_model: 'time_savings',
  fte_cost: 85000,
  backfill_rate_type: 'staff',
  // Business inputs
  monthly_documents: 0,
  annual_backfill: 0,
  m_and_a_transactions_per_year: 0,
  avg_households_per_transaction: 0,
  historical_households_to_migrate: 0,
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
  prevBtn.addEventListener('click', goToPrevStep);
  nextBtn.addEventListener('click', goToNextStep);
  submitBtn.addEventListener('click', submitForm);
  exportPdfBtn.addEventListener('click', exportPDF);

  // Step 1: Company Type cards
  document.querySelectorAll('#step-1 .selection-card').forEach(card => {
    card.addEventListener('click', () => selectCompanyType(card.dataset.value));
  });
}

function selectCompanyType(value) {
  formData.company_type = value;

  document.querySelectorAll('#step-1 .selection-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.value === value);
  });

  populateUseCaseCards();
  updateNavigation();
}

function populateUseCaseCards() {
  const container = document.getElementById('use-case-cards');
  const useCases = USE_CASES_BY_COMPANY[formData.company_type] || [];

  container.innerHTML = useCases.map(uc => `
    <div class="selection-card border-2 border-gray-200 rounded-xl p-5 cursor-pointer hover:border-lea-teal hover:bg-blue-50/30 transition-all" data-value="${uc.value}">
      <h3 class="font-semibold text-gray-800 mb-1">${uc.label}</h3>
      <p class="text-sm text-gray-500">${uc.description}</p>
    </div>
  `).join('');

  container.querySelectorAll('.selection-card').forEach(card => {
    card.addEventListener('click', () => selectUseCase(card.dataset.value));
  });
}

function selectUseCase(value) {
  formData.use_case = value;

  document.querySelectorAll('#step-2 .selection-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.value === value);
  });

  populateBusinessInputs();
  updateNavigation();
}

function populateBusinessInputs() {
  const container = document.getElementById('business-inputs');
  const inputs = BUSINESS_INPUTS_BY_USE_CASE[formData.use_case] || [];

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
    <div>
      <label for="${input.name}" class="block text-sm font-medium text-gray-700 mb-1">${input.label}</label>
      <input type="text" id="${input.name}" name="${input.name}" placeholder="${input.placeholder}" inputmode="numeric"
        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-lea-teal focus:outline-none transition-colors">
      <p class="text-sm text-gray-400 mt-1">${input.help}</p>
    </div>
  `).join('');

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
  return inputs.some(input => formData[input.name] > 0);
}

function updateStepDisplay() {
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');
    if (stepNum === currentStep) {
      step.classList.add('active');
    } else if (stepNum < currentStep) {
      step.classList.add('completed');
    }
  });

  formSteps.forEach((formStep, index) => {
    formStep.classList.toggle('active', index + 1 === currentStep);
  });

  updateNavigation();
}

function updateNavigation() {
  // Show/hide prev button
  if (currentStep > 1 && currentStep < 4) {
    prevBtn.classList.remove('hidden');
  } else {
    prevBtn.classList.add('hidden');
  }

  // Show/hide next button
  if (currentStep < 4) {
    nextBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.add('hidden');
  }
  nextBtn.disabled = !validateCurrentStep();

  // Hide nav buttons on results step
  const navButtons = document.querySelector('.nav-buttons');
  navButtons.style.display = currentStep === 4 ? 'none' : 'flex';
}

// Auto-calculate historical households for M&A
function calculateHistoricalHouseholds() {
  if (formData.use_case === 'm_and_a_transitions') {
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

  formData.email = email;
  formData.first_name = document.getElementById('first_name').value;
  formData.last_name = document.getElementById('last_name').value;
  formData.company_name = document.getElementById('company_name').value;
  formData.phone = document.getElementById('phone').value;

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
      alert(data.error || 'Failed to calculate');
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
  document.getElementById('email-capture').classList.add('hidden');
  document.getElementById('results-section').classList.remove('hidden');

  // Primary metric: FTEs
  document.getElementById('result-ftes').textContent = results.ftes_avoided.toFixed(1);

  // Hours breakdown
  document.getElementById('result-monthly-hours').textContent = formatNumber(Math.round(results.monthly_hours_saved));
  document.getElementById('result-annual-hours').textContent = formatNumber(Math.round(results.monthly_hours_saved * 12));

  // Backfill section - only show if there's backfill savings
  const backfillSection = document.getElementById('backfill-section');
  if (results.backfill_cost_saved > 0) {
    backfillSection.classList.remove('hidden');
    document.getElementById('result-backfill-savings').textContent = formatCurrency(results.backfill_cost_saved);
  } else {
    backfillSection.classList.add('hidden');
  }

  // Strategic benefits
  const benefitsList = document.getElementById('strategic-benefits-list');
  benefitsList.innerHTML = results.strategic_benefits.map(benefit =>
    `<li class="flex items-start gap-2">
      <span class="text-lea-teal mt-1">•</span>
      <span class="text-gray-700">${benefit}</span>
    </li>`
  ).join('');

  // Mark all steps complete
  steps.forEach(step => step.classList.add('completed'));
}

async function exportPDF() {
  exportPdfBtn.disabled = true;
  exportPdfBtn.textContent = 'Generating...';

  try {
    const { jsPDF } = window.jspdf;

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
        <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Capacity Analysis</div>
        <div style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin-top: 12px;">${companyName}</div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">${useCaseLabel}</div>
      </div>

      <div style="background: linear-gradient(135deg, #0088BB, #006991); border-radius: 12px; padding: 32px; text-align: center; color: white; margin-bottom: 24px;">
        <div style="font-size: 48px; font-weight: 700; margin-bottom: 8px;">${results.ftes_avoided.toFixed(1)}</div>
        <div style="font-size: 16px; opacity: 0.9;">FTEs worth of capacity</div>
        <div style="font-size: 12px; opacity: 0.75; margin-top: 4px;">gained without adding headcount</div>
      </div>

      <div style="background: #f7fafc; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #08016A; margin-bottom: 12px;">How We Calculated This</div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
          <span style="color: #666;">Monthly Hours Saved</span>
          <span style="font-weight: 600; color: #08016A;">${formatNumber(Math.round(results.monthly_hours_saved))}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #666;">Annual Hours Saved</span>
          <span style="font-weight: 600; color: #08016A;">${formatNumber(Math.round(results.monthly_hours_saved * 12))}</span>
        </div>
      </div>

      ${results.backfill_cost_saved > 0 ? `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #92400e; margin-bottom: 8px;">One-Time Backfill Savings</div>
        <div style="font-size: 24px; font-weight: 700; color: #d97706;">${formatCurrency(results.backfill_cost_saved)}</div>
        <div style="font-size: 12px; color: #666; margin-top: 8px;">Savings could be higher if using external consultants or resources.</div>
      </div>
      ` : ''}

      <div style="background: linear-gradient(135deg, #eff6ff, #f0fdf4); border: 1px solid #bfdbfe; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #08016A; margin-bottom: 12px;">Strategic Value</div>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${results.strategic_benefits.map(b => `
            <li style="padding: 6px 0; padding-left: 16px; position: relative; color: #374151;">
              <span style="position: absolute; left: 0; color: #0088BB;">•</span>
              ${b}
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="text-align: center; padding: 20px; background: #08016A; border-radius: 10px; color: white;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Want to see it in action?</div>
        <div style="font-size: 12px; opacity: 0.8;">Schedule a demo to discuss your use case</div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">www.getlea.io</div>
      </div>
    `;

    document.body.appendChild(pdfContent);

    const canvas = await html2canvas(pdfContent, {
      scale: 2,
      backgroundColor: '#ffffff',
      width: 612,
      height: 792
    });

    document.body.removeChild(pdfContent);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 612, 792);

    const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '-');
    pdf.save(`${safeCompanyName}-Capacity-Analysis.pdf`);

  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    exportPdfBtn.disabled = false;
    exportPdfBtn.textContent = 'Export PDF';
  }
}

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
