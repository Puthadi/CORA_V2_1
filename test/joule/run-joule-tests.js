'use strict';

/**
 * CORA Joule Skill Test Runner
 *
 * Runs cora-test-cases.json against the CORA mock server (port 4005)
 * and prints a pass/fail report in Joule Copilot Studio format.
 *
 * Usage:
 *   # Start mock server first:  node test/mock-server.js
 *   # Then run tests:           node test/joule/run-joule-tests.js
 *
 * Options:
 *   --base-url  Override server base URL (default: http://localhost:4005)
 *   --filter    Run only tests whose testId matches the given prefix (e.g. TC-00 or ACT)
 */

const http    = require('http');
const https   = require('https');
const path    = require('path');
const testSuite = require('./cora-test-cases.json');

// ── Config ───────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const BASE_URL = getArg('--base-url', 'http://localhost:4005');
const FILTER   = getArg('--filter', null);

function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url    = new URL(path, BASE_URL);
    const lib    = url.protocol === 'https:' ? https : http;
    const data   = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = lib.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Assertion helpers ─────────────────────────────────────────────────────────
function checkKeywords(text, keywords) {
  const t = (text || '').toLowerCase();
  return keywords.filter(k => !t.includes(k.toLowerCase()));
}

function checkBotTurn(botResponse, criteria) {
  const issues = [];
  const reply  = botResponse || {};

  // Unwrap nested value (mock server wraps in { value: { ... } })
  const data    = reply.value || reply;
  const message = (data.message || data.rootCauseText || data.answer || '').toLowerCase();
  const recs    = data.recommendations || [];

  // Fallback-only test: just assert the response is non-empty
  if (criteria.fallbackAllowed) {
    if (!message && recs.length === 0) issues.push('Response is completely empty (expected at least a message)');
    return issues;
  }

  if (criteria.responseNotEmpty && !message) {
    issues.push('Response message is empty');
  }

  if (criteria.rootCauseKeywords) {
    const combined = message + ' ' + (data.errorSummary?.rootCauseText || '');
    const missing  = checkKeywords(combined, criteria.rootCauseKeywords);
    if (missing.length) issues.push(`Missing keywords in response: ${missing.join(', ')}`);
  }

  if (criteria.minRecommendations !== undefined && recs.length < criteria.minRecommendations) {
    issues.push(`Expected >= ${criteria.minRecommendations} recommendations, got ${recs.length}`);
  }

  if (criteria.expectedRecommendations) {
    criteria.expectedRecommendations.forEach((exp, i) => {
      const rec = recs[i];
      if (!rec) { issues.push(`Missing recommendation[${i}]`); return; }
      if (exp.priority && rec.priority !== exp.priority)
        issues.push(`rec[${i}] priority: expected ${exp.priority}, got ${rec.priority}`);
      if (exp.actionCode && rec.actionCode !== exp.actionCode)
        issues.push(`rec[${i}] actionCode: expected ${exp.actionCode}, got ${rec.actionCode}`);
      if (exp.titleContains && !rec.title?.toLowerCase().includes(exp.titleContains.toLowerCase()))
        issues.push(`rec[${i}] title missing "${exp.titleContains}": "${rec.title}"`);
    });
  }

  return issues;
}

function checkActionResult(result, expected) {
  const issues = [];
  const data   = result.value || result;
  if (expected.success !== undefined && data.success !== expected.success)
    issues.push(`Expected success=${expected.success}, got ${data.success}`);
  if (expected.messageContains) {
    const msg = (data.message || '').toLowerCase();
    if (!msg.includes(expected.messageContains.toLowerCase()))
      issues.push(`Expected message to contain "${expected.messageContains}"`);
  }
  if (expected.workflowId === null && data.workflowId != null && !expected.workflowIdPattern)
    issues.push(`Expected no workflowId, got "${data.workflowId}"`);
  if (expected.workflowIdPattern && data.workflowId) {
    const re = new RegExp(expected.workflowIdPattern);
    if (!re.test(data.workflowId))
      issues.push(`workflowId "${data.workflowId}" does not match ${expected.workflowIdPattern}`);
  }
  if (expected.fioriUrlContains && data.fioriUrl) {
    if (!data.fioriUrl.includes(expected.fioriUrlContains))
      issues.push(`fioriUrl "${data.fioriUrl}" missing "${expected.fioriUrlContains}"`);
  }
  return issues;
}

// ── Session state ─────────────────────────────────────────────────────────────
let sessionId  = 'joule-test-' + Date.now();
let errorCache = {};   // testId → errorId resolved from /error/Errors

async function resolveErrorId(context) {
  if (!context || !context.errorCode) return null;
  if (errorCache[context.errorCode]) return errorCache[context.errorCode];
  const resp   = await request('GET', '/error/Errors');
  const errors = resp.body?.value || [];
  const found  = errors.find(e => e.errorCode === context.errorCode && (!context.costCenter || e.costCenter === context.costCenter));
  const id     = found?.ID || null;
  if (id) errorCache[context.errorCode] = id;
  return id;
}

// Resolve __RESOLVE_ERRORCODE__ tokens in action test inputs
async function resolveActionErrorId(rawId) {
  if (!rawId || !rawId.startsWith('__RESOLVE_')) return rawId;
  const code = rawId.replace('__RESOLVE_', '').replace('__', '');
  return resolveErrorId({ errorCode: code });
}

// ── Test runners ──────────────────────────────────────────────────────────────
async function runConversationTest(test) {
  let lastBotResponse = null;
  let sessionLocal    = sessionId + '-' + test.testId;
  const issues        = [];

  for (const turn of test.turns) {
    if (turn.role === 'user') {
      const errorId = await resolveErrorId(turn.context);
      const payload = { input: { sessionId: sessionLocal, message: turn.message, errorId } };
      const resp    = await request('POST', '/agent/chat', payload);
      lastBotResponse = resp.body;
    } else {
      // bot turn — validate last response
      const turnIssues = checkBotTurn(lastBotResponse, turn.acceptanceCriteria);
      issues.push(...turnIssues);
    }
  }

  return issues;
}

async function runActionTest(test) {
  const input  = { ...test.input };
  input.errorId = await resolveActionErrorId(input.errorId);
  const resp   = await request('POST', '/agent/executeAction', { input });
  return checkActionResult(resp.body, test.expectedOutput);
}

async function runFeedbackTest(test) {
  const resp = await request('POST', '/agent/submitFeedback', test.input);
  const data  = resp.body?.value || resp.body;
  return data?.success ? [] : [`submitFeedback returned success=${data?.success}`];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  CORA — Joule Skill Test Runner  (${BASE_URL})`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Reset mock data to clean state
  try {
    await request('POST', '/test/reset', {});
    console.log('[setup] Mock data reset ✓\n');
  } catch {
    console.warn('[setup] Could not reset mock data — is the mock server running?\n');
    process.exit(1);
  }

  const allTests = [
    ...testSuite.conversationTests.map(t => ({ ...t, _runner: runConversationTest })),
    ...testSuite.actionTests.map(t => ({ ...t, _runner: runActionTest })),
    ...testSuite.feedbackTests.map(t => ({ ...t, _runner: runFeedbackTest })),
  ].filter(t => !FILTER || t.testId.startsWith(FILTER));

  let passed = 0, failed = 0;
  const failures = [];

  for (const test of allTests) {
    process.stdout.write(`  [${test.testId}] ${test.name} ... `);
    try {
      const issues = await test._runner(test);
      if (issues.length === 0) {
        console.log('✓ PASS');
        passed++;
      } else {
        console.log('✗ FAIL');
        failures.push({ testId: test.testId, name: test.name, issues });
        failed++;
      }
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
      failures.push({ testId: test.testId, name: test.name, issues: [err.message] });
      failed++;
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`  Results: ${passed} passed, ${failed} failed (${allTests.length} total)`);
  console.log('─────────────────────────────────────────────────────────────');

  if (failures.length > 0) {
    console.log('\nFailure details:');
    failures.forEach(f => {
      console.log(`\n  [${f.testId}] ${f.name}`);
      f.issues.forEach(i => console.log(`    - ${i}`));
    });
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
