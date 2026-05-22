'use strict';

// Static SAP error pattern rules — used by the rule-based pass in root-cause-engine
// before invoking AI. Keyed by messageClass prefix for fast lookup.

const LAYER_MAP = {
  KS: 'MASTER_DATA',
  KP: 'TRANSACTION',
  KI: 'TRANSACTION',
  KO: 'CONFIG',
  BU: 'TRANSACTION',
  F5: 'TRANSACTION',
  GR: 'TRANSACTION',
  AA: 'MASTER_DATA',
  KSW: 'CONFIG',
  K2: 'CONFIG',
  '7Q': 'AUTHORIZATION',
  SU: 'AUTHORIZATION',
};

const FIORI_APP_MAP = {
  MASTER_DATA:   { appId: 'F1482', appTitle: 'Manage Cost Centers' },
  TRANSACTION:   { appId: 'F1515', appTitle: 'Display Line Items - General Ledger' },
  CONFIG:        { appId: 'F1381', appTitle: 'Manage Allocations' },
  AUTHORIZATION: { appId: 'NONE',  appTitle: 'Contact System Administrator' },
};

const ACTION_MAP = {
  MASTER_DATA:   ['UPDATE_COSTCENTER', 'LAUNCH_FIORI', 'CREATE_WORKFLOW'],
  TRANSACTION:   ['RETRY_POSTING',     'LAUNCH_FIORI', 'CREATE_WORKFLOW'],
  CONFIG:        ['CREATE_WORKFLOW',   'LAUNCH_FIORI', 'ESCALATE'],
  AUTHORIZATION: ['CREATE_WORKFLOW',   'ESCALATE'],
};

// Known period-lock message classes
const PERIOD_LOCK_CLASSES = new Set(['BU011', 'BU012', 'BU013', 'F5702', 'ZPER']);

// Known authorization error classes
const AUTH_ERROR_CLASSES = new Set(['7Q299', '7Q300', 'SU53']);

function classifyLayer(messageClass, errorCode) {
  if (AUTH_ERROR_CLASSES.has(errorCode)) return 'AUTHORIZATION';
  if (PERIOD_LOCK_CLASSES.has(errorCode)) return 'TRANSACTION';

  const prefix = Object.keys(LAYER_MAP).find(p => messageClass.startsWith(p));
  return prefix ? LAYER_MAP[prefix] : 'UNKNOWN';
}

function getRecommendedActions(layer) {
  return ACTION_MAP[layer] || ['CREATE_WORKFLOW', 'ESCALATE'];
}

function getFioriApp(layer) {
  return FIORI_APP_MAP[layer] || { appId: 'NONE', appTitle: 'Contact Support' };
}

function isHighPriority(errorCode, processContext) {
  const monthEndKeywords = ['period-end', 'month-end', 'allocation', 'assessment', 'settlement'];
  const contextLower = (processContext || '').toLowerCase();
  return PERIOD_LOCK_CLASSES.has(errorCode) || monthEndKeywords.some(k => contextLower.includes(k));
}

module.exports = { classifyLayer, getRecommendedActions, getFioriApp, isHighPriority, LAYER_MAP };
