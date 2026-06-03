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

  // ── New MASTER_DATA responses ─────────────────────────────────────────

  KS214: {
    rootCauseText: 'Cost center {costCenter} was created without a profit center assignment. The FI-CO document splitting rule active in company code {companyCode} requires every cost center to have a profit center for parallel ledger posting.',
    message: `I've analyzed error **KS214** — missing profit center assignment on cost center **{costCenter}**.

🔍 **Root Cause:**
Cost center **{costCenter}** has no **Profit Center** assigned. Your company code {companyCode} has Document Splitting active (NewGL), which mandates that every cost assignment carry a profit center for P&L reporting.

📋 **Master Data Gap:**
\`\`\`
Cost Center:    {costCenter}
Profit Center:  ❌  NOT ASSIGNED
Company Code:   {companyCode}
Splitting Rule: Required (NewGL active)
\`\`\`

The posting for document {documentNumber} was rejected at the FI-CO interface. All open postings to {costCenter} will fail until the profit center is assigned.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 97,
        title: 'Assign profit center to cost center {costCenter}',
        description: 'Open Manage Cost Centers (F1482) and assign the appropriate profit center to {costCenter}. Based on its hierarchy position, PC-{companyCode}-OPS is likely the correct assignment.',
        actionCode: 'UPDATE_COSTCENTER',
        actionPayload: '{"costCenter":"{costCenter}","controllingArea":"{controllingArea}","fieldToChange":"ProfitCenter","newValue":"PC-{companyCode}-OPS"}'
      },
      {
        priority: 'MEDIUM',
        confidence: 81,
        title: 'Temporarily post to CC with existing profit center',
        description: 'If the posting is urgent, re-route document {documentNumber} to a sibling cost center that already has a profit center assigned, until {costCenter} master data is corrected.',
        actionCode: 'RETRY_POSTING',
        actionPayload: '{"documentNumber":"{documentNumber}","note":"Rerouted — profit center missing on {costCenter}"}'
      },
      {
        priority: 'LOW',
        confidence: 65,
        title: 'Run mass profit center assignment check',
        description: 'Execute report RCOPCA01 to identify all cost centers in controlling area {controllingArea} that are missing profit center assignments before they cause further posting failures.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F1482","description":"Run mass check for cost centers without profit center in controlling area {controllingArea}"}'
      }
    ]
  },

  KS301: {
    rootCauseText: 'Cost center {costCenter} references standard hierarchy node HIER_EU, which no longer exists in the controlling area {controllingArea} hierarchy. The node was deleted during a hierarchy restructuring project but the cost center master data was not updated.',
    message: `I've analyzed error **KS301** — standard hierarchy node missing for cost center **{costCenter}**.

🔍 **Root Cause:**
Cost center **{costCenter}** is assigned to hierarchy node **HIER_EU**, which has been **deleted** from the controlling area {controllingArea} hierarchy. This prevents the cost center from being transported or used in planning.

📋 **Hierarchy Status:**
\`\`\`
Cost Center:       {costCenter}
Assigned Node:     HIER_EU  ← DELETED
Controlling Area:  {controllingArea}
Available parent:  HIER_EMEA (active replacement)
\`\`\`

The HIER_EU node was removed during the Q1 2026 organizational restructuring. The cost center master data was not updated as part of the change.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 92,
        title: 'Reassign cost center to active hierarchy node HIER_EMEA',
        description: 'Update {costCenter} master data to reference HIER_EMEA — the active replacement for the deleted HIER_EU node. Use Manage Cost Centers (F1482) to make this change.',
        actionCode: 'UPDATE_COSTCENTER',
        actionPayload: '{"costCenter":"{costCenter}","controllingArea":"{controllingArea}","fieldToChange":"HierarchyNode","newValue":"HIER_EMEA"}'
      },
      {
        priority: 'MEDIUM',
        confidence: 78,
        title: 'Recreate HIER_EU node if multiple cost centers are affected',
        description: 'If other cost centers also reference the deleted HIER_EU node, it may be more efficient to recreate the node in the standard hierarchy rather than updating each cost center individually.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Recreate hierarchy node HIER_EU in controlling area {controllingArea}","description":"Multiple cost centers reference deleted node HIER_EU. Requesting node recreation or mass reassignment."}'
      },
      {
        priority: 'LOW',
        confidence: 60,
        title: 'Run hierarchy consistency check',
        description: 'Execute report RKHCHECK to identify all cost centers in {controllingArea} that reference deleted or invalid hierarchy nodes to scope the full impact of the restructuring.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F1382","description":"Run cost center hierarchy consistency check for controlling area {controllingArea}"}'
      }
    ]
  },

  // ── New TRANSACTION response ───────────────────────────────────────────

  KP007: {
    rootCauseText: 'Cost center {costCenter} has exhausted its commitment budget for cost element 440000 (External Services) by EUR 8,200. The service entry sheet for vendor VEND-0042 would push total commitments to 112% of the annual plan.',
    message: `I've analyzed error **KP007** — commitment budget exhausted on cost center **{costCenter}**.

🔍 **Root Cause:**
Cost center **{costCenter}** has exceeded the **commitment budget** for cost element 440000 (External Services). This is a soft-commitment check triggered when the service entry sheet was confirmed.

📊 **Budget vs Commitment:**
\`\`\`
Annual Plan (440000):   EUR  75,000
Existing Commitments:   EUR  75,000  (100%)
New Commitment:         EUR   8,200
Total if Approved:      EUR  83,200  (111%)
\`\`\`

The overshoot is primarily driven by two unplanned consulting engagements in Q1 2026. I have 3 resolution options:`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 90,
        title: 'Request commitment budget supplement for {costCenter}',
        description: 'Submit a budget supplement request for EUR 10,000 to cover the current overshoot plus a small buffer. Approval from Cost Center Manager and Finance Controller required.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Commitment budget supplement — {costCenter} external services","description":"Cost center {costCenter} cost element 440000 commitment budget exhausted. Requesting EUR 10,000 supplement to cover service entry sheet for VEND-0042 (document {documentNumber})."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 77,
        title: 'Transfer budget from uncommitted cost element 440010',
        description: 'Cost element 440010 (IT Maintenance) has EUR 15,000 uncommitted on {costCenter}. An internal budget transfer would cover the service entry sheet without requiring additional funds.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F0840","description":"Open Cost Center Budget Management to transfer EUR 8,500 from 440010 to 440000 on {costCenter}"}'
      },
      {
        priority: 'LOW',
        confidence: 68,
        title: 'Split service entry across two cost centers',
        description: 'If the vendor service benefits multiple cost centers, split document {documentNumber} across {costCenter} and a second cost center to distribute the commitment.',
        actionCode: 'RETRY_POSTING',
        actionPayload: '{"documentNumber":"{documentNumber}","note":"Split posting requested — commitment budget exhausted on {costCenter}"}'
      }
    ]
  },

  // ── New AUTHORIZATION responses ────────────────────────────────────────

  '7Q156': {
    rootCauseText: 'User {userId} is missing SAP authorization object K_CSKS with activity 03 (Display) for cost center {costCenter}. The user\'s current roles grant access only to cost centers in company code 2000, not 1000.',
    message: `I've analyzed error **7Q156** — authorization failure for user **{userId}** on cost center **{costCenter}**.

🔍 **Root Cause:**
User **{userId}** is missing **display authorization** for cost center {costCenter} in company code {companyCode}.

🔐 **Missing Authorization:**
\`\`\`
Object:    K_CSKS
Activity:  03 (Display)
Cost Ctr:  {costCenter}
CO Area:   {controllingArea}
Role gap:  Z_CC_FINANCE_DISPLAY not assigned
\`\`\`

{userId} can access cost centers in company code 2000 but their role profile does not cover the {companyCode} cost center group. This commonly occurs after inter-company moves or when users need cross-entity reporting access.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 98,
        title: 'Assign role Z_CC_FINANCE_DISPLAY for company code {companyCode}',
        description: 'Submit an IT access request to add role Z_CC_FINANCE_DISPLAY scoped to company code {companyCode} for user {userId}. This grants read-only access to all cost centers in {companyCode}.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Access request: Z_CC_FINANCE_DISPLAY for {userId} in {companyCode}","description":"User {userId} requires display access to cost center {costCenter} in company code {companyCode}. Please assign role Z_CC_FINANCE_DISPLAY with appropriate org-level restriction."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 74,
        title: 'Request temporary firefighter access for urgent reports',
        description: 'If access is needed today for month-end reporting, request a 24-hour firefighter session via SAP GRC Access Risk Management to temporarily grant display rights.',
        actionCode: 'ESCALATE',
        actionPayload: '{"channel":"TEAMS","escalationLevel":"IT_SECURITY_ADMIN","message":"Urgent: {userId} needs temporary display access to CC {costCenter} in {companyCode} for month-end reporting"}'
      },
      {
        priority: 'LOW',
        confidence: 60,
        title: 'Review authorization trace with SU53',
        description: 'Run SU53 after reproducing the error to get the full authorization trace showing exactly which values are missing. Useful for scoping the role change precisely.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"NONE","description":"Run SU53 to review authorization failure details for {userId} on cost center {costCenter}"}'
      }
    ]
  },

  '7Q200': {
    rootCauseText: 'User {userId} attempted to reverse a CO document on cost center {costCenter} but is missing K_CSKS authorization with activity 08 (Reverse) in controlling area {controllingArea}. Standard user roles include display (03) but not reversal rights.',
    message: `I've analyzed error **7Q200** — CO document reversal blocked for user **{userId}**.

🔍 **Root Cause:**
User **{userId}** does not have the **reversal authorization** (activity 08) for cost center {costCenter}. Reversing CO documents is a sensitive operation requiring elevated authorization.

🔐 **Missing Authorization:**
\`\`\`
Object:    K_CSKS
Activity:  08 (Reverse Document)
Cost Ctr:  {costCenter}
CO Area:   {controllingArea}
Document:  {documentNumber}
\`\`\`

Activity 08 is intentionally restricted to CO Team Leads and Controllers to prevent unauthorized reversal of already-approved cost postings. A segregation of duty (SoD) control is in place.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 95,
        title: 'Request CO Team Lead to perform the reversal',
        description: 'The CO Team Lead for cost center {costCenter} already holds activity 08 authorization. Raise a request for them to perform the reversal of document {documentNumber} on your behalf.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"CO document reversal request — {documentNumber}","description":"User {userId} requires reversal of CO document {documentNumber} on cost center {costCenter}. Requesting CO Team Lead action as {userId} lacks activity 08 authorization."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 79,
        title: 'Request temporary activity 08 authorization via GRC',
        description: 'If {userId} regularly performs reversals as part of their role, submit a formal GRC access request to add K_CSKS activity 08 with SoD risk review for the {controllingArea} scope.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"GRC access request: K_CSKS activity 08 for {userId}","description":"User {userId} requires K_CSKS activity 08 (Reverse) for controlling area {controllingArea}. Full SoD risk assessment required before approval."}'
      },
      {
        priority: 'LOW',
        confidence: 62,
        title: 'Check if correcting entry is an alternative',
        description: 'If the original posting cannot wait for reversal authorization, posting a correcting entry (KB11N manual repost) may achieve the same result and only requires standard posting rights.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F1514","description":"Open Manual CO Reposting (KB11N equivalent) to create a correcting entry instead of a full reversal"}'
      }
    ]
  },

  '7Q301': {
    rootCauseText: 'User {userId} attempted to change the cost center plan for {costCenter} in transaction KP06 but is missing K_CSKS activity 70 (Change Plan) in controlling area {controllingArea}. Planning access is restricted to CO Controllers and Budget Managers.',
    message: `I've analyzed error **7Q301** — cost center planning blocked for user **{userId}**.

🔍 **Root Cause:**
User **{userId}** lacks the **planning authorization** (activity 70) needed to modify the annual plan for cost center {costCenter}.

🔐 **Missing Authorization:**
\`\`\`
Object:    K_CSKS
Activity:  70 (Change Cost Center Plan)
Cost Ctr:  {costCenter}
CO Area:   {controllingArea}
User role: Missing Z_CC_PLANNER
\`\`\`

Activity 70 is restricted to designated Cost Center Planners and Budget Managers to ensure planning integrity during the annual planning cycle. Only one authorized planner per cost center hierarchy node is permitted.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 93,
        title: 'Submit access request for role Z_CC_PLANNER',
        description: 'Request role Z_CC_PLANNER scoped to cost center group containing {costCenter} for user {userId}. This role grants planning change rights (activity 70) for the annual KP06 cycle.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Planning access request: Z_CC_PLANNER for {userId}","description":"User {userId} requires K_CSKS activity 70 to complete annual planning for cost center {costCenter} in KP06. Requesting role Z_CC_PLANNER assignment."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 80,
        title: 'Delegate planning to authorized CO Controller',
        description: 'The CO Controller already authorized for {costCenter} planning can accept the plan values on behalf of {userId}. Share the planning data (export from Excel planning template) for review and upload.',
        actionCode: 'ESCALATE',
        actionPayload: '{"channel":"TEAMS","escalationLevel":"CO_CONTROLLER","message":"{userId} requires planning changes on {costCenter} but lacks activity 70. Please review and apply plan values for this cost center."}'
      },
      {
        priority: 'LOW',
        confidence: 58,
        title: 'Use Excel Upload template as alternative input',
        description: 'CO Planners can submit planning data via an Excel upload template (transaction KP16) which is processed by the system administrator, bypassing the direct KP06 authorization requirement.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F0844","description":"Submit plan data via Excel upload template for {costCenter} to CO administrator for processing"}'
      }
    ]
  },

  SU530: {
    rootCauseText: 'User {userId} attempted to repost costs on cost center {costCenter} via KB15N but the role Z_CO_POSTING is not assigned. This role is required for cost reposting (activity RE) in controlling area {controllingArea}.',
    message: `I've analyzed error **SU530** — missing role for cost reposting by user **{userId}**.

🔍 **Root Cause:**
User **{userId}** is missing role **Z_CO_POSTING**, which grants the K_CSKS authorization needed for cost reposting (activity RE) on cost center {costCenter}.

🔐 **Missing Authorization:**
\`\`\`
Object:    K_CSKS
Activity:  RE (Repost)
Cost Ctr:  {costCenter}
CO Area:   {controllingArea}
Document:  {documentNumber}
Missing:   Role Z_CO_POSTING
\`\`\`

The SU53 trace confirms Z_CO_POSTING was present until 01-May-2026 when a role synchronization job removed it during a periodic GRC compliance cleanup. This is likely affecting multiple users.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 96,
        title: 'Re-assign role Z_CO_POSTING to user {userId}',
        description: 'Role Z_CO_POSTING was removed from {userId} during the May GRC cleanup. Re-assign it immediately via IT helpdesk — this is a restoration, not a new access request, which should expedite approval.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Role restoration: Z_CO_POSTING for {userId}","description":"Role Z_CO_POSTING was incorrectly removed from {userId} during 01-May-2026 GRC cleanup. User requires this role for authorized cost reposting on CC {costCenter}. Please restore immediately."}'
      },
      {
        priority: 'HIGH',
        confidence: 88,
        title: 'Check if other users are also affected by GRC cleanup',
        description: 'The May GRC cleanup likely removed Z_CO_POSTING from multiple users. Run an authorization comparison report to identify all affected users before the month-end reposting window closes.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Audit: Z_CO_POSTING removed by GRC cleanup on 01-May-2026","description":"Check all users who lost Z_CO_POSTING role during GRC cleanup. Repost rights are needed for month-end close."}'
      },
      {
        priority: 'LOW',
        confidence: 65,
        title: 'Use firefighter access for immediate reposting',
        description: 'Request a firefighter session to complete the urgent reposting of document {documentNumber} on {costCenter} today while the permanent role restoration is being processed.',
        actionCode: 'ESCALATE',
        actionPayload: '{"channel":"TEAMS","escalationLevel":"IT_SECURITY_ADMIN","message":"Urgent: {userId} needs firefighter access for cost reposting on {costCenter} — Z_CO_POSTING removed by GRC cleanup"}'
      }
    ]
  },

  // ── New CONFIG responses ───────────────────────────────────────────────

  KI110: {
    rootCauseText: 'Cost center {costCenter} was created without a Business Area assignment. The Document Splitting configuration in company code {companyCode} requires a Business Area on every cost object for segment reporting under IFRS 8.',
    message: `I've analyzed error **KI110** — missing Business Area on cost center **{costCenter}**.

🔍 **Root Cause:**
The FI document posting was rejected because cost center **{costCenter}** has no **Business Area** assigned, and the Document Splitting rule in company code {companyCode} mandates Business Area derivation for every cost object.

📋 **Configuration Gap:**
\`\`\`
Cost Center:    {costCenter}
Business Area:  ❌  NOT ASSIGNED
Splitting Rule: IFRS8_BA (active in {companyCode})
Document:       {documentNumber}
\`\`\`

Business Area is a mandatory attribute for segment reporting. Cost centers created during the system migration were imported without this field, triggering errors when document splitting is active.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 95,
        title: 'Assign Business Area to cost center {costCenter}',
        description: 'Open Manage Cost Centers (F1482) and assign the appropriate Business Area (e.g., BA_EMEA or BA_CORP) to {costCenter}. The correct area can be confirmed from the profit center assignment.',
        actionCode: 'UPDATE_COSTCENTER',
        actionPayload: '{"costCenter":"{costCenter}","controllingArea":"{controllingArea}","fieldToChange":"BusinessArea","newValue":"BA_EMEA"}'
      },
      {
        priority: 'MEDIUM',
        confidence: 80,
        title: 'Configure automatic Business Area derivation rule',
        description: 'Add a substitution rule in FI (transaction GGB1) to automatically derive the Business Area from the Profit Center assignment. This will prevent future KI110 errors for newly created cost centers.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"NONE","description":"Configure FI substitution rule GGB1 to derive Business Area from Profit Center for company code {companyCode}"}'
      },
      {
        priority: 'LOW',
        confidence: 68,
        title: 'Run mass Business Area assignment for migration batch',
        description: 'Execute a mass update via LSMW or BAPIs to assign Business Areas to all cost centers from the migration batch that are missing this field in controlling area {controllingArea}.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Mass Business Area assignment — post-migration cleanup","description":"Multiple cost centers created during system migration are missing Business Area in {controllingArea}. Request mass update via LSMW."}'
      }
    ]
  },

  KI220: {
    rootCauseText: 'The Reconciliation Ledger is not active for controlling area {controllingArea}. Cross-company-code cost allocation cycles require the reconciliation ledger to be enabled so that inter-company CO postings generate corresponding FI documents for balance sheet reconciliation.',
    message: `I've analyzed error **KI220** — Reconciliation Ledger not active for controlling area **{controllingArea}**.

🔍 **Root Cause:**
The cross-company-code cost allocation cycle cannot post because the **Reconciliation Ledger** is disabled in controlling area {controllingArea}. Without it, CO postings that span company codes cannot generate the required FI clearing documents.

📋 **Configuration Status:**
\`\`\`
Controlling Area:     {controllingArea}
Reconciliation Ledger: ❌  INACTIVE
Cross-CC Postings:     BLOCKED
Affected Cycle:        EMEA cross-company allocation
\`\`\`

The reconciliation ledger was deactivated during the S/4HANA migration as it was believed to be replaced by the Universal Journal — however, the cross-company allocation cycles still require it to be enabled.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 88,
        title: 'Activate Reconciliation Ledger in controlling area {controllingArea}',
        description: 'Navigate to CO configuration (SPRO > Controlling > General > Activate Reconciliation Ledger) and enable it for {controllingArea}. This is a system-wide setting requiring Basis support and a restart.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Activate Reconciliation Ledger — controlling area {controllingArea}","description":"Cross-company CO allocation cycles are blocked. Reconciliation Ledger must be activated in {controllingArea} to enable inter-company FI clearing documents. Requires Basis team action."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 75,
        title: 'Post cross-company allocations as FI direct entries',
        description: 'As a short-term workaround, replace the CO allocation cycle with direct FI journal entries posted via FB50 across company codes. This bypasses the CO reconciliation ledger requirement.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F0718","description":"Post cross-company journal entries directly in FI as an alternative to CO allocation cycle"}'
      },
      {
        priority: 'LOW',
        confidence: 60,
        title: 'Redesign allocation cycle as single-company-code',
        description: 'If cross-company allocation is not mandatory, restructure the cycle to operate within a single company code using internal orders or profit center transfers as the distribution mechanism.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Allocation cycle redesign — remove cross-company requirement","description":"Evaluate restructuring EMEA allocation cycle to stay within single company code and avoid reconciliation ledger dependency."}'
      }
    ]
  },

  KAUF: {
    rootCauseText: 'Overhead costing sheet ZOVER01 is not assigned to cost center {costCenter} or its cost element in the costing variant. Without this assignment, the system cannot calculate and apply overhead surcharges to production orders.',
    message: `I've analyzed error **KAUF** — overhead costing sheet not assigned to cost center **{costCenter}**.

🔍 **Root Cause:**
Cost center **{costCenter}** is not linked to overhead costing sheet **ZOVER01**, which defines the overhead surcharge rates for production orders. The costing run for production order CK40N cannot apply overhead to this cost center.

📋 **Costing Configuration Gap:**
\`\`\`
Cost Center:     {costCenter}
Costing Sheet:   ZOVER01  ← NOT ASSIGNED
Impact:          Overhead surcharge not calculated
Production Order: {documentNumber}
Missing rate:    ~12% of direct costs
\`\`\`

ZOVER01 was applied to all production cost centers during the last costing run setup in 2025, but {costCenter} was added to the production hierarchy after that setup was completed.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 91,
        title: 'Assign costing sheet ZOVER01 to cost center {costCenter}',
        description: 'Update the overhead key assignment in the costing variant to include {costCenter} under costing sheet ZOVER01. Navigate to SPRO > Product Cost Controlling > Overhead > Costing Sheet Assignment.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Assign costing sheet ZOVER01 to {costCenter}","description":"Cost center {costCenter} is missing overhead costing sheet assignment ZOVER01. Production order overhead calculations are failing. Requesting CO configuration update."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 76,
        title: 'Apply manual overhead surcharge for current period',
        description: 'For the current period, post a manual overhead surcharge entry using transaction KB15N to apply the estimated 12% overhead rate to document {documentNumber} on {costCenter}.',
        actionCode: 'RETRY_POSTING',
        actionPayload: '{"documentNumber":"{documentNumber}","costCenter":"{costCenter}","note":"Manual overhead surcharge — ZOVER01 not yet assigned; estimated 12% rate applied"}'
      },
      {
        priority: 'LOW',
        confidence: 63,
        title: 'Review all cost centers added post-2025 costing setup',
        description: 'Run a consistency check to identify all cost centers added to the production hierarchy after the 2025 costing sheet assignment to ensure none are missing ZOVER01 or other required costing sheets.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"NONE","description":"Check CK40N costing run log to identify all cost centers missing overhead costing sheet assignments"}'
      }
    ]
  },

  KS200: {
    rootCauseText: 'Cost center category type 3 (Service Center) is not defined in the category configuration of controlling area {controllingArea}. The user attempted to create cost center {costCenter} with type 3 but the controlling area only has types 1 (Production), 2 (Administration), and 4 (Projects) configured.',
    message: `I've analyzed error **KS200** — cost center type 3 not defined in controlling area **{controllingArea}**.

🔍 **Root Cause:**
Cost center **{costCenter}** cannot be created because it is assigned **category type 3 (Service)**, which is not configured in the cost center category settings for controlling area {controllingArea}.

📋 **Category Configuration:**
\`\`\`
Controlling Area:  {controllingArea}
Requested Type:    3 (Service Center)  ← NOT DEFINED
Available Types:   1 (Production), 2 (Administration), 4 (Projects)
\`\`\`

The SAP Shared Services organizational model requires Service Center cost centers (type 3) to enable cross-charging. This category was not included when the controlling area was initially configured.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 92,
        title: 'Define cost center category type 3 in controlling area {controllingArea}',
        description: 'Add category type 3 (Service Center) to the controlling area configuration in SPRO (Controlling > Cost Center Accounting > Master Data > Define Cost Center Categories). Requires CO system administrator access.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Define cost center category type 3 in {controllingArea}","description":"Service Center cost centers (type 3) are required for the Shared Services model but type 3 is not defined in controlling area {controllingArea}. Requesting CO configuration change via Basis."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 79,
        title: 'Create cost center {costCenter} using category type 2 temporarily',
        description: 'As an interim measure, create the cost center using category type 2 (Administration), which is already configured. The category can be changed to type 3 once it is defined in the system.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F1482","description":"Create cost center {costCenter} with temporary category type 2 — to be updated to type 3 once configured"}'
      },
      {
        priority: 'LOW',
        confidence: 55,
        title: 'Review controlling area category design',
        description: 'Assess whether additional cost center categories (type 5 for Sales, type 6 for Research) are also needed based on the organizational model to avoid future KS200 errors.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Controlling area {controllingArea} — full category type review","description":"Type 3 is missing. Request full review of required cost center categories aligned with organizational structure."}'
      }
    ]
  },

  KA220: {
    rootCauseText: 'Cost element group GKOST_EU is referenced by planning layout KP65 but does not exist in chart of accounts INT assigned to controlling area {controllingArea}. The group was deleted when the EU chart of accounts was migrated to the global structure.',
    message: `I've analyzed error **KA220** — cost element group not found for planning layout **KP65**.

🔍 **Root Cause:**
Planning layout **KP65** references cost element group **GKOST_EU**, which no longer exists in chart of accounts **INT**. The group was removed during the CoA migration to the global structure.

📋 **Planning Configuration Gap:**
\`\`\`
Planning Layout:    KP65
References Group:   GKOST_EU  ← NOT FOUND
Chart of Accounts:  INT
CO Area:            {controllingArea}
Cost Center:        {costCenter}
\`\`\`

**Impact:** Annual cost center planning for {costCenter} cannot be executed using KP65 until the group reference is corrected. Approximately 45 cost centers use this layout.`,
    recommendations: [
      {
        priority: 'HIGH',
        confidence: 90,
        title: 'Recreate cost element group GKOST_EU in chart of accounts INT',
        description: 'Recreate the GKOST_EU cost element group with the same member cost elements from the pre-migration backup. Use transaction KAH1 to create the group — this is the fastest fix for all 45 affected cost centers.',
        actionCode: 'CREATE_WORKFLOW',
        actionPayload: '{"subject":"Recreate cost element group GKOST_EU in CoA INT","description":"Planning layout KP65 references deleted group GKOST_EU. Affects ~45 cost centers including {costCenter}. Request recreation of group with original cost element assignments from migration backup."}'
      },
      {
        priority: 'MEDIUM',
        confidence: 82,
        title: 'Update planning layout KP65 to reference GKOST_GLOBAL',
        description: 'If GKOST_EU was intentionally deleted and replaced by GKOST_GLOBAL (the new global cost element group), update the planning layout KP65 to reference the new group name.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"NONE","description":"Update planning layout KP65 via transaction KP65 to replace GKOST_EU reference with GKOST_GLOBAL"}'
      },
      {
        priority: 'LOW',
        confidence: 65,
        title: 'Use planning layout KP64 as interim substitute',
        description: 'Planning layout KP64 (global cost elements) does not reference GKOST_EU and can be used for manual cost center planning on {costCenter} while the group configuration is corrected.',
        actionCode: 'LAUNCH_FIORI',
        actionPayload: '{"appId":"F0844","description":"Execute cost center planning for {costCenter} using layout KP64 as interim substitute for KP65"}'
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
