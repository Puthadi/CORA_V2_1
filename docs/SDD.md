# Software Design Document (SDD)
## CORA — Cost Center Error Resolution Agent

| Field | Value |
|---|---|
| **Document Version** | 1.0 |
| **Date** | 2026-06-23 |
| **Author** | Suman Kumar Puthadi |
| **Status** | Draft |
| **Repository** | https://github.com/sumanputhadi9342/costcenter_error_resolution- |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Architecture](#3-architecture)
4. [Component Design](#4-component-design)
5. [Data Model](#5-data-model)
6. [API Design](#6-api-design)
7. [AI Engine Design](#7-ai-engine-design)
8. [Security Design](#8-security-design)
9. [Integration Design](#9-integration-design)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Error Handling](#11-error-handling)
12. [Non-Functional Requirements](#12-non-functional-requirements)

---

## 1. Introduction

### 1.1 Purpose

This document describes the software design of **CORA (Cost Center Operations Resolution Agent)** — an AI-powered assistant deployed on SAP BTP that enables finance teams to diagnose and resolve SAP S/4HANA cost center accounting errors through a conversational interface.

### 1.2 Scope

The system covers:
- Real-time ingestion and classification of SAP cost center errors
- AI-driven root cause analysis using SAP AI Core (Claude)
- Ranked, actionable recommendations with one-click execution
- Conversational chat interface built on SAP Fiori / UI5
- Integration with SAP S/4HANA via OData APIs and BTP Destination

### 1.3 Definitions

| Term | Definition |
|---|---|
| CORA | Cost Center Operations Resolution Agent |
| CAP | SAP Cloud Application Programming model |
| BTP | SAP Business Technology Platform |
| AI Core | SAP AI Core service (hosts Claude model) |
| Cloud Connector | SAP software bridge for on-premise to BTP connectivity |
| Error Layer | Classification of an error: Master Data, Transaction, Configuration, or Authorization |
| Root Cause | AI-generated explanation of the underlying reason for an error |
| Recommendation | Ranked, executable suggested action to resolve an error |

---

## 2. System Overview

### 2.1 Problem Statement

SAP finance teams spend 2–4 hours per complex cost center error due to:
- Cryptic SAP error codes requiring expert interpretation
- 10–15 SAP transactions needed per root cause investigation
- 45% of errors recurring monthly with identical causes
- High dependency on IT/CO teams for non-trivial resolution

### 2.2 Solution Summary

CORA reduces error resolution from hours to seconds by combining:
1. **Rule-based classification** — instant layer detection without AI
2. **Claude AI analysis** — deep root cause investigation with 8 live SAP data tools
3. **Recommendation engine** — ranked actions with confidence scores
4. **Action framework** — one-click execution of common resolutions

### 2.3 Target Users

| Role | Primary Use |
|---|---|
| Cost Center Accountant | View errors, chat with CORA, submit feedback |
| Cost Center Manager | Execute actions, approve workflows |
| Controlling Admin | Configure error patterns, full administration |

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         SAP BTP                               │
│                                                               │
│  ┌─────────────┐    ┌──────────────────────────────────────┐  │
│  │  SAP Fiori  │───▶│         App Router (XSUAA)           │  │
│  │  UI5 Chat   │◀───│                                      │  │
│  └─────────────┘    └──────────────┬───────────────────────┘  │
│                                    │                           │
│                     ┌──────────────▼───────────────────────┐  │
│                     │       CAP Node.js Backend             │  │
│                     │  ┌──────────────┐  ┌──────────────┐  │  │
│                     │  │ AgentService │  │ ErrorService │  │  │
│                     │  └──────┬───────┘  └──────────────┘  │  │
│                     │         │                             │  │
│                     │  ┌──────▼───────────────────────┐    │  │
│                     │  │        AI Engine Layer        │    │  │
│                     │  │  ┌────────────┐ ┌──────────┐  │    │  │
│                     │  │  │Root Cause  │ │ Rec.     │  │    │  │
│                     │  │  │  Engine   │ │ Engine   │  │    │  │
│                     │  │  └─────┬──────┘ └──────────┘  │    │  │
│                     │  │        │  SAP AI Core (Claude) │    │  │
│                     │  │  ┌─────▼──────────────────┐   │    │  │
│                     │  │  │  Action Framework       │   │    │  │
│                     │  │  └────────────────────────┘   │    │  │
│                     │  └──────────────────────────────┘    │  │
│                     │                                       │  │
│                     │  ┌──────────────────────────────┐    │  │
│                     │  │    SAP HANA Cloud (DB)        │    │  │
│                     │  └──────────────────────────────┘    │  │
│                     └───────────────────────────────────────┘  │
│                                                               │
│         BTP Destination + Cloud Connector                     │
│                     │                                         │
└─────────────────────┼─────────────────────────────────────────┘
                      │
         ┌────────────▼────────────────────────────┐
         │   SAP S/4HANA (Private Cloud / On-Prem) │
         │  API_COSTCENTER_SRV  API_FISCALYEAR_SRV  │
         │  API_JOURNALENTRYITEMBASIC_SRV            │
         │  API_WORKFLOW_SRV    API_APPLICATIONLOG   │
         └────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | SAP Fiori / UI5, Horizon theme | 1.120 |
| Backend | SAP CAP Node.js | 8.x |
| AI | SAP AI Core + Anthropic Claude | Latest deployment |
| Database | SAP HANA Cloud (SQLite for dev) | Cloud |
| Platform | SAP Business Technology Platform | Cloud Foundry |
| Integration | SAP Cloud SDK, BTP Destination | Latest |
| Security | SAP XSUAA, JWT | OAuth2 |
| Deployment | Cloud Foundry MTA | 1.0.0 |

---

## 4. Component Design

### 4.1 Component Overview

```
srv/
├── agent-service.cds/.js     — Conversational chat endpoint
├── error-service.cds/.js     — Error CRUD, ingest, summary
└── lib/
    ├── ai-engine.js           — SAP AI Core + Claude client
    ├── root-cause-engine.js   — Two-pass analysis orchestrator
    ├── recommendation-engine.js — Rec. persistence & retrieval
    ├── action-framework.js    — Action handler dispatch
    ├── sap-connector.js       — S/4HANA OData calls via Cloud SDK
    ├── knowledge-base.js      — Rule-based error classification
    ├── tools.js               — Claude tool definitions
    └── prompt-templates.js    — CORA system prompt & templates
app/chat/webapp/
├── view/Main.view.xml         — Fiori XML view (sidebar + chat)
├── controller/Main.controller.js — UI5 controller
├── manifest.json
└── index.html
db/
├── schema.cds                 — 6-entity CDS data model
└── data/ErrorPatterns.csv     — 20 seeded error patterns
```

### 4.2 Agent Service (`srv/agent-service.cds/.js`)

The AgentService exposes three actions over HTTP at path `/agent`:

| Action | Method | Description |
|---|---|---|
| `chat` | POST | Main conversational entry point — triggers root cause analysis |
| `executeAction` | POST | Executes a recommended action (retry, workflow, update, Fiori, escalate) |
| `submitFeedback` | POST | Records thumbs up/down feedback on a recommendation |

**`chat` flow:**
1. Receive `sessionId`, `message`, optional `errorId`
2. Persist user message to `Conversations`
3. If `errorId` provided, load error record and call `analyzeError()`
4. Persist AI response and recommendations
5. Return `ChatResponse` with message, recommendations, actions, errorSummary

### 4.3 Error Service (`srv/error-service.cds/.js`)

Exposes at path `/error`:

| Endpoint | Type | Description |
|---|---|---|
| `Errors` | Entity (CRUD) | Full error lifecycle management |
| `Recommendations` | Entity (CRUD) | Recommendations linked to errors |
| `Actions` | Entity (CRUD) | Action execution records |
| `Feedback` | Entity (CRUD) | User feedback on recommendations |
| `ErrorPatterns` | Entity (CRUD) | Seeded and admin-managed patterns |
| `ingest` | Action | Bulk ingest from S/4HANA application logs |
| `ErrorSummary` | View | Count by layer/status |
| `ErrorTrends` | View | Top recurring errors by count |

**Ingest deduplication:** The ingest action skips records where the same `errorCode + documentNumber + costCenter + fiscalPeriod` combination already exists in `OPEN` or `IN_PROGRESS` status.

### 4.4 AI Engine (`srv/lib/ai-engine.js`)

Wraps the Anthropic Messages API served through SAP AI Core.

**Key design decisions:**
- **Singleton pattern** — one `AIEngine` instance per Node.js process
- **Token caching** — OAuth2 tokens are cached with a 60-second buffer before expiry
- **Agentic tool loop** — `chat()` iterates up to 10 times until `stop_reason === 'end_turn'`, collecting and returning tool results each pass
- **Tool handler registry** — handlers are registered externally via `setToolHandler()` to avoid circular imports
- **`complete()`** — single-shot method for classification tasks (no tool loop)

```
chat() flow:
  1. Obtain Bearer token (cached)
  2. POST to AI Core inference endpoint
  3. If stop_reason == 'tool_use':
       a. Execute each tool_use block via registered handler
       b. Append tool_result to messages
       c. Repeat (max 10 iterations)
  4. If stop_reason == 'end_turn': return text content
```

### 4.5 Root Cause Engine (`srv/lib/root-cause-engine.js`)

Two-pass analysis pipeline:

```
Pass 1 (Rule-based, instant):
  - classifyLayer(messageClass, errorCode) → ErrorLayer
  - isHighPriority(errorCode, processContext) → boolean

Pass 2 (AI-powered):
  - Build ROOT_CAUSE_PROMPT with full error context
  - Call aiEngine.chat() with TOOLS (8 SAP data tools)
  - Parse JSON response: { layer, rootCauseText, recommendations[] }

Fallback:
  - If AI unavailable or returns non-parseable output
  - buildRuleBasedResult() using layer from Pass 1
```

**Tool handlers registered:**

| Tool Name | Handler | Data Source |
|---|---|---|
| `get_cost_center_details` | `sapConn.getCostCenterDetails` | API_COSTCENTER_SRV |
| `get_posting_period_status` | `sapConn.getPostingPeriodStatus` | API_FISCALYEAR_SRV |
| `get_error_message_text` | `sapConn.getErrorMessageText` | API_MESSAGELOG_SRV |
| `get_application_log_details` | `sapConn.getApplicationLogDetails` | API_APPLICATIONLOG_SRV |
| `get_journal_entry` | `sapConn.getJournalEntry` | API_JOURNALENTRYITEMBASIC_SRV |
| `get_budget_status` | `sapConn.getBudgetStatus` | API_COSTCENTER_BUDGETALERT_SRV |
| `get_activity_type_assignment` | `sapConn.getActivityTypeAssignment` | API_COSTCENTERACTIVITYTYPE_SRV |
| `search_error_patterns` | local DB query | `ErrorPatterns` entity |

### 4.6 Knowledge Base (`srv/lib/knowledge-base.js`)

Static rule set used by Pass 1 of root cause analysis:

| Message Class Prefix | Error Layer |
|---|---|
| KS | MASTER_DATA |
| KP, KI, BU, F5, GR | TRANSACTION |
| KO, KSW, K2 | CONFIG |
| 7Q, SU | AUTHORIZATION |

High-priority detection triggers on: period-lock error codes (`BU011`, `BU012`, `BU013`, `F5702`, `ZPER`) or process context containing keywords: `period-end`, `month-end`, `allocation`, `assessment`, `settlement`.

### 4.7 Action Framework (`srv/lib/action-framework.js`)

Dispatches action codes to dedicated async handlers:

| Action Code | Description | SAP API Used |
|---|---|---|
| `RETRY_POSTING` | Re-verify and resubmit failed document | API_JOURNALENTRYITEMBASIC_SRV |
| `CREATE_WORKFLOW` | Create approval task in SAP Workflow | API_TASK_SRV |
| `UPDATE_COSTCENTER` | Patch posting block on cost center master | API_COSTCENTER_SRV |
| `LAUNCH_FIORI` | Return deep-link URL for Fiori app | Local URL map |
| `ESCALATE` | Post Adaptive Card to MS Teams webhook | TEAMS_WEBHOOK_URL |

Fiori deep-link mapping:

| App ID | Fiori Intent | Purpose |
|---|---|---|
| F1482 | `CostCenter-manage` | Manage Cost Centers |
| F1515 | `JournalEntry-displayLineItems` | Display Line Items |
| F1381 | `AllocationCycle-manage` | Manage Allocations |
| F2610 | `CostElement-manage` | Manage Cost Elements |
| F0840 | `CostCenterBudget-manage` | Manage Budget |
| F0844 | `StatisticalKeyFigure-actuals` | SKF Actuals |

### 4.8 SAP Connector (`srv/lib/sap-connector.js`)

All S/4HANA calls route through SAP Cloud SDK's `executeHttpRequest()` using the BTP Destination `S4H_COSTCENTER`. The connector provides:
- `getCostCenterDetails` / `updateCostCenterBlock`
- `getPostingPeriodStatus`
- `getErrorMessageText`
- `getApplicationLogDetails`
- `getJournalEntry`
- `getBudgetStatus`
- `getActivityTypeAssignment`
- `createWorkflowTask`

### 4.9 Frontend Controller (`app/chat/webapp/controller/Main.controller.js`)

The UI5 controller manages a `JSONModel` with state:

```json
{
  "sessionId": "uuid",
  "messages": [],
  "inputText": "",
  "busy": false,
  "listBusy": false,
  "errorList": [],
  "currentError": null,
  "recommendations": [],
  "actions": [],
  "counts": { "MASTER_DATA": 0, "TRANSACTION": 0, "CONFIG": 0, "AUTHORIZATION": 0 }
}
```

Key interactions:
- **Error selection** → auto-triggers `chat()` with error context
- **Send message** → POST `/agent/chat`
- **Execute recommendation** → confirmation dialog → POST `/agent/executeAction`
- **Feedback** → POST `/agent/submitFeedback`
- **Ingest sample** → POST `/error/ingest` (dev/demo helper)
- **Layer filter** → OData `$filter` on `ErrorService`

---

## 5. Data Model

### 5.1 Entity Relationship Diagram

```
Errors  ──1:N──  Recommendations  ──1:N──  Feedback
  │
  └──1:N──  Actions

ErrorPatterns  (independent lookup table)
Conversations  (independent chat log)
```

### 5.2 Entity Definitions

#### `Errors`
| Field | Type | Notes |
|---|---|---|
| ID | UUID (cuid) | Primary key |
| errorCode | String(20) | SAP error code (e.g. KS113) |
| messageClass | String(20) | SAP message class (e.g. KS) |
| messageNumber | String(10) | Message number within class |
| errorText | String(512) | Human-readable error text |
| documentNumber | String(20) | Related SAP document |
| costCenter | String(20) | Affected cost center |
| companyCode | String(4) | Company code |
| controllingArea | String(4) | Controlling area |
| fiscalYear | String(4) | Fiscal year |
| fiscalPeriod | String(3) | Fiscal period (e.g. 005) |
| userId | String(12) | SAP user who triggered error |
| processContext | String(100) | Process context description |
| status | ErrorStatus | OPEN / IN_PROGRESS / RESOLVED / ESCALATED / CLOSED |
| layer | ErrorLayer | MASTER_DATA / TRANSACTION / CONFIG / AUTHORIZATION / UNKNOWN |
| rootCauseText | LargeString | AI-generated root cause explanation |
| resolvedAt | Timestamp | Resolution timestamp |
| resolvedBy | String(12) | Resolver user ID |
| resolutionNotes | String(1000) | Free-text resolution notes |
| createdAt / modifiedAt | Timestamp | Managed fields (CAP) |

#### `Recommendations`
| Field | Type | Notes |
|---|---|---|
| ID | UUID | Primary key |
| error | Association | → Errors |
| priority | Priority | HIGH / MEDIUM / LOW |
| confidence | Decimal(5,2) | 0–100 confidence score |
| title | String(200) | Short action title |
| description | LargeString | Detailed action description |
| actionCode | String(50) | RETRY_POSTING / CREATE_WORKFLOW / etc. |
| actionPayload | LargeString | JSON payload for action execution |
| status | RecStatus | PENDING / ACCEPTED / REJECTED / EXECUTED |
| executedAt | Timestamp | |
| executedBy | String(12) | |

#### `Actions`
| Field | Type | Notes |
|---|---|---|
| ID | UUID | Primary key |
| error | Association | → Errors |
| recommendation | Association | → Recommendations |
| actionType | String(50) | Action code |
| actionDescription | String(300) | |
| status | ActionStatus | INITIATED / IN_PROGRESS / COMPLETED / FAILED / CANCELLED |
| result | LargeString | JSON result from action handler |
| workflowId | String(50) | SAP workflow task UUID |
| errorMessage | String(500) | Failure message if applicable |

#### `ErrorPatterns`
| Field | Type | Notes |
|---|---|---|
| ID | UUID | Primary key |
| errorCode | String(20) | |
| messageClass | String(20) | |
| patternDescription | String(500) | |
| rootCauseTemplate | LargeString | Templated root cause for this pattern |
| layer | ErrorLayer | |
| recommendedAction | String(200) | Default recommended action code |
| fioriAppId | String(100) | Target Fiori app |
| frequency | Integer | Count of occurrences (auto-incremented) |
| successRate | Decimal(5,2) | Historical resolution success rate |
| isActive | Boolean | Whether pattern is active |

#### `Conversations`
| Field | Type | Notes |
|---|---|---|
| ID | UUID | Primary key |
| sessionId | String(50) | Client-generated session UUID |
| userId | String(12) | |
| role | Role | user / assistant / system |
| content | LargeString | Message text |
| timestamp | Timestamp | |
| errorRef | String(50) | Associated error ID (if any) |
| metadata | LargeString | JSON metadata |

#### `Feedback`
| Field | Type | Notes |
|---|---|---|
| ID | UUID | Primary key |
| recommendation | Association | → Recommendations |
| rating | Integer | 1–5 star rating |
| helpful | Boolean | Thumbs up/down |
| comment | String(500) | Optional free-text |
| submittedBy | String(12) | |
| submittedAt | Timestamp | |

### 5.3 Enumerations

| Type | Values |
|---|---|
| ErrorLayer | MASTER_DATA, TRANSACTION, CONFIG, AUTHORIZATION, UNKNOWN |
| ErrorStatus | OPEN, IN_PROGRESS, RESOLVED, ESCALATED, CLOSED |
| Priority | HIGH, MEDIUM, LOW |
| ActionStatus | INITIATED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED |
| RecStatus | PENDING, ACCEPTED, REJECTED, EXECUTED |
| Role | user, assistant, system |

---

## 6. API Design

### 6.1 AgentService — `/agent`

#### POST `/agent/chat`

**Request:**
```json
{
  "input": {
    "sessionId": "uuid",
    "message": "Analyze error KS113 on cost center CC1000",
    "errorId": "uuid (optional)"
  }
}
```

**Response:**
```json
{
  "value": {
    "sessionId": "uuid",
    "message": "Root cause analysis text from CORA...",
    "recommendations": [
      {
        "ID": "uuid",
        "priority": "HIGH",
        "confidence": 94.0,
        "title": "Unlock Cost Center via Fiori App",
        "description": "Modify the posting block on CC1000...",
        "actionCode": "UPDATE_COSTCENTER",
        "actionPayload": "{\"costCenter\":\"CC1000\",...}",
        "status": "PENDING"
      }
    ],
    "actions": [],
    "errorSummary": {
      "ID": "uuid",
      "errorCode": "KS113",
      "costCenter": "CC1000",
      "layer": "MASTER_DATA",
      "status": "IN_PROGRESS",
      "rootCauseText": "..."
    }
  }
}
```

#### POST `/agent/executeAction`

**Request:**
```json
{
  "input": {
    "errorId": "uuid",
    "recommendationId": "uuid",
    "actionCode": "CREATE_WORKFLOW",
    "actionPayload": "{\"costCenter\":\"CC1000\",\"errorId\":\"uuid\"}"
  }
}
```

**Response:**
```json
{
  "value": {
    "success": true,
    "message": "Workflow ticket created successfully.",
    "workflowId": "WF-1234567890",
    "fioriUrl": null
  }
}
```

#### POST `/agent/submitFeedback`

**Request:**
```json
{
  "recommendationId": "uuid",
  "helpful": true,
  "rating": 5,
  "comment": "This resolved my issue immediately"
}
```

### 6.2 ErrorService — `/error`

#### POST `/error/ingest`

**Request:**
```json
{
  "input": {
    "errors": [
      {
        "errorCode": "KS113",
        "messageClass": "KS",
        "messageNumber": "113",
        "errorText": "Cost Center CC1000 is blocked...",
        "documentNumber": "1800001234",
        "costCenter": "CC1000",
        "companyCode": "1000",
        "controllingArea": "A000",
        "fiscalYear": "2026",
        "fiscalPeriod": "005",
        "userId": "SARAH",
        "processContext": "Manual journal entry posting"
      }
    ]
  }
}
```

**Response:**
```json
{
  "value": {
    "created": 1,
    "skipped": 0,
    "ids": ["uuid"]
  }
}
```

#### GET `/error/Errors`
Standard OData endpoint with `$filter`, `$orderby`, `$top`, `$expand` support.

#### GET `/error/ErrorSummary`
Returns counts grouped by `layer` and `status`.

#### GET `/error/ErrorTrends`
Returns top recurring `errorCode + costCenter` combinations ordered by frequency.

---

## 7. AI Engine Design

### 7.1 System Prompt

CORA is instructed to act as a senior SAP Controlling consultant. The system prompt establishes:
- Role: expert SAP CO consultant
- Behavior: use tools to gather live data before concluding
- Output format: structured JSON with `layer`, `rootCauseText`, `recommendations[]`
- Constraints: always explain in business language, rank by impact

### 7.2 Tool Schema (Claude Tools)

Eight tools are defined in `srv/lib/tools.js` using Anthropic's tool definition format. Each tool maps to a live S/4HANA OData call:

```json
{
  "name": "get_cost_center_details",
  "description": "Retrieve cost center master data including validity, blocking indicators, profit center assignment",
  "input_schema": {
    "type": "object",
    "properties": {
      "costCenter": { "type": "string" },
      "companyCode": { "type": "string" },
      "controllingArea": { "type": "string" }
    },
    "required": ["costCenter", "controllingArea"]
  }
}
```

### 7.3 Agentic Loop

```
User message
    │
    ▼
AI Core / Claude (Pass 1 of tool loop)
    │
    ├─ stop_reason: tool_use
    │       │
    │       ▼
    │   Execute tools in parallel (up to 8)
    │       │
    │       ▼
    │   Return tool_results to Claude
    │       │
    │       └──────────────────────────┐
    │                                  │ (repeat max 10x)
    ▼
stop_reason: end_turn
    │
    ▼
Parse JSON response → layer + rootCauseText + recommendations[]
```

### 7.4 Fallback Strategy

If the AI call fails (network, quota, parse error), the system falls back to a rule-based result built from the knowledge base. This ensures 100% response availability even when AI Core is unavailable.

---

## 8. Security Design

### 8.1 Authentication & Authorization

- All API endpoints are protected by **SAP XSUAA** (OAuth2 JWT)
- The App Router validates tokens and forwards the auth header to the CAP backend
- CAP `@requires` annotations enforce scope checks at the service level

### 8.2 XSUAA Scopes & Roles

| Scope | Role Template | Permissions |
|---|---|---|
| `CostCenterAccountant` | CostCenterAccountant | View errors, chat, submit feedback |
| `CostCenterManager` | CostCenterManager | + Execute actions, approve workflows |
| `ControllingAdmin` | ControllingAdmin | + Configure patterns, full admin |

Role templates use cumulative scope inheritance: Manager includes Accountant scopes; Admin includes all.

### 8.3 Token Configuration

```json
{
  "token-validity": 43200,
  "redirect-uris": ["https://*.cfapps.*.hana.ondemand.com/**"]
}
```

### 8.4 AI Core Credentials

SAP AI Core service key credentials (`clientid`, `clientsecret`, `url`) are injected at runtime via Cloud Foundry environment binding — never stored in code or `.env` files in production. The OAuth2 client_credentials flow is handled by `ai-engine.js` with automatic token refresh.

### 8.5 S/4HANA Connectivity

- On-premise S/4HANA is accessed exclusively through **BTP Destination + Cloud Connector** (proxy type `OnPremise`)
- Credentials for the BTP Destination are stored in the BTP Cockpit, not in source code
- The destination name `S4H_COSTCENTER` is the only configurable entry point

---

## 9. Integration Design

### 9.1 SAP AI Core Integration

```
CAP Backend
    │
    ▼ POST /inference/deployments/{deploymentId}/messages
SAP AI Core (Anthropic Messages API proxy)
    │
    ▼
Claude model (deployed in AI Core resource group)
```

**Headers required:**
- `Authorization: Bearer {token}`
- `AI-Resource-Group: {resourceGroup}`
- `Content-Type: application/json`

**API version:** `anthropic_version: bedrock-2023-05-31`

### 9.2 SAP S/4HANA OData Integration

All S/4HANA calls use `@sap-cloud-sdk/http-client`'s `executeHttpRequest()` which automatically resolves the BTP Destination and handles Cloud Connector routing.

| API | OData Path | Purpose |
|---|---|---|
| API_COSTCENTER_SRV | `/sap/opu/odata/sap/API_COSTCENTER_SRV/A_CostCenter` | Cost center master |
| API_FISCALYEAR_SRV | `/sap/opu/odata/sap/API_FISCALYEAR_SRV/A_FiscalPeriod` | Posting period status |
| API_JOURNALENTRYITEMBASIC_SRV | `/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_JournalEntryItem` | Journal entries |
| API_APPLICATIONLOG_SRV | `/sap/opu/odata/sap/API_APPLICATIONLOG_SRV/A_Header` | Application logs |
| API_COSTCENTER_BUDGETALERT_SRV | `CostCenterBudget` | Budget status |
| API_COSTCENTERACTIVITYTYPE_SRV | `A_CostCtrActivityType` | Activity type assignment |
| API_TASK_SRV | `A_Task` | Workflow task creation |

### 9.3 MS Teams Integration

The `ESCALATE` action sends an Adaptive Card payload to a configurable MS Teams incoming webhook (`TEAMS_WEBHOOK_URL` env var). The notification includes error ID, cost center, and escalation level.

---

## 10. Deployment Architecture

### 10.1 MTA Modules

| Module | Type | Memory | Purpose |
|---|---|---|---|
| `cc-error-agent-srv` | Node.js | 512M | CAP backend |
| `cc-error-agent-db-deployer` | hdb | — | HANA schema deploy |
| `cc-error-agent-app` | html5 | — | Fiori app bundle |
| `cc-error-agent-approuter` | approuter.nodejs | 256M | App Router + auth |

### 10.2 BTP Service Bindings

| Service | Plan | Purpose |
|---|---|---|
| SAP HANA Cloud (`hana`) | hdi-shared | Application database |
| XSUAA | application | Authentication & authorization |
| Connectivity | lite | Cloud Connector proxy |
| Destination | lite | S/4HANA routing |
| SAP AI Core (`aicore`) | extended | Claude model hosting |
| HTML5 App Repository | app-runtime | Fiori app serving |

### 10.3 Deployment Commands

```bash
# Build MTA archive
mbt build

# Deploy to Cloud Foundry (EU10)
cf login -a https://api.cf.eu10.hana.ondemand.com
cf deploy mta_archives/cc-error-agent_1.0.0.mtar
```

### 10.4 Local Development

```bash
# Install dependencies
npm install

# Deploy SQLite schema
cds deploy --to sqlite

# Start CAP dev server
cds watch
# CAP:    http://localhost:4004
# Fiori:  http://localhost:4004/app/chat/webapp/index.html

# Or start mock server (no S/4HANA needed)
node test/mock-server.js
```

---

## 11. Error Handling

### 11.1 AI Engine Failures

If the AI Core call fails (network, quota exceeded, invalid token), `root-cause-engine.js` catches the exception, logs it, and calls `buildRuleBasedResult()` to produce a rule-based response. The user receives a valid recommendation set without being aware of the AI failure.

### 11.2 S/4HANA Tool Failures

Individual tool handlers in `ai-engine.js` wrap S/4HANA calls in try/catch. On failure, they return `{ error: err.message }` as the tool result. Claude is instructed to continue analysis with partial data rather than aborting.

### 11.3 Action Execution Failures

The action framework throws typed errors (e.g., `documentNumber required for RETRY_POSTING`). The `executeAction` handler in the CAP service catches these and returns `{ success: false, message: errorText }` to the UI. The Fiori controller displays these as `MessageBox.error()`.

### 11.4 Ingestion Deduplication

The `ingest` action uses a uniqueness check before insert. Duplicate records (same error code + document + cost center + fiscal period in OPEN/IN_PROGRESS status) are counted as `skipped` in the response and not re-created.

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Metric | Target |
|---|---|
| Rule-based classification | < 50ms |
| AI root cause analysis (with tool calls) | < 15 seconds |
| Error list load (50 records) | < 500ms |
| Action execution | < 5 seconds |

### 12.2 Availability

- CAP backend: standard CF health check + automatic restart
- AI Core fallback to rule-based ensures 100% response availability
- HANA Cloud: 99.9% SLA (SAP managed)

### 12.3 Scalability

- CAP is stateless; horizontal scaling via CF instance count
- Sessions are identified by client UUID — no server-side session affinity required
- AI Core tool loop capped at 10 iterations to bound latency

### 12.4 AI Quality KPIs

| KPI | Target |
|---|---|
| Root cause accuracy | > 90% |
| Recommendation acceptance rate | > 70% |
| Automation rate (Phase 2) | > 60% |
| Recurring error reduction | > 45% |

### 12.5 Roadmap

| Phase | Features | Status |
|---|---|---|
| Phase 1 (MVP) | Chat agent, root cause analysis, error ingestion, action execution | Built |
| Phase 2 | Analytics dashboard, automated remediation, historical intelligence | Planned |
| Phase 3 | Predictive error prevention, voice assistant, cross-module intelligence | Future |

---

*End of Software Design Document*
