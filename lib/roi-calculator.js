/**
 * ROI Calculator
 *
 * Calculates ROI metrics based on use case and business inputs.
 * Mirrors the pricing calculator architecture.
 *
 * Supports two ROI models:
 * - time_savings: Calculates value based on hourly rate × hours saved
 * - fte_avoidance: Calculates value based on FTE cost × FTEs avoided
 *
 * Supports two backfill rate types:
 * - staff: Uses analyst hourly rate ($50/hr default)
 * - consultant: Uses consultant hourly rate ($150/hr default)
 */

const USE_CASES = {
  CRITICAL_BUSINESS_PROCESS: 'critical_business_process',
  M_AND_A_TRANSITIONS: 'm_and_a_transitions',
  PROSPECTS_ONBOARDING: 'prospects_onboarding',
  NEW_INVESTOR_ONBOARDING: 'new_investor_onboarding'
};

const USE_CASE_LABELS = {
  [USE_CASES.CRITICAL_BUSINESS_PROCESS]: 'Critical Business Process',
  [USE_CASES.M_AND_A_TRANSITIONS]: 'M&A Transitions',
  [USE_CASES.PROSPECTS_ONBOARDING]: 'Prospects & Onboarding',
  [USE_CASES.NEW_INVESTOR_ONBOARDING]: 'New Investor Onboarding'
};

const COMPANY_TYPES = {
  WEALTH_MANAGEMENT: 'wealth_management',
  PRIVATE_MARKETS_PLATFORM: 'private_markets_platform',
  POINT_SOLUTIONS_B2B: 'point_solutions_b2b'
};

const COMPANY_TYPE_LABELS = {
  [COMPANY_TYPES.WEALTH_MANAGEMENT]: 'Wealth Management Firm',
  [COMPANY_TYPES.PRIVATE_MARKETS_PLATFORM]: 'Private Markets Platform',
  [COMPANY_TYPES.POINT_SOLUTIONS_B2B]: 'Point Solutions / B2B'
};

const ROI_MODELS = {
  TIME_SAVINGS: 'time_savings',
  FTE_AVOIDANCE: 'fte_avoidance'
};

const BACKFILL_RATE_TYPES = {
  STAFF: 'staff',
  CONSULTANT: 'consultant'
};

const DEFAULT_SYSTEMS = {
  [USE_CASES.CRITICAL_BUSINESS_PROCESS]: 2,
  [USE_CASES.M_AND_A_TRANSITIONS]: 3,
  [USE_CASES.PROSPECTS_ONBOARDING]: 2,
  [USE_CASES.NEW_INVESTOR_ONBOARDING]: 2
};

// Default ROI model by use case
const DEFAULT_ROI_MODEL = {
  [USE_CASES.CRITICAL_BUSINESS_PROCESS]: ROI_MODELS.TIME_SAVINGS,
  [USE_CASES.M_AND_A_TRANSITIONS]: ROI_MODELS.TIME_SAVINGS,
  [USE_CASES.PROSPECTS_ONBOARDING]: ROI_MODELS.FTE_AVOIDANCE,
  [USE_CASES.NEW_INVESTOR_ONBOARDING]: ROI_MODELS.FTE_AVOIDANCE
};

// Default backfill rate type by use case
const DEFAULT_BACKFILL_RATE_TYPE = {
  [USE_CASES.CRITICAL_BUSINESS_PROCESS]: BACKFILL_RATE_TYPES.STAFF,
  [USE_CASES.M_AND_A_TRANSITIONS]: BACKFILL_RATE_TYPES.CONSULTANT,
  [USE_CASES.PROSPECTS_ONBOARDING]: BACKFILL_RATE_TYPES.STAFF,
  [USE_CASES.NEW_INVESTOR_ONBOARDING]: BACKFILL_RATE_TYPES.STAFF
};

const DEFAULT_FTE_COST = 85000;

/**
 * Merge proposal ROI config with system defaults
 * Proposal values override defaults when not null
 */
function mergeRoiConfig(defaults, proposalConfig) {
  if (!proposalConfig) {
    return { ...defaults };
  }

  return {
    triage_time_per_doc: proposalConfig.triage_time_per_doc ?? defaults.triage_time_per_doc,
    data_entry_time_per_doc: proposalConfig.data_entry_time_per_doc ?? defaults.data_entry_time_per_doc,
    analyst_hourly_rate: parseFloat(proposalConfig.analyst_hourly_rate) || parseFloat(defaults.analyst_hourly_rate),
    backfill_hourly_rate: parseFloat(proposalConfig.backfill_hourly_rate) || parseFloat(defaults.backfill_hourly_rate),
    docs_per_household: proposalConfig.docs_per_household ?? defaults.docs_per_household,
    docs_per_client: proposalConfig.docs_per_client ?? defaults.docs_per_client,
    docs_per_investor: proposalConfig.docs_per_investor ?? defaults.docs_per_investor,
    data_utilization_baseline: proposalConfig.data_utilization_baseline ?? defaults.data_utilization_baseline,
    roi_notes: proposalConfig.roi_notes || null
  };
}

/**
 * Derive document counts from business inputs based on use case
 * Returns { monthlyDocuments, annualBackfill } for pricing integration
 *
 * Note: annual_backfill is now available for ALL use cases as a direct input field.
 * Use-case-specific derivation only applies to monthly documents.
 */
function deriveDocumentCounts(proposal, roiConfig) {
  const useCase = proposal.use_case;

  // Annual backfill is always available as direct input (for all use cases)
  const directBackfill = parseInt(proposal.annual_backfill) || 0;

  switch (useCase) {
    case USE_CASES.CRITICAL_BUSINESS_PROCESS:
      // Direct input for both
      return {
        monthlyDocuments: parseInt(proposal.monthly_documents) || 0,
        annualBackfill: directBackfill
      };

    case USE_CASES.M_AND_A_TRANSITIONS: {
      const transactions = parseInt(proposal.m_and_a_transactions_per_year) || 0;
      const householdsPerTxn = parseInt(proposal.avg_households_per_transaction) || 0;
      const historicalHouseholds = parseInt(proposal.historical_households_to_migrate) || 0;
      const docsPerHousehold = roiConfig.docs_per_household;

      const annualDocs = transactions * householdsPerTxn * docsPerHousehold;
      const monthlyDocuments = Math.round(annualDocs / 12);

      // M&A can derive backfill from historical_households OR use direct input
      const derivedBackfill = historicalHouseholds * docsPerHousehold;
      const annualBackfill = derivedBackfill > 0 ? derivedBackfill : directBackfill;

      return { monthlyDocuments, annualBackfill };
    }

    case USE_CASES.PROSPECTS_ONBOARDING: {
      const annualClients = parseInt(proposal.annual_new_clients) || 0;
      const docsPerClient = roiConfig.docs_per_client;

      const annualDocs = annualClients * docsPerClient;
      const monthlyDocuments = Math.round(annualDocs / 12);

      // Use direct backfill input if provided
      return { monthlyDocuments, annualBackfill: directBackfill };
    }

    case USE_CASES.NEW_INVESTOR_ONBOARDING: {
      const annualInvestors = parseInt(proposal.annual_investors_onboarded) || 0;
      const docsPerInvestor = roiConfig.docs_per_investor;

      const annualDocs = annualInvestors * docsPerInvestor;
      const monthlyDocuments = Math.round(annualDocs / 12);

      // Use direct backfill input if provided
      return { monthlyDocuments, annualBackfill: directBackfill };
    }

    default:
      return { monthlyDocuments: 0, annualBackfill: directBackfill };
  }
}

/**
 * Calculate ROI metrics (for lead gen - no pricing/ARR)
 *
 * @param {Object} inputs - The business inputs and settings
 * @param {Object} roiConfig - The ROI configuration
 * @returns {Object|null} ROI metrics or null if no use case
 */
function calculateROI(inputs, roiConfig) {
  const useCase = inputs.use_case;

  if (!useCase) {
    return null;
  }

  // Get time and rate values
  const triageTime = parseInt(roiConfig.triage_time_per_doc) || 5;
  const entryTime = parseInt(roiConfig.data_entry_time_per_doc) || 15;
  const totalTimePerDoc = triageTime + entryTime; // minutes
  const analystRate = parseFloat(roiConfig.analyst_hourly_rate) || 50;
  const consultantRate = parseFloat(roiConfig.backfill_hourly_rate) || 150;

  // Get ROI model settings from inputs (with use-case defaults as fallback)
  const roiModel = inputs.roi_model || DEFAULT_ROI_MODEL[useCase] || ROI_MODELS.TIME_SAVINGS;
  const backfillRateType = inputs.backfill_rate_type || DEFAULT_BACKFILL_RATE_TYPE[useCase] || BACKFILL_RATE_TYPES.STAFF;
  const fteCost = parseFloat(inputs.fte_cost) || DEFAULT_FTE_COST;

  // Determine which rate to use for backfill based on backfill_rate_type
  const backfillRate = backfillRateType === BACKFILL_RATE_TYPES.CONSULTANT ? consultantRate : analystRate;

  // Derive document counts
  const { monthlyDocuments, annualBackfill } = deriveDocumentCounts(inputs, roiConfig);

  // Calculate hours saved
  const monthlyHoursSaved = (monthlyDocuments * totalTimePerDoc) / 60;
  const backfillHoursSaved = (annualBackfill * totalTimePerDoc) / 60;
  const annualHoursSaved = (monthlyHoursSaved * 12) + backfillHoursSaved;

  // Calculate FTEs avoided (2080 = 40 hrs/week * 52 weeks)
  const ftesAvoided = annualHoursSaved / 2080;

  // Calculate cost saved based on ROI model
  let annualRecurringSavings;
  let backfillCostSaved;

  if (roiModel === ROI_MODELS.FTE_AVOIDANCE) {
    // FTE Avoidance model: value = FTEs avoided × FTE cost
    // Only recurring hours contribute to FTE calculation (not backfill)
    const recurringFtesAvoided = (monthlyHoursSaved * 12) / 2080;
    annualRecurringSavings = recurringFtesAvoided * fteCost;

    // Backfill still uses hourly rate (it's one-time work, not ongoing headcount)
    backfillCostSaved = backfillHoursSaved * backfillRate;
  } else {
    // Time Savings model: value = hours × hourly rate
    annualRecurringSavings = monthlyHoursSaved * 12 * analystRate;
    backfillCostSaved = backfillHoursSaved * backfillRate;
  }

  const annualSavings = annualRecurringSavings + backfillCostSaved;

  // For display purposes, calculate monthly cost saved (using time savings method for consistency)
  const monthlyCostSaved = monthlyHoursSaved * analystRate;

  // Calculate hours per unit (context-specific)
  let hoursPerUnit = 0;
  let unitLabel = '';

  switch (useCase) {
    case USE_CASES.CRITICAL_BUSINESS_PROCESS:
      hoursPerUnit = totalTimePerDoc / 60;
      unitLabel = 'document';
      break;

    case USE_CASES.M_AND_A_TRANSITIONS: {
      const householdsPerTxn = parseInt(inputs.avg_households_per_transaction) || 0;
      const docsPerHousehold = roiConfig.docs_per_household;
      hoursPerUnit = (householdsPerTxn * docsPerHousehold * totalTimePerDoc) / 60;
      unitLabel = 'transition';
      break;
    }

    case USE_CASES.PROSPECTS_ONBOARDING:
      hoursPerUnit = (roiConfig.docs_per_client * totalTimePerDoc) / 60;
      unitLabel = 'client';
      break;

    case USE_CASES.NEW_INVESTOR_ONBOARDING:
      hoursPerUnit = (roiConfig.docs_per_investor * totalTimePerDoc) / 60;
      unitLabel = 'investor';
      break;
  }

  return {
    // Core metrics (NO pricing-related fields like roi_percent, payback_months)
    monthly_hours_saved: Math.round(monthlyHoursSaved * 100) / 100,
    monthly_cost_saved: Math.round(monthlyCostSaved * 100) / 100,
    backfill_cost_saved: Math.round(backfillCostSaved * 100) / 100,
    annual_savings: Math.round(annualSavings * 100) / 100,
    annual_recurring_savings: Math.round(annualRecurringSavings * 100) / 100,
    ftes_avoided: Math.round(ftesAvoided * 100) / 100,

    // Per-unit metrics
    hours_per_unit: Math.round(hoursPerUnit * 100) / 100,
    unit_label: unitLabel,

    // Derived document counts
    derived_monthly_documents: monthlyDocuments,
    derived_annual_backfill: annualBackfill,

    // Model info (for display)
    roi_model: roiModel,
    backfill_rate_type: backfillRateType,
    fte_cost: fteCost,
    backfill_rate_used: backfillRate
  };
}

/**
 * Get strategic ROI narrative based on use case
 */
function getStrategicROI(useCase) {
  switch (useCase) {
    case USE_CASES.CRITICAL_BUSINESS_PROCESS:
      return {
        quantifiable: [
          'Hours saved on manual extraction',
          'FTE avoidance',
          'Consultant cost avoidance'
        ],
        strategic: [
          'Flag discrepancies between billing actuals and fee schedules',
          'Avoid using outdated agreements',
          'Enable data-driven billing strategy changes',
          'Use data for marketing to different client segments'
        ]
      };

    case USE_CASES.M_AND_A_TRANSITIONS:
      return {
        quantifiable: [
          'Hours saved per transition',
          'FTE avoidance per acquisition',
          'Consultant cost avoidance on backfill'
        ],
        strategic: [
          'Eliminate "all hands on deck" fire drills for each acquisition',
          'Remove Excel burden from acquired firms',
          'Client data keeps pace with account migration',
          'Hit/beat 60-day integration benchmark',
          'Build track record that attracts better targets'
        ]
      };

    case USE_CASES.PROSPECTS_ONBOARDING:
      return {
        quantifiable: [
          'Hours saved per new client',
          'FTE avoidance',
          'Reduced rework from errors'
        ],
        strategic: [
          'Faster time-to-revenue',
          'Fewer NIGOs (Not In Good Order)',
          'Scale prospect volume without scaling ops team',
          'Unlock existing client organic growth by bringing data online'
        ]
      };

    case USE_CASES.NEW_INVESTOR_ONBOARDING:
      return {
        quantifiable: [
          'Hours saved per investor onboarded',
          'FTE avoidance',
          'Reduced cycle time to capital deployment'
        ],
        strategic: [
          'Faster capital deployment',
          'Stop passing burden to advisors and investors',
          'Close the gap between "tech-forward" marketing and operational reality',
          'Unlock subscription doc recycling',
          'Competitive differentiation vs. other platforms'
        ]
      };

    default:
      return { quantifiable: [], strategic: [] };
  }
}

module.exports = {
  USE_CASES,
  USE_CASE_LABELS,
  COMPANY_TYPES,
  COMPANY_TYPE_LABELS,
  ROI_MODELS,
  BACKFILL_RATE_TYPES,
  DEFAULT_SYSTEMS,
  DEFAULT_ROI_MODEL,
  DEFAULT_BACKFILL_RATE_TYPE,
  DEFAULT_FTE_COST,
  mergeRoiConfig,
  deriveDocumentCounts,
  calculateROI,
  getStrategicROI
};
