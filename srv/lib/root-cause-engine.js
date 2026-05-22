'use strict';

const aiEngine    = require('./ai-engine');
const sapConn     = require('./sap-connector');
const kb          = require('./knowledge-base');
const { TOOLS }   = require('./tools');
const { SYSTEM_PROMPT, ROOT_CAUSE_PROMPT } = require('./prompt-templates');

// Register SAP tool handlers on the AI engine at module load time.
aiEngine.setToolHandler('get_cost_center_details',    sapConn.getCostCenterDetails);
aiEngine.setToolHandler('get_posting_period_status',  sapConn.getPostingPeriodStatus);
aiEngine.setToolHandler('get_error_message_text',     sapConn.getErrorMessageText);
aiEngine.setToolHandler('get_application_log_details',sapConn.getApplicationLogDetails);
aiEngine.setToolHandler('get_journal_entry',          sapConn.getJournalEntry);
aiEngine.setToolHandler('get_budget_status',          sapConn.getBudgetStatus);
aiEngine.setToolHandler('get_activity_type_assignment',sapConn.getActivityTypeAssignment);

// search_error_patterns is handled locally — no S/4HANA call needed.
aiEngine.setToolHandler('search_error_patterns', async ({ errorCode, messageClass }) => {
  // cds is available at runtime; this handler is called after server bootstrap
  const { SELECT } = require('@sap/cds').db ? require('@sap/cds') : { SELECT: null };
  if (!SELECT) return { patterns: [] };
  const { ErrorPatterns } = cds.entities('cc.errorresolution');
  let query = SELECT.from(ErrorPatterns).where({ errorCode });
  if (messageClass && !errorCode) {
    query = SELECT.from(ErrorPatterns).where({ messageClass });
  }
  const patterns = await query;
  return { patterns };
});

// ─── Two-pass analysis ─────────────────────────────────────────────────────

async function analyzeError(error) {
  // Pass 1: rule-based classification (instant, no LLM)
  const layer = kb.classifyLayer(error.messageClass || '', error.errorCode || '');
  const highPriority = kb.isHighPriority(error.errorCode, error.processContext);

  // Pass 2: AI-powered deep analysis with tool use
  let aiResult;
  try {
    const raw = await aiEngine.chat({
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: ROOT_CAUSE_PROMPT(error) }],
      tools: TOOLS,
    });

    // Claude returns JSON when instructed. Parse defensively.
    aiResult = tryParseJSON(raw);
  } catch (err) {
    console.error('[RootCauseEngine] AI analysis failed:', err.message);
    aiResult = null;
  }

  if (aiResult && aiResult.layer) {
    return {
      layer:           aiResult.layer,
      rootCauseText:   aiResult.rootCauseText,
      recommendations: (aiResult.recommendations || []).map(r => normalizeRecommendation(r, error)),
      highPriority,
      source:          'AI',
    };
  }

  // Fallback: rule-based response when AI unavailable
  return buildRuleBasedResult(error, layer, highPriority);
}

function buildRuleBasedResult(error, layer, highPriority) {
  const fioriApp = kb.getFioriApp(layer);
  const actions  = kb.getRecommendedActions(layer);

  const recommendations = actions.map((actionCode, idx) => ({
    priority:     idx === 0 ? (highPriority ? 'HIGH' : 'MEDIUM') : 'LOW',
    confidence:   75,
    title:        actionTitle(actionCode, error),
    description:  actionDescription(actionCode, error, fioriApp),
    actionCode,
    actionPayload: JSON.stringify({ errorId: error.ID, costCenter: error.costCenter }),
  }));

  return {
    layer,
    rootCauseText: `Error ${error.errorCode} in message class ${error.messageClass} — ${layer.replace('_', ' ').toLowerCase()} issue detected for cost center ${error.costCenter}.`,
    recommendations,
    highPriority,
    source: 'RULES',
  };
}

function normalizeRecommendation(r, error) {
  return {
    priority:     r.priority   || 'MEDIUM',
    confidence:   parseFloat(r.confidence) || 75,
    title:        r.title       || 'Review and correct',
    description:  r.description || '',
    actionCode:   r.actionCode  || 'CREATE_WORKFLOW',
    actionPayload: typeof r.actionPayload === 'string'
      ? r.actionPayload
      : JSON.stringify({ ...r.actionPayload, errorId: error.ID }),
  };
}

function tryParseJSON(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  } catch { return null; }
}

function actionTitle(actionCode, error) {
  const map = {
    RETRY_POSTING:       `Retry posting for document ${error.documentNumber || 'N/A'}`,
    CREATE_WORKFLOW:     'Create approval workflow ticket',
    UPDATE_COSTCENTER:   `Update cost center ${error.costCenter} master data`,
    LAUNCH_FIORI:        'Open related SAP Fiori application',
    ESCALATE:            'Escalate to Controlling team',
  };
  return map[actionCode] || actionCode;
}

function actionDescription(actionCode, error, fioriApp) {
  const map = {
    RETRY_POSTING:       `Reprocess the failed posting document. Ensure all preconditions are met first.`,
    CREATE_WORKFLOW:     'Create a workflow approval request for the finance or controlling team to review and resolve this issue.',
    UPDATE_COSTCENTER:   `Modify the master data of cost center ${error.costCenter} to resolve the blocking condition. Opens ${fioriApp.appTitle}.`,
    LAUNCH_FIORI:        `Navigate to the ${fioriApp.appTitle} app (${fioriApp.appId}) to investigate and correct the issue manually.`,
    ESCALATE:            'Notify the Controlling support lead with full error context for urgent resolution.',
  };
  return map[actionCode] || 'Perform the recommended corrective action.';
}

module.exports = { analyzeError };
