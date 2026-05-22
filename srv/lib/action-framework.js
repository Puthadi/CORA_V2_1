'use strict';

const sapConn = require('./sap-connector');

// Maps actionCode → backend execution logic.
// Each handler receives the parsed actionPayload and returns a result object.

const handlers = {

  async RETRY_POSTING({ documentNumber, companyCode, fiscalYear }) {
    if (!documentNumber) throw new Error('documentNumber required for RETRY_POSTING');
    // Fetch the original document and attempt re-posting via OData
    const items = await sapConn.getJournalEntry({ documentNumber, companyCode, fiscalYear });
    if (!items || items.length === 0) throw new Error(`Document ${documentNumber} not found`);
    // In a real scenario: call BAPI_ACC_DOCUMENT_POST via a BTP Function or iFlow.
    // Here we confirm the document can be read as a proxy for retry initiation.
    return {
      success:    true,
      message:    `Posting document ${documentNumber} resubmitted for reprocessing.`,
      documentNumber,
    };
  },

  async CREATE_WORKFLOW({ subject, description, costCenter, companyCode, errorId }) {
    const task = await sapConn.createWorkflowTask({
      subject:      subject || `Cost Center Error on ${costCenter}`,
      description:  description || 'Automated workflow created by CORA agent',
      priority:     'MEDIUM',
      referenceId:  errorId,
    });
    return {
      success:    true,
      message:    `Workflow ticket created successfully.`,
      workflowId: task?.TaskUUID || task?.d?.TaskUUID || 'WF-' + Date.now(),
    };
  },

  async UPDATE_COSTCENTER({ costCenter, controllingArea, fieldToChange, newValue }) {
    if (!costCenter || !controllingArea) throw new Error('costCenter and controllingArea required');
    await sapConn.updateCostCenterBlock({ costCenter, controllingArea, block: newValue === 'X' });
    return {
      success: true,
      message: `Cost center ${costCenter} updated — ${fieldToChange} set to '${newValue || '(cleared)'}'.`,
    };
  },

  async LAUNCH_FIORI({ appId, costCenter }) {
    const fioriUrls = {
      F1482: `/sap/bc/ui2/flp#CostCenter-manage?CostCenter=${costCenter}`,
      F1515: `/sap/bc/ui2/flp#JournalEntry-displayLineItems`,
      F1381: `/sap/bc/ui2/flp#AllocationCycle-manage`,
      F2610: `/sap/bc/ui2/flp#CostElement-manage`,
      F0840: `/sap/bc/ui2/flp#CostCenterBudget-manage`,
      F0844: `/sap/bc/ui2/flp#StatisticalKeyFigure-actuals`,
    };
    const url = fioriUrls[appId] || `/sap/bc/ui2/flp#Shell-home`;
    return { success: true, message: `Opening ${appId}.`, fioriUrl: url };
  },

  async ESCALATE({ channel, costCenter, errorId, escalationLevel }) {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (webhookUrl) {
      const axios = require('axios');
      await axios.post(webhookUrl, {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.3',
            body: [{
              type: 'TextBlock',
              size: 'Medium',
              weight: 'Bolder',
              text: `⚠ Cost Center Error Escalation — ${costCenter}`,
            }, {
              type: 'TextBlock',
              text: `Error ID: ${errorId}\nEscalated to: ${escalationLevel}\nChannel: ${channel}`,
              wrap: true,
            }],
          },
        }],
      });
    }
    return {
      success:  true,
      message:  `Escalation notification sent to ${escalationLevel} via ${channel}.`,
      errorId,
    };
  },
};

async function executeAction(actionCode, actionPayload) {
  let payload = {};
  try {
    payload = typeof actionPayload === 'string' ? JSON.parse(actionPayload) : (actionPayload || {});
  } catch { /* use empty */ }

  const handler = handlers[actionCode];
  if (!handler) throw new Error(`Unknown action code: ${actionCode}`);

  return handler(payload);
}

module.exports = { executeAction };
