# Webflow Integration Guide

## Overview

The LEA Capacity Calculator requires **one API call** to calculate results and capture the lead.

**API Endpoint:** `https://myroi.getlea.io/api/calculate`
**Method:** POST
**Content-Type:** application/json

---

## The Flow

```
[Webflow Form] → POST /api/calculate → [Show Results]
```

1. User fills out multi-step form in Webflow
2. On submit, POST all data to the API
3. API returns results (FTEs, hours saved, etc.)
4. Display results in Webflow

---

## API Request

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | User's email (required) |
| `use_case` | string | One of the use case values below |

### Use Cases

| Value | Label |
|-------|-------|
| `critical_business_process` | Critical Business Process |
| `m_and_a_transitions` | M&A Transitions |
| `prospects_onboarding` | Prospects & Onboarding |
| `new_investor_onboarding` | New Investor Onboarding |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `company_type` | string | `wealth_management`, `private_markets_platform`, or `point_solutions_b2b` |
| `first_name` | string | User's first name |
| `last_name` | string | User's last name |
| `company_name` | string | User's company |
| `phone` | string | User's phone |
| `utm_source` | string | UTM source parameter |
| `utm_medium` | string | UTM medium parameter |
| `utm_campaign` | string | UTM campaign parameter |

### Business Inputs (by use case)

**Critical Business Process:**
| Field | Type | Description |
|-------|------|-------------|
| `monthly_documents` | number | Documents processed per month |
| `annual_backfill` | number | One-time historical documents |

**M&A Transitions:**
| Field | Type | Description |
|-------|------|-------------|
| `m_and_a_transactions_per_year` | number | Acquisitions per year |
| `avg_households_per_transaction` | number | Households per acquisition |

**Prospects & Onboarding:**
| Field | Type | Description |
|-------|------|-------------|
| `annual_new_clients` | number | New clients per year |
| `annual_backfill` | number | One-time historical documents |

**New Investor Onboarding:**
| Field | Type | Description |
|-------|------|-------------|
| `annual_investors_onboarded` | number | New investors per year |
| `annual_backfill` | number | One-time historical documents |

---

## API Response

```json
{
  "success": true,
  "results": {
    "ftes_avoided": 1.8,
    "monthly_hours_saved": 312.5,
    "backfill_cost_saved": 25000,
    "strategic_benefits": [
      "Benefit 1",
      "Benefit 2",
      "Benefit 3"
    ],
    "use_case_label": "Critical Business Process",
    "company_type_label": "Wealth Management Firm"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `ftes_avoided` | number | **Primary metric** - FTEs worth of capacity |
| `monthly_hours_saved` | number | Hours saved per month |
| `backfill_cost_saved` | number | One-time savings (at $50/hr) |
| `strategic_benefits` | array | List of strategic benefits to display |
| `use_case_label` | string | Human-readable use case name |
| `company_type_label` | string | Human-readable company type name |

---

## Example Request

```javascript
// Example: Critical Business Process
const response = await fetch('https://myroi.getlea.io/api/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // Required
    email: 'user@company.com',
    use_case: 'critical_business_process',

    // Business inputs
    monthly_documents: 500,
    annual_backfill: 5000,

    // Optional contact info
    first_name: 'John',
    last_name: 'Smith',
    company_name: 'Acme Wealth',
    phone: '555-123-4567',
    company_type: 'wealth_management',

    // Optional UTM tracking
    utm_source: 'linkedin',
    utm_medium: 'paid',
    utm_campaign: 'q1-2025'
  })
});

const data = await response.json();

if (data.success) {
  // Display results
  console.log(`${data.results.ftes_avoided} FTEs worth of capacity`);
  console.log(`${data.results.monthly_hours_saved} hours saved per month`);
}
```

---

## Webflow Implementation

### Option 1: Custom Code in Webflow

Add this to your Webflow page's custom code (before </body>):

```html
<script>
document.getElementById('calculator-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    email: document.getElementById('email').value,
    use_case: document.getElementById('use_case').value,
    company_type: document.getElementById('company_type').value,
    first_name: document.getElementById('first_name').value,
    last_name: document.getElementById('last_name').value,
    company_name: document.getElementById('company_name').value,
    monthly_documents: parseInt(document.getElementById('monthly_documents').value) || 0,
    annual_backfill: parseInt(document.getElementById('annual_backfill').value) || 0,
    // Add UTM from URL
    utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
    utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
    utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || ''
  };

  try {
    const response = await fetch('https://myroi.getlea.io/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      // Hide form, show results
      document.getElementById('form-section').style.display = 'none';
      document.getElementById('results-section').style.display = 'block';

      // Populate results
      document.getElementById('result-ftes').textContent = data.results.ftes_avoided.toFixed(1);
      document.getElementById('result-hours').textContent = Math.round(data.results.monthly_hours_saved);

      // Populate benefits
      const benefitsList = document.getElementById('benefits-list');
      benefitsList.innerHTML = data.results.strategic_benefits
        .map(b => `<li>${b}</li>`)
        .join('');
    }
  } catch (error) {
    alert('Something went wrong. Please try again.');
  }
});
</script>
```

### Option 2: Use Webflow + Zapier/Make

1. Create Webflow form with all fields
2. Use Zapier/Make webhook to receive form submission
3. Have Zapier call the API and store results
4. Redirect user to a results page

---

## CORS

The API allows cross-origin requests, so you can call it directly from Webflow.

---

## Testing

Test the API with curl:

```bash
curl -X POST https://myroi.getlea.io/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "use_case": "critical_business_process",
    "monthly_documents": 500,
    "annual_backfill": 5000
  }'
```

---

## Strategic Benefits (Webflow CMS)

Strategic benefits should be managed in Webflow CMS rather than using the `strategic_benefits` array from the API response. This gives you full control over content and styling.

### Recommended CMS Structure

**Collection: "Strategic Benefits"**

| Field | Type | Description |
|-------|------|-------------|
| `name` | Plain Text | Benefit text |
| `use_case` | Option | `critical_business_process`, `m_and_a_transitions`, `prospects_onboarding`, `new_investor_onboarding` |
| `order` | Number | Display order (1, 2, 3...) |

### Displaying Benefits

1. Create a Collection List filtered by `use_case`
2. Initially hide all benefit lists
3. After API call, show the list matching the submitted `use_case`

```javascript
// After successful API call
const useCase = formData.use_case; // e.g., 'critical_business_process'

// Hide all benefit lists
document.querySelectorAll('[data-benefits-list]').forEach(el => el.style.display = 'none');

// Show the matching one
const matchingList = document.querySelector(`[data-benefits-list="${useCase}"]`);
if (matchingList) {
  matchingList.style.display = 'block';
}
```

### Alternative: Single List with Data Attributes

If you prefer one list, add the use_case as a data attribute on each item:

```html
<!-- In Webflow CMS Collection List -->
<li data-use-case="critical_business_process">Benefit text here</li>
```

```javascript
// Filter to show only matching benefits
document.querySelectorAll('[data-use-case]').forEach(el => {
  el.style.display = el.dataset.useCase === useCase ? 'list-item' : 'none';
});
```

---

## Questions?

Contact the development team for API support.
