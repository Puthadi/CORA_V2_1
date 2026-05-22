'use strict';

// Claude tool definitions for SAP S/4HANA data lookups.
// These are passed to the AI engine during root cause analysis
// so Claude can fetch real-time SAP data mid-reasoning.

const TOOLS = [
  {
    name: 'get_cost_center_details',
    description: 'Retrieve cost center master data from SAP S/4HANA including lock indicators, validity dates, responsible person, profit center, and hierarchy assignments.',
    input_schema: {
      type: 'object',
      properties: {
        costCenter:     { type: 'string', description: 'SAP cost center ID (e.g. CC1000)' },
        companyCode:    { type: 'string', description: 'SAP company code (e.g. 1000)' },
        controllingArea:{ type: 'string', description: 'SAP controlling area (e.g. A000)' },
      },
      required: ['costCenter', 'controllingArea'],
    },
  },
  {
    name: 'get_posting_period_status',
    description: 'Check whether a fiscal period is open or closed for postings in a given company code. Returns status for each account type (assets, GL, materials).',
    input_schema: {
      type: 'object',
      properties: {
        companyCode: { type: 'string', description: 'SAP company code' },
        fiscalYear:  { type: 'string', description: 'Fiscal year (e.g. 2026)' },
        fiscalPeriod:{ type: 'string', description: 'Fiscal period 01-16 (e.g. 05)' },
      },
      required: ['companyCode', 'fiscalYear', 'fiscalPeriod'],
    },
  },
  {
    name: 'get_error_message_text',
    description: 'Retrieve the full SAP error message text from table T100 given the message class and message number.',
    input_schema: {
      type: 'object',
      properties: {
        messageClass:  { type: 'string', description: 'SAP message class (e.g. KS, KI, BU)' },
        messageNumber: { type: 'string', description: 'SAP message number (e.g. 113)' },
        language:      { type: 'string', description: 'Language key (default EN)', default: 'EN' },
      },
      required: ['messageClass', 'messageNumber'],
    },
  },
  {
    name: 'get_application_log_details',
    description: 'Retrieve detailed application log entries from SAP (BALHDR/BALDAT) for a specific error log object and subobject.',
    input_schema: {
      type: 'object',
      properties: {
        logObject:    { type: 'string', description: 'Application log object (e.g. CO_COSTCENTER)' },
        logSubobject: { type: 'string', description: 'Application log sub-object' },
        documentNumber:{ type: 'string', description: 'Related document number (optional)' },
      },
      required: ['logObject'],
    },
  },
  {
    name: 'get_journal_entry',
    description: 'Retrieve journal entry line items from ACDOCA for a specific accounting document.',
    input_schema: {
      type: 'object',
      properties: {
        documentNumber: { type: 'string', description: 'Accounting document number' },
        companyCode:    { type: 'string', description: 'Company code' },
        fiscalYear:     { type: 'string', description: 'Fiscal year' },
      },
      required: ['documentNumber', 'companyCode', 'fiscalYear'],
    },
  },
  {
    name: 'search_error_patterns',
    description: 'Search the local error knowledge base for known patterns matching an error code or message class. Returns root cause templates and success rates.',
    input_schema: {
      type: 'object',
      properties: {
        errorCode:    { type: 'string', description: 'SAP error code (e.g. KS113)' },
        messageClass: { type: 'string', description: 'SAP message class (optional, for broader search)' },
      },
      required: ['errorCode'],
    },
  },
  {
    name: 'get_budget_status',
    description: 'Check available budget for a cost center and cost element in a fiscal year. Returns consumed, available, and total budget amounts.',
    input_schema: {
      type: 'object',
      properties: {
        costCenter:  { type: 'string', description: 'Cost center ID' },
        costElement: { type: 'string', description: 'Cost element (optional)' },
        fiscalYear:  { type: 'string', description: 'Fiscal year' },
      },
      required: ['costCenter', 'fiscalYear'],
    },
  },
  {
    name: 'get_activity_type_assignment',
    description: 'Check whether an activity type is assigned to a cost center for a given fiscal year, and retrieve planned activity prices.',
    input_schema: {
      type: 'object',
      properties: {
        costCenter:   { type: 'string', description: 'Cost center ID' },
        activityType: { type: 'string', description: 'Activity type ID' },
        fiscalYear:   { type: 'string', description: 'Fiscal year' },
        controllingArea:{ type: 'string', description: 'Controlling area' },
      },
      required: ['costCenter', 'activityType', 'controllingArea'],
    },
  },
];

module.exports = { TOOLS };
