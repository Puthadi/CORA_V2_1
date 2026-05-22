'use strict';

/**
 * CORA Mock Server — standalone test backend for the Fiori chat application.
 * Runs without SAP AI Core, S/4HANA, or HANA Cloud.
 *
 * Start: node test/mock-server.js
 * Open:  http://localhost:4005
 */

const express = require('express');
const path    = require('path');
const { getResponse } = require('./mock-data/responses');

const app  = express();
const PORT = 4005;

app.use(express.json());

// ─── Serve Fiori static files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../app/chat/webapp')));

// ─── In-memory store ────────────────────────────────────────────────────────
let errors          = JSON.parse(JSON.stringify(require('./mock-data/errors.json')));
let recommendations = {};   // errorId → recommendation[]
let actions         = [];
let conversations   = {};   // sessionId → message[]
let feedback        = [];

// ─── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function now() { return new Date().toISOString(); }

function buildODataList(items) {
  return { '@odata.context': '$metadata#Results', value: items };
}

function layerCounts() {
  const counts = { MASTER_DATA: 0, TRANSACTION: 0, CONFIG: 0, AUTHORIZATION: 0, UNKNOWN: 0 };
  errors.forEach(e => { if (e.status !== 'RESOLVED') counts[e.layer] = (counts[e.layer] || 0) + 1; });
  return counts;
}

// ─── Error Service routes ───────────────────────────────────────────────────

// GET /error/Errors  (OData-style list)
app.get('/error/Errors', (req, res) => {
  const filterParam = (req.query.$filter || '').toLowerCase();
  let result = [...errors];

  if (filterParam.includes("status eq 'open'") || filterParam.includes("status eq 'in_progress'")) {
    result = result.filter(e => e.status === 'OPEN' || e.status === 'IN_PROGRESS');
  }
  if (filterParam.includes("layer eq")) {
    const m = filterParam.match(/layer eq '(\w+)'/);
    if (m) result = result.filter(e => e.layer === m[1].toUpperCase());
  }

  const top   = parseInt(req.query.$top   || '100');
  const skip  = parseInt(req.query.$skip  || '0');
  result = result.slice(skip, skip + top);

  res.json(buildODataList(result));
});

// GET /error/Errors/:id
app.get('/error/Errors/:id', (req, res) => {
  const e = errors.find(x => x.ID === req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json(e);
});

// GET /error/ErrorSummary
app.get('/error/ErrorSummary', (req, res) => {
  const counts = layerCounts();
  const result = Object.entries(counts).map(([layer, count]) => ({ layer, count }));
  res.json(buildODataList(result));
});

// GET /error/ErrorTrends
app.get('/error/ErrorTrends', (req, res) => {
  const map = {};
  errors.forEach(e => {
    const key = e.errorCode;
    if (!map[key]) map[key] = { errorCode: e.errorCode, messageClass: e.messageClass, costCenter: e.costCenter, occurrences: 0 };
    map[key].occurrences++;
  });
  const result = Object.values(map).sort((a, b) => b.occurrences - a.occurrences);
  res.json(buildODataList(result));
});

// POST /error/ingest
app.post('/error/ingest', (req, res) => {
  const incoming = (req.body?.input?.errors || req.body?.errors || []);
  let created = 0, skipped = 0;
  const ids = [];

  incoming.forEach(e => {
    const dup = e.documentNumber && errors.find(x => x.documentNumber === e.documentNumber && x.errorCode === e.errorCode && x.status === 'OPEN');
    if (dup) { skipped++; return; }
    const newErr = { ...e, ID: uuid(), status: 'OPEN', rootCauseText: null, createdAt: now() };
    errors.push(newErr);
    ids.push(newErr.ID);
    created++;
  });

  res.json({ value: { created, skipped, ids } });
});

// PATCH /error/Errors/:id  (status update)
app.patch('/error/Errors/:id', (req, res) => {
  const idx = errors.findIndex(x => x.ID === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  errors[idx] = { ...errors[idx], ...req.body };
  res.json(errors[idx]);
});

// ─── Agent Service routes ────────────────────────────────────────────────────

// POST /agent/chat
app.post('/agent/chat', async (req, res) => {
  const input     = req.body?.input || req.body || {};
  const sessionId = input.sessionId || uuid();
  const message   = input.message   || '';
  const errorId   = input.errorId   || null;

  // Simulate AI thinking delay (1.2–2.4s)
  await sleep(1200 + Math.random() * 1200);

  // Find error context
  const error = errorId ? errors.find(e => e.ID === errorId) : null;

  // Get AI response
  const aiResult = getResponse(error, message);

  // Store recommendations in memory
  const recs = (aiResult.recommendations || []).map(r => ({
    ...r,
    ID:       r.ID || uuid(),
    error_ID: errorId,
  }));
  if (errorId) {
    recommendations[errorId] = recs;
    // Update error with root cause
    const errIdx = errors.findIndex(e => e.ID === errorId);
    if (errIdx !== -1 && aiResult.rootCauseText) {
      errors[errIdx].rootCauseText = aiResult.rootCauseText;
      errors[errIdx].status        = 'IN_PROGRESS';
    }
  }

  // Persist conversation
  if (!conversations[sessionId]) conversations[sessionId] = [];
  conversations[sessionId].push({ role: 'user',      content: message,          timestamp: now() });
  conversations[sessionId].push({ role: 'assistant',  content: aiResult.message, timestamp: now() });

  // Build available action buttons from recommendations
  const actionCodes = [...new Set(recs.map(r => r.actionCode))];
  const actionDefs  = {
    RETRY_POSTING:     { label: 'Retry Posting',       description: 'Reprocess the failed document' },
    CREATE_WORKFLOW:   { label: 'Create Ticket',        description: 'Create an approval workflow' },
    UPDATE_COSTCENTER: { label: 'Update Cost Center',   description: 'Modify cost center master data' },
    LAUNCH_FIORI:      { label: 'Open Fiori App',       description: 'Navigate to the related SAP app' },
    ESCALATE:          { label: 'Escalate',             description: 'Notify the Controlling team' },
  };
  const actionList = actionCodes.map(code => ({
    code,
    label:       actionDefs[code]?.label       || code,
    description: actionDefs[code]?.description || '',
    enabled:     true,
  }));

  res.json({
    value: {
      sessionId,
      message:         aiResult.message,
      recommendations: recs,
      actions:         actionList,
      errorSummary:    error ? {
        ID:           error.ID,
        errorCode:    error.errorCode,
        costCenter:   error.costCenter,
        companyCode:  error.companyCode,
        layer:        error.layer,
        status:       error.status,
        rootCauseText: aiResult.rootCauseText || error.rootCauseText,
      } : null,
    }
  });
});

// POST /agent/executeAction
app.post('/agent/executeAction', async (req, res) => {
  const input = req.body?.input || req.body || {};
  const { errorId, recommendationId, actionCode, actionPayload } = input;

  await sleep(700 + Math.random() * 600);

  let payload = {};
  try { payload = typeof actionPayload === 'string' ? JSON.parse(actionPayload) : (actionPayload || {}); } catch { /* ok */ }

  // Simulate action execution
  const actionId = uuid();
  actions.push({ ID: actionId, errorId, recommendationId, actionCode, status: 'COMPLETED', executedAt: now(), payload });

  // Update error status to RESOLVED for demo
  const errIdx = errors.findIndex(e => e.ID === errorId);
  if (errIdx !== -1 && actionCode !== 'LAUNCH_FIORI') {
    errors[errIdx].status = actionCode === 'ESCALATE' ? 'ESCALATED' : 'IN_PROGRESS';
  }

  // Update recommendation status
  if (recommendationId) {
    Object.values(recommendations).flat().forEach(r => {
      if (r.ID === recommendationId) r.status = 'EXECUTED';
    });
  }

  const results = {
    RETRY_POSTING:     { success: true,  message: `Posting document ${payload.documentNumber || 'N/A'} resubmitted. It will be processed in the next available posting run.`, workflowId: null, fioriUrl: null },
    CREATE_WORKFLOW:   { success: true,  message: `Workflow ticket created: WF-${Math.floor(Math.random()*90000+10000)}. The Controlling team has been notified and will respond within 2 business hours.`, workflowId: `WF-${Math.floor(Math.random()*90000+10000)}`, fioriUrl: null },
    UPDATE_COSTCENTER: { success: true,  message: `Cost center ${payload.costCenter || ''} updated successfully. The validity has been extended to 31-Dec-2026. You can now retry your posting.`, workflowId: null, fioriUrl: null },
    LAUNCH_FIORI:      { success: true,  message: `Navigating to ${payload.description || 'SAP Fiori app'}...`, workflowId: null, fioriUrl: `/sap/bc/ui2/flp#${payload.appId || 'Shell'}-home` },
    ESCALATE:          { success: true,  message: `Escalation sent to the Controlling team lead via Microsoft Teams. Reference: ESC-${Math.floor(Math.random()*9000+1000)}. Expect a response within 30 minutes.`, workflowId: null, fioriUrl: null },
  };

  const result = results[actionCode] || { success: true, message: 'Action completed.', workflowId: null, fioriUrl: null };
  res.json({ value: result });
});

// POST /agent/submitFeedback
app.post('/agent/submitFeedback', (req, res) => {
  const body = req.body || {};
  feedback.push({ ID: uuid(), ...body, submittedAt: now() });
  res.json({ value: { success: true } });
});

// GET /agent/ConversationHistory (read-only)
app.get('/agent/ConversationHistory', (req, res) => {
  const all = Object.values(conversations).flat();
  res.json(buildODataList(all));
});

// ─── Reset endpoint (for testing) ────────────────────────────────────────────
app.post('/test/reset', (req, res) => {
  errors          = JSON.parse(JSON.stringify(require('./mock-data/errors.json')));
  recommendations = {};
  actions         = [];
  conversations   = {};
  feedback        = [];
  res.json({ message: 'Mock data reset to initial state' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   CORA — Mock Test Server                            ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║   Fiori App:  http://localhost:${PORT}                  ║`);
  console.log(`║   API Base:   http://localhost:${PORT}/agent/           ║`);
  console.log('║   Test Data:  8 pre-loaded SAP error scenarios        ║');
  console.log('║   Reset:      POST http://localhost:4005/test/reset   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
});
