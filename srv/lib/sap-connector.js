'use strict';

const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

// All OData calls to S/4HANA go through this connector.
// The BTP Destination named S4H_COSTCENTER routes traffic
// through the Cloud Connector to the on-premise system.

const DESTINATION = process.env.S4H_DESTINATION_NAME || 'S4H_COSTCENTER';

async function odataGet(path, params = {}) {
  const queryString = new URLSearchParams({ $format: 'json', ...params }).toString();
  const resp = await executeHttpRequest(
    { destinationName: DESTINATION },
    { method: 'GET', url: `${path}?${queryString}`, headers: { Accept: 'application/json' } }
  );
  return resp.data?.d?.results ?? resp.data?.d ?? resp.data;
}

async function odataPatch(path, body) {
  const resp = await executeHttpRequest(
    { destinationName: DESTINATION },
    {
      method: 'PATCH',
      url: path,
      data: body,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    }
  );
  return resp.data;
}

async function odataPost(path, body) {
  const resp = await executeHttpRequest(
    { destinationName: DESTINATION },
    {
      method: 'POST',
      url: path,
      data: body,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    }
  );
  return resp.data;
}

// ─── Cost Center Master ────────────────────────────────────────────────────

async function getCostCenterDetails({ costCenter, companyCode, controllingArea }) {
  const filter = `CostCenter eq '${costCenter}' and ControllingArea eq '${controllingArea}'`;
  const results = await odataGet('/sap/opu/odata/sap/API_COSTCENTER_SRV/A_CostCenter', {
    $filter: filter,
    $select: 'CostCenter,ControllingArea,CompanyCode,ValidityEndDate,ValidityStartDate,CostCenterName,CostCenterCategory,ResponsiblePersonName,ProfitCenter,IsBlocked,IsBlockedForPrimCosts,IsBlockedForSecondaryCosts',
  });
  return Array.isArray(results) ? results[0] ?? null : results;
}

async function updateCostCenterBlock({ costCenter, controllingArea, validFrom, block }) {
  const key = `A_CostCenter(CostCenter='${encodeURIComponent(costCenter)}',ControllingArea='${controllingArea}',ValidityEndDate=datetime'9999-12-31T00%3A00%3A00')`
  return odataPatch(`/sap/opu/odata/sap/API_COSTCENTER_SRV/${key}`, {
    IsBlockedForPrimCosts: block ? 'X' : '',
    IsBlockedForSecondaryCosts: block ? 'X' : '',
  });
}

// ─── Posting Period ────────────────────────────────────────────────────────

async function getPostingPeriodStatus({ companyCode, fiscalYear, fiscalPeriod }) {
  const results = await odataGet('/sap/opu/odata/sap/API_FISCALYEAR_SRV/A_FiscalPeriod', {
    $filter: `CompanyCode eq '${companyCode}' and FiscalYear eq '${fiscalYear}' and FiscalPeriod eq '${fiscalPeriod}'`,
    $select: 'FiscalYear,FiscalPeriod,FiscalPeriodIsOpen,AccountingDocumentCategory,CompanyCode',
  });
  return Array.isArray(results) ? results : [results];
}

// ─── Error Message Text ────────────────────────────────────────────────────

async function getErrorMessageText({ messageClass, messageNumber, language = 'EN' }) {
  const results = await odataGet('/sap/opu/odata/sap/API_MESSAGELOG_SRV/MessageText', {
    $filter: `MessageClass eq '${messageClass}' and MessageNumber eq '${messageNumber}' and Language eq '${language}'`,
    $select: 'MessageClass,MessageNumber,MessageText,Language',
  });
  return Array.isArray(results) ? results[0] ?? null : results;
}

// ─── Application Logs ──────────────────────────────────────────────────────

async function getApplicationLogDetails({ logObject, logSubobject, documentNumber }) {
  let filter = `LogObject eq '${logObject}'`;
  if (logSubobject) filter += ` and LogSubobject eq '${logSubobject}'`;
  const headers = await odataGet('/sap/opu/odata/sap/API_APPLICATIONLOG_SRV/A_Header', {
    $filter: filter,
    $orderby: 'CreatedAt desc',
    $top: 5,
  });
  return headers;
}

// ─── Journal Entry ─────────────────────────────────────────────────────────

async function getJournalEntry({ documentNumber, companyCode, fiscalYear }) {
  const results = await odataGet('/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_JournalEntryItem', {
    $filter: `AccountingDocument eq '${documentNumber}' and CompanyCode eq '${companyCode}' and FiscalYear eq '${fiscalYear}'`,
    $select: 'AccountingDocument,CompanyCode,FiscalYear,PostingDate,CostCenter,CostElement,AmountInCompanyCodeCurrency,CompanyCodeCurrency,AccountingDocumentType',
  });
  return Array.isArray(results) ? results : [results];
}

// ─── Budget Status ─────────────────────────────────────────────────────────

async function getBudgetStatus({ costCenter, costElement, fiscalYear }) {
  let filter = `CostCenter eq '${costCenter}' and FiscalYear eq '${fiscalYear}'`;
  if (costElement) filter += ` and CostElement eq '${costElement}'`;
  const results = await odataGet('/sap/opu/odata/sap/API_COSTCENTER_BUDGETALERT_SRV/CostCenterBudget', {
    $filter: filter,
    $select: 'CostCenter,FiscalYear,CostElement,TotalBudgetAmount,ConsumedBudgetAmount,AvailableBudgetAmount,Currency',
  });
  return results;
}

// ─── Activity Type Assignment ──────────────────────────────────────────────

async function getActivityTypeAssignment({ costCenter, activityType, fiscalYear, controllingArea }) {
  const results = await odataGet('/sap/opu/odata/sap/API_COSTCENTERACTIVITYTYPE_SRV/A_CostCtrActivityType', {
    $filter: `CostCenter eq '${costCenter}' and ActivityType eq '${activityType}' and ControllingArea eq '${controllingArea}' and FiscalYear eq '${fiscalYear}'`,
    $select: 'CostCenter,ActivityType,ControllingArea,FiscalYear,ActvtyTypePlannedTotalQty,UnitOfMeasure',
  });
  return Array.isArray(results) ? results[0] ?? null : results;
}

// ─── Workflow ──────────────────────────────────────────────────────────────

async function createWorkflowTask({ subject, description, assignee, priority = 'MEDIUM', referenceId }) {
  return odataPost('/sap/opu/odata/sap/API_TASK_SRV/A_Task', {
    Subject:              subject,
    LongDescription:      description,
    ProcessorUserId:      assignee || '',
    TaskPriority:         priority,
    ReferenceDocumentId:  referenceId || '',
  });
}

module.exports = {
  getCostCenterDetails,
  updateCostCenterBlock,
  getPostingPeriodStatus,
  getErrorMessageText,
  getApplicationLogDetails,
  getJournalEntry,
  getBudgetStatus,
  getActivityTypeAssignment,
  createWorkflowTask,
};
