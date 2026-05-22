'use strict';

const kb = require('./knowledge-base');

// Transforms root cause analysis results into ranked Recommendation records.

function generateRecommendations(error, analysisResult) {
  const { layer, recommendations: rawRecs, highPriority } = analysisResult;

  // Score and rank
  const scored = rawRecs.map(r => ({
    ...r,
    _score: priorityScore(r.priority) + confidenceScore(r.confidence),
  }));
  scored.sort((a, b) => b._score - a._score);

  return scored.map(r => {
    const confidence = parseFloat(r.confidence) || 0;
    const status     = confidence < 70 ? 'PENDING' : 'PENDING'; // always PENDING — user must accept
    const payload    = buildActionPayload(r.actionCode, error, r.actionPayload);

    return {
      priority:      r.priority || assignDefaultPriority(layer, highPriority),
      confidence:    confidence,
      title:         r.title,
      description:   r.description + confidenceNote(confidence),
      actionCode:    r.actionCode,
      actionPayload: JSON.stringify(payload),
      status,
    };
  });
}

function buildActionPayload(actionCode, error, existing) {
  let base = {};
  try { base = JSON.parse(existing || '{}'); } catch { /* use empty */ }

  const common = {
    errorId:        error.ID,
    costCenter:     error.costCenter,
    companyCode:    error.companyCode,
    controllingArea: error.controllingArea,
    documentNumber: error.documentNumber,
    fiscalYear:     error.fiscalYear,
    fiscalPeriod:   error.fiscalPeriod,
  };

  const extras = {
    RETRY_POSTING:     { apiPath: '/sap/opu/odata/sap/API_JOURNALENTRY_SRV' },
    CREATE_WORKFLOW:   { subject: `Cost Center Error: ${error.errorCode} on ${error.costCenter}`, description: error.errorText },
    UPDATE_COSTCENTER: { fieldToChange: 'IsBlockedForPrimCosts', newValue: '' },
    LAUNCH_FIORI:      { appId: kb.getFioriApp(error.layer || 'UNKNOWN').appId },
    ESCALATE:          { channel: 'TEAMS', escalationLevel: 'CO_SUPPORT_LEAD' },
  };

  return { ...common, ...base, ...(extras[actionCode] || {}) };
}

function assignDefaultPriority(layer, highPriority) {
  if (highPriority) return 'HIGH';
  return layer === 'AUTHORIZATION' ? 'HIGH' : 'MEDIUM';
}

function priorityScore(priority) {
  return { HIGH: 300, MEDIUM: 200, LOW: 100 }[priority] || 100;
}

function confidenceScore(confidence) {
  return parseFloat(confidence) || 0;
}

function confidenceNote(confidence) {
  if (confidence >= 90) return '';
  if (confidence >= 70) return ' (Suggested — please verify before executing.)';
  return ' (Low confidence — manual review recommended before proceeding.)';
}

module.exports = { generateRecommendations };
