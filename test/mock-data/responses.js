'use strict';

// Canned AI responses for each SAP error code.
// Each entry contains: message (chat reply), rootCauseText, and recommendations[].
// Template variables like {costCenter}, {documentNumber} are replaced at runtime.

const RESPONSES = {

  KS113: {
    rootCauseText: 'Cost center {costCenter} has an active primary posting block (IsBlockedForPrimCosts = X) applied during period-end close on 31-May-2026. Finance controls restrict late postings to ensure accurate period reporting.',
    message: `I've analyzed error **KS113** for cost center **{costCenter}**.

🔍 **Root Cause:**
Cost center {costCenter} has an active **posting block** for primary costs. This lock was set during period-end close procedures on 31-May-2026 to prevent late or unauthorized postings after the books are closed for period 05/2026.

📋 **Cost Center Details (live):**
• Status: Locked for primary postings
• Hierarchy: COST_H1 > EMEA > Finance
• Profit Center: PC-EMEA
• Responsible Person: Sarah Chen

The posting block is a standard financial control — it does not mean the cost center is deactivated. I've prepared 3 resolution options for you below. ⬇️`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 94,
        title: 'Request cost center unlock via workflow',
        description: 'Create an approval workflow ticket to the Controlling team (Sarah Chen) to temporarily unlock CC{costCenter} for the specific posting. Most efficient for urgent month-end postings.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Unlock CC {costCenter} for posting {documentNumber}","description":"Primary posting block active on {costCenter}. Requesting emergency unlock for document {documentNumber} (EUR) in period 05/2026."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 82,
        title: 'Post to alternative active cost center CC1001',
        description: 'CC1001 (Finance Operations Backup) is active for the same period with the same hierarchy assignment. Use as a substitute if posting is time-critical.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F1482","description":"Navigate to Manage Cost Centers to verify CC1001 is suitable"}'
      },
      {
        priority: 'LOW',
        confidence: 71,
        title: 'Escalate to Controlling team lead',
        description: 'If the workflow is not approved within 30 minutes during month-end, escalate to the CO team lead via Teams notification for emergency resolution.',
        actionCode: 'ESCALATE',
        actionPayload: '{"channel":"TEAMS","escalationLevel":"CO_SUPPORT_LEAD"}'
      }
    ]
  },

  BU011: {
    rootCauseText: 'Fiscal period 05/2026 was closed for G/L account type S (General Ledger) in company code {companyCode} at 00:00 on 01-Jun-2026. The batch job attempted postings after the period closure.',
    message: `I've analyzed error **BU011** — posting period closed.

🔍 **Root Cause:**
Fiscal period **05/2026** was closed for account type **S (G/L)** in company code {companyCode} at midnight on 01-Jun-2026. Your batch job started at 00:30 and attempted to post {documentNumber} to the already-closed period.

📋 **Period Status:**
• Period 05/2026: ❌ **CLOSED** (since 01-Jun-2026 00:00)
• Period 06/2026: ✅ **OPEN** (available for posting)
• Account Type: S — General Ledger

⚠️ This affected the overnight batch run — multiple documents may have failed. I have 3 resolution paths ready:`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 96,
        title: 'Re-post failed documents to open period 06/2026',
        description: 'If all failed documents represent June expenses (just processed late), posting to period 06 is the cleanest approach. Add document text explaining the delay for audit trail.',
        actionCode: 'RETRY_POSTING',
        actionPayload: '{"documentNumber":"{documentNumber}","newPeriod":"006","fiscalYear":"2026","note":"Late posting — period 05 closed. Authorized by Finance Ops."}'
      },
      {
        priority: 'HIGH',
        confidence: 88,
        title: 'Request emergency period re-opening',
        description: 'For true May expenses that must hit period 05, request emergency period re-opening via workflow. Requires Finance Director + Audit sign-off. Use only for material amounts.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Emergency period re-open request — 05/2026","description":"Batch job {documentNumber} failed due to period closure. Requesting re-open of 05/2026 for G/L account type S in company code {companyCode}."}'
      },
      {
        priority: 'LOW',
        confidence: 65,
        title: 'Adjust batch job schedule',
        description: 'Preventive action: reschedule the overnight batch to complete before 23:30 to avoid future period-close conflicts. Raise a change request with IT.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Batch schedule adjustment request","description":"Recurring BU011 issue — batch job running after period close at midnight. Request schedule change to 23:00."}'
      }
    ]
  },

  KP006: {
    rootCauseText: 'Cost center {costCenter} has consumed 108% of its annual budget for cost element 430000 (IT Services) in fiscal year 2026. The new commitment of EUR 15,000 would push overshoot to 114%.',
    message: `I've analyzed error **KP006** — budget exceeded on cost center **{costCenter}**.

🔍 **Root Cause:**
Cost center {costCenter} has exceeded its **annual budget** for cost element 430000 (IT Services). Availability control is blocking new commitments.

📊 **Budget Status (live data):**
\`\`\`
Total Budget:     EUR  250,000
Consumed:         EUR  270,000  (108%)
Overshoot:        EUR   20,000
New Commitment:   EUR   15,000
Total if Approved: EUR  285,000 (114%)
\`\`\`

The overshoot originated from an unplanned cloud infrastructure upgrade in Q1 2026 that consumed EUR 45,000 above plan. I have 3 options:`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 91,
        title: 'Request budget supplement via workflow',
        description: 'Submit a budget increase request to the Cost Center Manager (John Davies) for EUR 35,000 to cover current overshoot + new commitment. Approval typically takes 1–2 business days.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Budget supplement request — {costCenter} IT Services","description":"CC {costCenter} has exceeded 2026 budget by EUR 20,000. Requesting EUR 35,000 supplement to cover overshoot and new EUR 15,000 commitment."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 79,
        title: 'Transfer budget from IT pool cost center CC3001',
        description: 'CC3001 (IT Budget Pool) has EUR 45,000 unspent in cost element 430000. A budget transfer requires the same manager approval but is faster than a supplement.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F0840","description":"Open Cost Center Budget Management to initiate transfer from CC3001 to {costCenter}"}'
      },
      {
        priority: 'LOW',
        confidence: 68,
        title: 'Defer non-critical IT spend to next period',
        description: 'Review open commitments on {costCenter} — defer non-critical IT services to period 07 or 08 to bring current overshoot within tolerance.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F1515","description":"Display line items for {costCenter} to identify deferrable commitments"}'
      }
    ]
  },

  '7Q299': {
    rootCauseText: 'User {userId} is missing authorization object K_CSKS with activity 03 (Display) for cost center {costCenter} in controlling area {controllingArea}. The user\'s role does not include access to the R&D cost center group.',
    message: `I've analyzed error **7Q299** — authorization failure for user **{userId}**.

🔍 **Root Cause:**
User {userId} is missing the required **SAP authorization** to access cost center {costCenter}.

🔐 **Missing Authorization:**
\`\`\`
Authorization Object: K_CSKS
Field:  KOSTL (Cost Center) = {costCenter}
Action: ACTVT = 03 (Display)
Role needed: CC_RD_VIEWER
\`\`\`

Cost center {costCenter} belongs to the **R&D** organizational unit, which requires a specific role assignment that is not included in the standard finance user profile. New hires often encounter this as IT onboarding doesn't always include R&D cost center access.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 99,
        title: 'Submit IT access request for role CC_RD_VIEWER',
        description: 'Create an IT helpdesk ticket requesting role "CC_RD_VIEWER" for user {userId}. This grants display access to R&D cost centers. Standard approval time: 1–2 business days.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Access request: CC_RD_VIEWER for {userId}","description":"User {userId} requires role CC_RD_VIEWER to display cost center {costCenter} (R&D group). K_CSKS authorization object missing. Please assign the role."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 75,
        title: 'Request manager to expedite via emergency access',
        description: "If the access is needed urgently today, your manager can request a temporary 24-hour emergency access via the IT Security portal (FireFighter / GRC Access Risk Management).",
        actionCode: 'ESCALATE',
        actionPayload: '{"channel":"TEAMS","escalationLevel":"IT_SECURITY_ADMIN","message":"Urgent: {userId} needs emergency display access to CC {costCenter} for month-end reporting"}'
      },
      {
        priority: 'LOW',
        confidence: 60,
        title: 'Check SU53 authorization trace',
        description: 'For detailed authorization trace analysis, navigate to transaction SU53 to view the exact authorization check that failed and the current role assignments.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"NONE","description":"Run SU53 transaction in SAP GUI to review authorization failure details for {userId}"}'
      }
    ]
  },

  KI235: {
    rootCauseText: 'Cost element 430500 is categorized as type 1 (Primary costs) but cost center {costCenter} is category A (Production), which only accepts cost elements of type 3. The Chart of Accounts was recently updated introducing this mismatch.',
    message: `I've analyzed error **KI235** — cost element category mismatch on cost center **{costCenter}**.

🔍 **Root Cause:**
Cost element **430500** (External IT Consulting) has an incompatible category for cost center **{costCenter}**.

📋 **Category Mismatch:**
\`\`\`
Cost Element 430500:    Category 1 (Primary — Overhead)
Cost Center {costCenter}:  Category A (Production)
Permitted Categories:   3, 11, 12 (Production-specific)
\`\`\`

This mismatch was introduced after the Chart of Accounts restructuring in April 2026, where 430500 was recategorized. Cost centers in the production group (Category A) have restrictions on which cost elements can be posted directly.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 89,
        title: 'Reassign cost element 430500 to compatible category',
        description: 'Change the cost element category of 430500 to type 3 (Overhead allocation) so it is compatible with production cost centers. Requires CO Administrator authorization.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Cost element 430500 category correction","description":"430500 is category 1 but needs to be compatible with production cost centers (category A). Request change to category 3."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 80,
        title: 'Post using compatible cost element 430510',
        description: 'Cost element 430510 (External Services — Production) is already assigned to Category A cost centers and covers the same expense type. Use as an immediate workaround.',
        actionCode: 'RETRY_POSTING',
        actionPayload: '{"documentNumber":"{documentNumber}","newCostElement":"430510","note":"Using 430510 instead of 430500 — category compatibility issue pending resolution"}'
      },
      {
        priority: 'LOW',
        confidence: 72,
        title: 'Update cost element group assignment',
        description: 'Add 430500 to the cost element group permitted for Category A cost centers. This is a configuration change requiring CO team review to avoid downstream impacts.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F2610","description":"Navigate to Manage Cost Elements to review and update group assignment for 430500"}'
      }
    ]
  },

  KI261: {
    rootCauseText: 'Assessment cycle EMEA_IT_ALLOC failed because receiver cost center {costCenter} has an expired validity end date (28-Feb-2026). The cost center was not extended during the annual master data maintenance cycle.',
    message: `I've analyzed error **KI261** — assessment cycle failure on **{costCenter}**.

🔍 **Root Cause:**
Assessment cycle **EMEA_IT_ALLOC** cannot post to receiver cost center **{costCenter}** because its validity expired on **28-Feb-2026**.

📋 **Cost Center Details:**
\`\`\`
Cost Center:     {costCenter} — Legacy IT Operations
Valid From:      01-Jan-2020
Valid To:        28-Feb-2026  ← EXPIRED
Controlling Area: {controllingArea}
\`\`\`

The cycle has 4 receivers ({costCenter}, CC5051, CC5052, CC5053). The other 3 are active — only {costCenter} is blocking the entire cycle from completing.

**Financial Impact:** EUR 45,000 of IT overhead costs are not being allocated to the R&D division this period.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 93,
        title: 'Extend validity of cost center to 31-Dec-2026',
        description: 'Extend CC {costCenter} validity to end of fiscal year via Manage Cost Centers (F1482). Once extended, re-run cycle EMEA_IT_ALLOC to complete the allocation.',
        actionCode: 'UPDATE_COSTCENTER',
        actionPayload: '{"costCenter":"{costCenter}","controllingArea":"{controllingArea}","fieldToChange":"ValidityEndDate","newValue":"2026-12-31"}'
      },
      {
        priority: 'MEDIUM',
        confidence: 85,
        title: 'Replace expired receiver with active CC5054',
        description: 'If CC{costCenter} is being permanently decommissioned, update the EMEA_IT_ALLOC cycle to replace {costCenter} with CC5054 (New IT Operations) as the receiver.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F1381","description":"Open Manage Allocations to update EMEA_IT_ALLOC receiver — replace {costCenter} with CC5054"}'
      },
      {
        priority: 'LOW',
        confidence: 74,
        title: 'Post manual correcting journal entry',
        description: 'If re-running the cycle is not possible this period, post a manual correcting entry for EUR 45,000 to allocate IT costs to the R&D cost centers directly.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F1514","description":"Open Post Journal Entries to manually allocate the EUR 45,000 IT overhead to R&D cost centers"}'
      }
    ]
  },

  KP042: {
    rootCauseText: 'Activity type MACH_HR (Machine Hours) was active for cost center {costCenter} in fiscal year 2025 but was not carried forward into the 2026 planning cycle during the annual planning setup in December 2025.',
    message: `I've analyzed error **KP042** — activity type not assigned to cost center **{costCenter}**.

🔍 **Root Cause:**
Activity type **MACH_HR** (Machine Hours) is **not assigned** to cost center {costCenter} for fiscal year 2026.

📋 **Activity Type Status:**
\`\`\`
MACH_HR on CC{costCenter} FY2025: ✅ Active
MACH_HR on CC{costCenter} FY2026: ❌ NOT ASSIGNED
\`\`\`

**Currently assigned to {costCenter} in 2026:**
• LABOR_HR (Labour Hours) — active
• SETUP_HR  (Setup Hours)  — active

MACH_HR was excluded from the 2026 annual planning cycle — likely due to the production line consolidation project that was planned but not yet completed. The internal order ORDS-2341 is trying to confirm machine hours that aren't planned.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 87,
        title: 'Assign MACH_HR to CC{costCenter} for FY 2026',
        description: 'Add activity type MACH_HR to cost center {costCenter} planning for FY 2026 via KP26 (Activity Type/Price Planning). Set planned quantity and confirm price before re-posting.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F0844","description":"Navigate to Activity Type Planning (KP26) to assign MACH_HR to {costCenter} for FY 2026 with planned quantity"}'
      },
      {
        priority: 'MEDIUM',
        confidence: 76,
        title: 'Use SETUP_HR as substitute activity type',
        description: 'SETUP_HR is already assigned to {costCenter} and can cover machine setup time as an interim measure. Update the routing on order ORDS-2341 to use SETUP_HR.',
        actionCode: 'RETRY_POSTING',
        actionPayload: '{"documentNumber":"{documentNumber}","substituteActivityType":"SETUP_HR","note":"Using SETUP_HR as interim — MACH_HR not yet planned for 2026"}'
      },
      {
        priority: 'LOW',
        confidence: 65,
        title: 'Post manual cost correction',
        description: 'Post a manual cost correction entry for the machine hours amount on order ORDS-2341 using a primary cost element to bypass the activity type validation.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Manual cost correction — ORDS-2341 machine hours","description":"MACH_HR not assigned to {costCenter} for 2026. Requesting approval for manual cost entry of machine hours amount."}'
      }
    ]
  },

  KS124: {
    rootCauseText: 'Cost center {costCenter} has a validity end date of 28-Feb-2026. The posting date 31-May-2026 falls outside the valid date range. This cost center was not included in the annual master data extension performed in January 2026.',
    message: `I've analyzed error **KS124** — cost center **{costCenter}** validity expired.

🔍 **Root Cause:**
Cost center **{costCenter}** is **no longer valid** on the posting date 31-May-2026.

📋 **Validity Details:**
\`\`\`
Cost Center:   {costCenter} — Legacy Travel Expense CC
Valid From:    01-Jan-2018
Valid To:      28-Feb-2026  ← EXPIRED 3 months ago
Posting Date:  31-May-2026  ← OUTSIDE valid range
\`\`\`

This cost center was not included in the annual validity extension performed in January 2026. It has likely been superseded by a new cost center structure but the vendor master and employee expense templates still reference the old code.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 93,
        title: 'Extend cost center validity to 31-Dec-2026',
        description: 'Extend the validity period of {costCenter} to end of fiscal year via Manage Cost Centers (F1482). This is the fastest fix and allows all pending postings to proceed.',
        actionCode: 'UPDATE_COSTCENTER',
        actionPayload: '{"costCenter":"{costCenter}","controllingArea":"{controllingArea}","fieldToChange":"ValidityEndDate","newValue":"2026-12-31"}'
      },
      {
        priority: 'MEDIUM',
        confidence: 84,
        title: 'Post to replacement cost center CC6001',
        description: 'CC6001 (Travel & Expenses 2026) was created as the replacement for {costCenter}. Update the vendor master / employee expense template to use CC6001 going forward.',
        actionCode: 'RETRY_POSTING',
        actionPayload: '{"documentNumber":"{documentNumber}","newCostCenter":"CC6001","note":"Posting to CC6001 as {costCenter} validity expired"}'
      },
      {
        priority: 'LOW',
        confidence: 70,
        title: 'Mass update vendor/employee templates',
        description: 'After resolving this posting, run a mass update of all vendor payment terms and employee expense templates that still reference {costCenter} to prevent recurring errors.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Mass update: replace {costCenter} references","description":"Cost center {costCenter} expired — need to update all vendor masters and HR expense templates still referencing this cost center."}'
      }
    ]
  }
};

const GENERAL_RESPONSES = {
  trends: {
    message: `📊 **Top Recurring Errors — May 2026**

Here's a summary of the most frequent error patterns loaded in the system:

| # | Code  | Count | Layer         | Root Cause |
|---|-------|-------|---------------|------------|
| 1 | BU011 |  89   | TRANSACTION   | Batch jobs running after period close |
| 2 | KS113 |  67   | MASTER_DATA   | Cost centers locked — no automatic review |
| 3 | 7Q299 |  43   | AUTHORIZATION | New hire onboarding missing K_CSKS roles |
| 4 | KP006 |  31   | TRANSACTION   | Q2 IT budget depleted early |
| 5 | KI235 |  28   | TRANSACTION   | Post-CoA restructuring category mismatches |

💡 **Top 3 Preventive Actions:**
1. Reschedule batch jobs to complete before 23:30 (prevents BU011)
2. Add CC lock review to period-end checklist (prevents KS113)
3. Update IT onboarding to include K_CSKS role assignment (prevents 7Q299)`,
    recommendations: []
  },
  posting_fail: {
    message: `Common reasons a cost center posting fails in SAP S/4HANA:

**1. Master Data Issues (KS*)**
• Cost center locked (KS113) — period-end control
• Validity expired (KS124) — not extended for new year
• Profit center not assigned (KS125)

**2. Transaction Issues (KI*, KP*, BU*)**
• Period closed (BU011) — posted after month-end
• Budget exceeded (KP006) — availability control active
• Cost element mismatch (KI235) — category incompatibility

**3. Authorization Issues (7Q*)**
• Missing K_CSKS authorization object
• Company code restriction

Select an error from the left panel for a detailed analysis, or describe your specific error and I'll help you diagnose it! 🔍`,
    recommendations: []
  },
  generic: {
    message: `I'm CORA — your SAP Cost Center Error Resolution Agent. I can help you:

• **Analyze errors** — select one from the left panel for instant AI diagnosis
• **Explain root causes** — in plain business language, no SAP jargon
• **Recommend solutions** — prioritized with confidence scores
• **Execute actions** — retry postings, create workflows, update master data

**Try asking:**
• *"Why did my cost center posting fail?"*
• *"Show me the top recurring errors this month"*
• *"How do I resolve a budget exceeded error?"*
• *"What is error code KS113?"*

Or simply click any error in the left panel to start an analysis! 👈`,
    recommendations: []
  }
};

function getResponse(error, message) {
  const msg = (message || '').toLowerCase();

  // Error-specific response
  if (error && RESPONSES[error.errorCode]) {
    const template = RESPONSES[error.errorCode];
    return {
      rootCauseText: interpolate(template.rootCauseText, error),
      message:       interpolate(template.message,       error),
      recommendations: template.recommendations.map(r => ({
        ID:           generateId(),
        priority:     r.priority,
        confidence:   r.confidence,
        title:        interpolate(r.title,       error),
        description:  interpolate(r.description, error),
        actionCode:   r.actionCode,
        actionPayload: interpolate(r.actionPayload, error),
        status:       'PENDING',
      })),
    };
  }

  // General query detection
  if (msg.includes('trend') || msg.includes('recurring') || msg.includes('top error') || msg.includes('this month')) {
    return { ...GENERAL_RESPONSES.trends, rootCauseText: null };
  }
  if (msg.includes('fail') || msg.includes('why') || msg.includes('posting')) {
    return { ...GENERAL_RESPONSES.posting_fail, rootCauseText: null };
  }
  return { ...GENERAL_RESPONSES.generic, rootCauseText: null };
}

function interpolate(str, error) {
  if (!str || !error) return str;
  return str
    .replace(/\{costCenter\}/g,     error.costCenter     || '')
    .replace(/\{companyCode\}/g,    error.companyCode    || '')
    .replace(/\{controllingArea\}/g,error.controllingArea|| '')
    .replace(/\{documentNumber\}/g, error.documentNumber || 'N/A')
    .replace(/\{fiscalYear\}/g,     error.fiscalYear     || '')
    .replace(/\{fiscalPeriod\}/g,   error.fiscalPeriod   || '')
    .replace(/\{userId\}/g,         error.userId         || '')
    .replace(/\{errorCode\}/g,      error.errorCode      || '');
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

module.exports = { getResponse };
