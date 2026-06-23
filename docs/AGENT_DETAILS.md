# CORA Agent Details
## Model, Activities & Actions

| Field | Value |
|---|---|
| **Agent Name** | CORA — Cost Center Operations Resolution Agent |
| **Document Version** | 1.0 |
| **Date** | 2026-06-23 |
| **Author** | Suman Kumar Puthadi |

---

## 1. AI Model

### 1.1 Model Identity

| Property | Value |
|---|---|
| **Model Provider** | Anthropic |
| **Model Family** | Claude (via SAP AI Core) |
| **API Format** | Anthropic Messages API |
| **API Version** | `anthropic_version: bedrock-2023-05-31` |
| **Hosting** | SAP AI Core (Extended plan) — acts as a proxy to the Claude model |
| **Resource Group** | Configurable via `AI_RESOURCE_GROUP` (default: `default`) |
| **Deployment ID** | Configured per BTP subaccount via `AI_CORE_DEPLOYMENT_ID` env var |

### 1.2 Model Configuration

| Parameter | Value | Purpose |
|---|---|---|
| `max_tokens` | 4096 (agent loop) / 1024 (chat) | Response length cap |
| `anthropic_version` | `bedrock-2023-05-31` | API compatibility |
| `system` | CORA system prompt | Defines agent persona and behavior |
| `tools` | 8 SAP tool definitions | Enables live S/4HANA data lookups |
| `maxIterations` | 10 | Maximum tool-use loop cycles |

### 1.3 Two Invocation Modes

| Mode | Method | When Used | Max Tokens |
|---|---|---|---|
| **Agentic Tool Loop** | `aiEngine.chat()` | Root cause analysis — Claude calls S/4HANA tools mid-reasoning | 4096 |
| **Single-Shot Completion** | `aiEngine.complete()` | Conversational chat replies, classification tasks | 1024 |

### 1.4 Authentication to AI Core

OAuth2 `client_credentials` flow:
```
Token URL:     AI_CORE_TOKEN_URL  (e.g. https://<subdomain>.authentication.eu10.hana.ondemand.com/oauth/token)
Client ID:     AI_CORE_CLIENT_ID
Client Secret: AI_CORE_CLIENT_SECRET
Token Cache:   Reused until 60 seconds before expiry (auto-refreshed)
```
Header passed on every inference call:
```
Authorization:       Bearer <token>
AI-Resource-Group:   <AI_RESOURCE_GROUP>
Content-Type:        application/json
```

---

## 2. Agent Persona & System Prompt

CORA is instructed to behave as a **senior SAP S/4HANA Controlling consultant**. The full system prompt establishes:

```
Role:         Expert SAP S/4HANA Cost Center Accounting AI assistant
Audience:     Finance users — cost center accountants, controlling teams, shared service finance staff
Capabilities: Analyze errors, classify into 4 layers, provide ranked recommendations,
              look up real-time SAP data, guide step-by-step resolutions,
              reference correct Fiori apps and transactions
Output:       Conversational language OR structured JSON (when invoked by system tools)
Tone:         Empathetic — finance users are under pressure especially during month-end
```

**Error Classification Layers defined in the prompt:**

| Layer | Covers |
|---|---|
| `MASTER_DATA` | Cost center lock, validity, hierarchy, profit center assignments |
| `TRANSACTION` | Posting period closed, budget exceeded, cost element mismatches, period locks |
| `CONFIG` | Missing allocation cycles, settlement rules, planning versions, key figures |
| `AUTHORIZATION` | Missing roles, K_CSKS authorization object failures, company code restrictions |

---

## 3. Agent Activities

Activities are the internal processing steps the agent performs in sequence when analysing an error.

### Activity 1 — Error Ingestion

**Trigger:** POST `/error/ingest` from S/4HANA application log export or manual upload.

**Steps:**
1. Receive array of raw SAP error records
2. Deduplicate: skip records where the same `errorCode + documentNumber + costCenter + fiscalPeriod` already exists in `OPEN` or `IN_PROGRESS` status
3. Persist new records to `Errors` entity with `status = OPEN`, `layer = UNKNOWN`
4. Return `{ created, skipped, ids[] }` summary

**Error fields captured:**

| Field | Example |
|---|---|
| errorCode | `KS113` |
| messageClass | `KS` |
| messageNumber | `113` |
| errorText | `Cost Center CC1000 is blocked for primary postings in period 05/2026` |
| costCenter | `CC1000` |
| companyCode | `1000` |
| controllingArea | `A000` |
| fiscalYear / fiscalPeriod | `2026 / 005` |
| documentNumber | `1800001234` |
| userId | `SARAH` |
| processContext | `Manual journal entry posting` |

---

### Activity 2 — Rule-Based Layer Classification (Pass 1)

**Trigger:** Immediately on error selection (no AI call).

**Logic:** The knowledge base (`knowledge-base.js`) maps SAP message class prefixes to error layers in under 50ms:

| Message Class Prefix | Assigned Layer |
|---|---|
| `KS` | MASTER_DATA |
| `KP`, `KI`, `BU`, `F5`, `GR` | TRANSACTION |
| `KO`, `KSW`, `K2` | CONFIG |
| `7Q`, `SU` | AUTHORIZATION |

**Special overrides:**
- Error codes `BU011`, `BU012`, `BU013`, `F5702`, `ZPER` → always `TRANSACTION`
- Error codes `7Q299`, `7Q300`, `SU53` → always `AUTHORIZATION`

**High-priority detection:**
The agent flags an error as high-priority if:
- errorCode is in the period-lock set (`BU011`, `BU012`, `BU013`, `F5702`, `ZPER`)
- OR processContext contains keywords: `period-end`, `month-end`, `allocation`, `assessment`, `settlement`

---

### Activity 3 — AI-Powered Root Cause Analysis (Pass 2)

**Trigger:** When an `OPEN` error with no `rootCauseText` is selected.

**Steps:**
1. Build the root cause prompt including all error fields (code, text, cost center, company code, fiscal year/period, document number, process context, user)
2. Call `aiEngine.chat()` with the 8 SAP tool definitions
3. Claude autonomously decides which tools to call and calls them in sequence (agentic loop)
4. Claude returns a structured JSON:
   ```json
   {
     "layer": "MASTER_DATA",
     "rootCauseText": "Cost center CC1000 has an active primary posting block...",
     "recommendations": [
       { "priority": "HIGH", "confidence": 94, "title": "...", "description": "...", "actionCode": "UPDATE_COSTCENTER", "actionPayload": {...} }
     ]
   }
   ```
5. Parsed result is persisted: `Errors.layer`, `Errors.rootCauseText`, `Errors.status = IN_PROGRESS`

**Fallback:** If the AI call fails or returns unparseable output, the rule-based engine generates a fallback result using the layer from Pass 1.

---

### Activity 4 — Live SAP Data Lookups (Tool Use)

During root cause analysis, Claude calls up to 8 SAP tools via the agentic loop. Each tool call triggers a real OData call to S/4HANA via the BTP Destination `S4H_COSTCENTER`.

| Tool Name | SAP API / Table | What Claude Fetches |
|---|---|---|
| `get_cost_center_details` | `API_COSTCENTER_SRV / A_CostCenter` | Lock indicators, validity dates, responsible person, profit center, hierarchy |
| `get_posting_period_status` | `API_FISCALYEAR_SRV / A_FiscalPeriod` | Whether fiscal period is open or closed for each account type |
| `get_error_message_text` | `API_MESSAGELOG_SRV / MessageText` (T100) | Full SAP error message text by message class + number |
| `get_application_log_details` | `API_APPLICATIONLOG_SRV / A_Header` | Application log entries (BALHDR/BALDAT) — most recent 5 |
| `get_journal_entry` | `API_JOURNALENTRYITEMBASIC_SRV / A_JournalEntryItem` (ACDOCA) | Journal entry line items for the failing document |
| `get_budget_status` | `API_COSTCENTER_BUDGETALERT_SRV / CostCenterBudget` | Total, consumed, and available budget amounts |
| `get_activity_type_assignment` | `API_COSTCENTERACTIVITYTYPE_SRV / A_CostCtrActivityType` | Activity type assignment and planned quantity for a cost center |
| `search_error_patterns` | Local HANA DB — `ErrorPatterns` entity | Known error pattern templates with historical success rates |

**Tool loop behavior:**
```
Claude calls tool(s)
  → Agent executes each call against S/4HANA
  → Returns tool_result JSON to Claude
  → Claude continues reasoning with real data
  → Repeats up to 10 iterations until stop_reason = end_turn
```

---

### Activity 5 — Recommendation Generation & Ranking

**Trigger:** Immediately after root cause analysis completes.

**Steps:**
1. Receive raw recommendations array from AI result
2. Score each recommendation:
   - `priorityScore`: HIGH=300, MEDIUM=200, LOW=100
   - `confidenceScore`: numeric confidence value (0–100)
   - Total score = priorityScore + confidenceScore
3. Sort descending by total score
4. Enrich each recommendation with full action payload (adds errorId, costCenter, companyCode, controllingArea, documentNumber, fiscalYear/Period + action-specific fields)
5. Append confidence note to description:
   - ≥ 90%: no note (high confidence)
   - 70–89%: `"Suggested — please verify before executing."`
   - < 70%: `"Low confidence — manual review recommended before proceeding."`
6. Persist all recommendations to `Recommendations` entity with `status = PENDING`

**Default priority assignment (rule-based fallback):**

| Condition | Default Priority |
|---|---|
| `highPriority` flag is true | HIGH |
| Layer = AUTHORIZATION | HIGH |
| All other layers | MEDIUM |

---

### Activity 6 — Conversational Chat

**Trigger:** Any user message via POST `/agent/chat`.

**Steps:**
1. Receive `{ sessionId, message, errorId }`
2. Persist user message to `Conversations`
3. Load last 10 conversation turns for session context
4. Build context prompt: conversation history + active error context (code, text, cost center, layer, root cause)
5. Call `aiEngine.complete()` — single-shot, 1024 tokens (no tool loop)
6. Persist assistant response to `Conversations`
7. Return full `ChatResponse` with message, recommendations, action buttons, errorSummary

**Context window management:** Only the most recent 6 conversation turns are included in the AI prompt to keep token usage bounded.

---

### Activity 7 — Feedback Learning

**Trigger:** User clicks 👍 or 👎 on a recommendation.

**Steps:**
1. Receive `{ recommendationId, helpful, rating (1–5), comment }`
2. Persist to `Feedback` entity
3. (Phase 2 roadmap) Aggregate feedback to update `ErrorPatterns.successRate` for the matching pattern

---

## 4. Agent Actions

Actions are the executable resolutions CORA can perform on behalf of the user. Each action is triggered via POST `/agent/executeAction`.

### Action 1 — RETRY_POSTING

**Label:** Retry Posting

**Purpose:** Reprocesses a failed SAP accounting document.

**Trigger Layers:** TRANSACTION

**Steps:**
1. Validate `documentNumber` is present in payload
2. Fetch document line items via `get_journal_entry` (confirms document exists and is readable)
3. (Production) Calls `BAPI_ACC_DOCUMENT_POST` via BTP Integration Suite or iFlow to resubmit
4. Persists action record with `status = COMPLETED`

**Payload required:**
```json
{
  "documentNumber": "1800001234",
  "companyCode": "1000",
  "fiscalYear": "2026"
}
```

**Typical use cases:**
- Overnight batch postings that failed due to a transient period-close that has since been re-opened
- Documents that failed due to a missing cost element assignment that has now been corrected

---

### Action 2 — CREATE_WORKFLOW

**Label:** Create Ticket

**Purpose:** Raises an approval / support task in SAP Workflow for the CO or finance team.

**Trigger Layers:** All layers

**Steps:**
1. Call `API_TASK_SRV / A_Task` (OData POST) on S/4HANA
2. Sets `Subject`, `LongDescription`, `Priority = MEDIUM`, `ReferenceDocumentId = errorId`
3. Returns `workflowId` (task UUID from SAP)
4. Persists `workflowId` on the `Actions` record

**Payload required:**
```json
{
  "subject": "Cost Center Error: KS113 on CC1000",
  "description": "Cost Center CC1000 is blocked for primary postings...",
  "costCenter": "CC1000",
  "errorId": "<uuid>"
}
```

**Typical use cases:**
- Any error requiring a human decision (unlock, extend validity, budget approval)
- Config errors requiring a Controlling Admin change
- Period re-open requests subject to compliance review

---

### Action 3 — UPDATE_COSTCENTER

**Label:** Update Cost Center

**Purpose:** Directly patches cost center master data in S/4HANA — typically to clear a posting block or extend validity.

**Trigger Layers:** MASTER_DATA

**Steps:**
1. Build OData PATCH key: `A_CostCenter(CostCenter='CC1000', ControllingArea='A000', ValidityEndDate=datetime'9999-12-31...')`
2. PATCH `IsBlockedForPrimCosts` and/or `IsBlockedForSecondaryCosts` on `API_COSTCENTER_SRV`
3. Returns `{ success: true, message: "Cost center CC1000 updated..." }`

**Payload required:**
```json
{
  "costCenter": "CC1000",
  "controllingArea": "A000",
  "fieldToChange": "IsBlockedForPrimCosts",
  "newValue": ""
}
```

**Authorization required:** `CostCenterManager` or `ControllingAdmin` role in XSUAA.

**Typical use cases:**
- Clearing KS113 posting blocks after period-end review
- Extending validity end date for KS124 expired cost center errors

---

### Action 4 — LAUNCH_FIORI

**Label:** Open Fiori App

**Purpose:** Returns a deep-link URL that opens the exact SAP Fiori app needed to manually resolve the error.

**Trigger Layers:** All layers

**Steps:**
1. Look up Fiori app ID from the layer map (or payload)
2. Build deep-link URL using SAP Fiori Launchpad intent syntax
3. Return `fioriUrl` to the frontend — the UI displays it as a link or opens it in a new tab

**Fiori App Map:**

| App ID | Fiori Intent | Use Case |
|---|---|---|
| `F1482` | `CostCenter-manage?CostCenter=<cc>` | Manage cost center master data (block, validity, category) |
| `F1515` | `JournalEntry-displayLineItems` | Display failed journal entry line items |
| `F1381` | `AllocationCycle-manage` | Manage assessment / distribution cycles |
| `F2610` | `CostElement-manage` | Manage cost element assignments |
| `F0840` | `CostCenterBudget-manage` | Manage and supplement cost center budgets |
| `F0844` | `StatisticalKeyFigure-actuals` | Review statistical key figure actuals |

**Typical use cases:**
- CONFIG errors requiring manual cycle correction in F1381
- AUTHORIZATION errors directing user to contact Security Admin via link

---

### Action 5 — ESCALATE

**Label:** Escalate

**Purpose:** Sends an Adaptive Card notification to a Microsoft Teams channel to alert the Controlling team lead.

**Trigger Layers:** CONFIG, AUTHORIZATION (and any layer when normal resolution paths are exhausted)

**Steps:**
1. Check `TEAMS_WEBHOOK_URL` environment variable
2. POST Adaptive Card payload to the Teams webhook:
   - Card title: `⚠ Cost Center Error Escalation — <costCenter>`
   - Card body: Error ID, escalation level, channel
3. Return `{ success: true, message: "Escalation notification sent..." }`

**Payload required:**
```json
{
  "channel": "TEAMS",
  "costCenter": "CC4000",
  "errorId": "<uuid>",
  "escalationLevel": "CO_SUPPORT_LEAD"
}
```

**Typical use cases:**
- Authorization errors where CORA cannot self-resolve (requires Security Admin)
- Config errors where the CO team must manually fix allocation cycles
- Any high-priority error approaching SLA breach during month-end close

---

## 5. Action Execution Lifecycle

```
User clicks "Execute Action"
         │
         ▼
Confirm dialog (action title + description)
         │
         ▼
POST /agent/executeAction
         │
         ▼
Action record created (status = INITIATED)
         │
         ▼
actionFramework.executeAction(actionCode, payload)
         │
    ┌────┴──────────────────────────────────────────────┐
    │  RETRY_POSTING   → verify doc + resubmit          │
    │  CREATE_WORKFLOW → OData POST to API_TASK_SRV      │
    │  UPDATE_COSTCENTER → OData PATCH to API_CC_SRV    │
    │  LAUNCH_FIORI    → build deep-link URL             │
    │  ESCALATE        → POST to Teams webhook           │
    └────────────────────────────────────────────────────┘
         │                         │
      Success                   Failure
         │                         │
  status = COMPLETED        status = FAILED
  result stored              errorMessage stored
  Recommendation → EXECUTED   Return { success: false }
         │
         ▼
Chat bubble: ✅ Action completed: <message>
```

---

## 6. Recommendation Scoring Matrix

| Priority | Confidence | Total Score | Rank |
|---|---|---|---|
| HIGH | 94 | 394 | 1st |
| HIGH | 88 | 388 | 2nd |
| MEDIUM | 82 | 282 | 3rd |
| MEDIUM | 75 | 275 | 4th |
| LOW | 65 | 165 | 5th |

Recommendations are always sorted by descending total score before being displayed to the user.

---

## 7. Error Code Coverage

The agent has built-in knowledge (in the knowledge base + AI system prompt) for the following SAP error codes:

| Error Code | Message Class | Layer | Description |
|---|---|---|---|
| KS113 | KS | MASTER_DATA | Cost center blocked for primary postings |
| KS124 | KS | MASTER_DATA | Cost center validity expired |
| BU011 | BU | TRANSACTION | Posting period closed for account type S |
| BU012 | BU | TRANSACTION | Posting period closed for account type A |
| KP006 | KP | TRANSACTION | Budget exceeded for cost center / cost element |
| KP042 | KP | TRANSACTION | Activity type not assigned to cost center |
| KI235 | KI | TRANSACTION | Cost element not assigned to cost center category |
| KI261 | KI | TRANSACTION | Assessment cycle receiver cost center expired |
| KO210 | KO | CONFIG | Settlement rule missing for cost center |
| 7Q299 | 7Q | AUTHORIZATION | Missing K_CSKS authorization |
| SU53  | SU | AUTHORIZATION | Authorization check failed for transaction |
| F5702 | F5 | TRANSACTION | Posting period lock — fiscal year variant |

Plus pattern-matched coverage for any error in message classes: `KS`, `KP`, `KI`, `KO`, `BU`, `F5`, `GR`, `AA`, `KSW`, `K2`, `7Q`, `SU`.

---

## 8. Agent Configuration Reference

All agent behaviour is configurable via environment variables:

| Variable | Description | Example |
|---|---|---|
| `AI_CORE_TOKEN_URL` | OAuth2 token endpoint for SAP AI Core | `https://<subdomain>.authentication.eu10.hana.ondemand.com/oauth/token` |
| `AI_CORE_CLIENT_ID` | Service key client ID | From AI Core service key |
| `AI_CORE_CLIENT_SECRET` | Service key client secret | From AI Core service key |
| `AI_CORE_BASE_URL` | AI Core inference API base URL | `https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com/v2` |
| `AI_CORE_DEPLOYMENT_ID` | Claude deployment ID in AI Core | `d<hex>` |
| `AI_RESOURCE_GROUP` | AI Core resource group | `default` |
| `S4H_DESTINATION_NAME` | BTP Destination name for S/4HANA | `S4H_COSTCENTER` |
| `TEAMS_WEBHOOK_URL` | MS Teams incoming webhook URL | `https://outlook.office.com/webhook/...` |

---

## 9. Summary Table

| Capability | Detail |
|---|---|
| **AI Model** | Anthropic Claude via SAP AI Core (Extended) |
| **API** | Anthropic Messages API (`bedrock-2023-05-31`) |
| **Max tokens (analysis)** | 4,096 |
| **Max tokens (chat)** | 1,024 |
| **Tool loop cap** | 10 iterations |
| **Context window** | Last 6 conversation turns |
| **Error layers** | 4 (Master Data, Transaction, Config, Authorization) |
| **Live SAP tools** | 8 (cost center, period, message text, app log, journal, budget, activity type, error patterns) |
| **Actions** | 5 (Retry Posting, Create Workflow, Update Cost Center, Launch Fiori, Escalate) |
| **Error code coverage** | 12 specific codes + pattern-matched message class coverage |
| **Fallback** | Rule-based response if AI Core is unavailable |
| **Auth** | SAP XSUAA (3 roles: Accountant, Manager, Admin) |
| **Feedback loop** | Thumbs up/down + 1–5 star rating persisted per recommendation |

---

*End of Agent Details Document*
