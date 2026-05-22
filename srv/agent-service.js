'use strict';

require('dotenv').config();
const cds  = require('@sap/cds');
const { v4: uuid } = require('uuid');

const rootCauseEngine      = require('./lib/root-cause-engine');
const recommendationEngine = require('./lib/recommendation-engine');
const actionFramework      = require('./lib/action-framework');
const aiEngine             = require('./lib/ai-engine');
const { SYSTEM_PROMPT, CHAT_CONTEXT_PROMPT } = require('./lib/prompt-templates');

module.exports = class AgentService extends cds.ApplicationService {

  async init() {
    const { chat, executeAction, submitFeedback } = this.operations;
    this.on(chat,          this._onChat.bind(this));
    this.on(executeAction, this._onExecuteAction.bind(this));
    this.on(submitFeedback,this._onFeedback.bind(this));
    return super.init();
  }

  // ─── Chat handler ────────────────────────────────────────────────────

  async _onChat(req) {
    const { sessionId: rawSession, message, errorId } = req.data.input;
    const userId    = req.user?.id || 'anonymous';
    const sessionId = rawSession || uuid();

    const { Conversations, Errors, Recommendations } = cds.entities('cc.errorresolution');

    // Persist user message
    await INSERT.into(Conversations).entries({
      ID: uuid(), sessionId, userId, role: 'user', content: message,
      timestamp: new Date().toISOString(), errorRef: errorId,
    });

    // Fetch conversation history for context
    const history = await SELECT.from(Conversations)
      .where({ sessionId })
      .orderBy({ timestamp: 'asc' })
      .limit(10);

    // If error is pinned, load it for context
    let error = null;
    let analysisResult = null;
    let savedRecs = [];

    if (errorId) {
      error = await SELECT.one.from(Errors).where({ ID: errorId });
    }

    // Detect if the user is asking about a specific error that needs analysis
    const needsAnalysis = error && error.status === 'OPEN' && !error.rootCauseText;
    if (needsAnalysis) {
      analysisResult = await rootCauseEngine.analyzeError(error);
      const recs = recommendationEngine.generateRecommendations(error, analysisResult);

      // Persist analysis results back to error record
      await UPDATE(Errors).set({
        layer:         analysisResult.layer,
        rootCauseText: analysisResult.rootCauseText,
        status:        'IN_PROGRESS',
      }).where({ ID: errorId });

      // Save recommendations
      for (const rec of recs) {
        const recId = uuid();
        await INSERT.into(Recommendations).entries({ ID: recId, error_ID: errorId, ...rec });
        savedRecs.push({ ID: recId, ...rec });
      }
    } else if (errorId) {
      // Load existing recommendations
      savedRecs = await SELECT.from(Recommendations).where({ error_ID: errorId });
    }

    // Build conversational AI response
    const contextPrompt = CHAT_CONTEXT_PROMPT(history);
    const errorContext  = error
      ? `\n\nActive error context:\nError: ${error.errorCode} — ${error.errorText}\nCost Center: ${error.costCenter}\nLayer: ${error.layer || 'Analyzing...'}\nRoot Cause: ${error.rootCauseText || 'Being analyzed...'}`
      : '';

    const aiResponse = await aiEngine.complete({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: contextPrompt + errorContext + '\n\nUser: ' + message,
      maxTokens: 1024,
    }).catch(() => 'I encountered an issue generating a response. Please try again or create a workflow ticket for support.');

    // Persist assistant response
    await INSERT.into(Conversations).entries({
      ID: uuid(), sessionId, userId, role: 'assistant', content: aiResponse,
      timestamp: new Date().toISOString(), errorRef: errorId,
    });

    return {
      sessionId,
      message: aiResponse,
      recommendations: savedRecs.map(toRecDTO),
      actions:         buildAvailableActions(error, savedRecs),
      errorSummary:    error ? toErrorSummaryDTO(error, analysisResult) : null,
    };
  }

  // ─── Action execution ────────────────────────────────────────────────

  async _onExecuteAction(req) {
    const { errorId, recommendationId, actionCode, actionPayload } = req.data.input;
    const userId = req.user?.id || 'anonymous';
    const { Actions, Recommendations } = cds.entities('cc.errorresolution');

    const actionId = uuid();
    await INSERT.into(Actions).entries({
      ID: actionId,
      error_ID:          errorId,
      recommendation_ID: recommendationId,
      actionType:        actionCode,
      actionDescription: `Executed by ${userId} via CORA agent`,
      initiatedBy:       userId,
      initiatedAt:       new Date().toISOString(),
      status:            'INITIATED',
    });

    let result;
    try {
      result = await actionFramework.executeAction(actionCode, actionPayload);
      await UPDATE(Actions).set({
        status:      'COMPLETED',
        completedAt: new Date().toISOString(),
        result:      JSON.stringify(result),
        workflowId:  result.workflowId || null,
      }).where({ ID: actionId });

      if (recommendationId) {
        await UPDATE(Recommendations).set({ status: 'EXECUTED', executedBy: userId, executedAt: new Date().toISOString() }).where({ ID: recommendationId });
      }
    } catch (err) {
      await UPDATE(Actions).set({
        status:      'FAILED',
        completedAt: new Date().toISOString(),
        errorMessage: err.message,
      }).where({ ID: actionId });
      return { success: false, message: err.message, workflowId: null, fioriUrl: null };
    }

    return {
      success:    result.success || true,
      message:    result.message || 'Action completed.',
      workflowId: result.workflowId || null,
      fioriUrl:   result.fioriUrl || null,
    };
  }

  // ─── Feedback handler ────────────────────────────────────────────────

  async _onFeedback(req) {
    const { recommendationId, helpful, rating, comment } = req.data;
    const userId = req.user?.id || 'anonymous';
    const { Feedback } = cds.entities('cc.errorresolution');

    await INSERT.into(Feedback).entries({
      ID: uuid(),
      recommendation_ID: recommendationId,
      helpful,
      rating:      rating || (helpful ? 5 : 1),
      comment:     comment || '',
      submittedBy: userId,
      submittedAt: new Date().toISOString(),
    });

    return { success: true };
  }
};

// ─── DTOs ────────────────────────────────────────────────────────────────

function toRecDTO(r) {
  return {
    ID:           r.ID,
    priority:     r.priority,
    confidence:   r.confidence,
    title:        r.title,
    description:  r.description,
    actionCode:   r.actionCode,
    actionPayload: r.actionPayload,
    status:       r.status,
  };
}

function toErrorSummaryDTO(error, analysis) {
  return {
    ID:           error.ID,
    errorCode:    error.errorCode,
    costCenter:   error.costCenter,
    companyCode:  error.companyCode,
    layer:        analysis?.layer || error.layer,
    status:       error.status,
    rootCauseText: analysis?.rootCauseText || error.rootCauseText,
  };
}

function buildAvailableActions(error, recs) {
  if (!error) return [];
  const codes = new Set(recs.map(r => r.actionCode));
  return [...codes].map(code => ({
    code,
    label:      actionLabel(code),
    description: actionShortDesc(code),
    enabled:    true,
  }));
}

function actionLabel(code) {
  const map = { RETRY_POSTING: 'Retry Posting', CREATE_WORKFLOW: 'Create Ticket', UPDATE_COSTCENTER: 'Update Cost Center', LAUNCH_FIORI: 'Open Fiori App', ESCALATE: 'Escalate' };
  return map[code] || code;
}

function actionShortDesc(code) {
  const map = { RETRY_POSTING: 'Reprocess the failed document', CREATE_WORKFLOW: 'Create an approval workflow', UPDATE_COSTCENTER: 'Modify cost center master data', LAUNCH_FIORI: 'Navigate to the related SAP app', ESCALATE: 'Notify the Controlling team' };
  return map[code] || '';
}
