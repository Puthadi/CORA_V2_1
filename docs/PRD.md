# 📋 Product Requirements Document (PRD)

**Product:** CORA — AI Agent for Cost Center Error Resolution
**Module:** SAP S/4HANA Overhead Accounting — Cost Center Accounting
**Version:** 1.0 (MVP)
**Date:** May 2026
**Owner:** Finance Operations & Controlling Team

---

## 1. Executive Summary

CORA (Cost Center Operations Resolution Agent) is an AI-powered assistant deployed on SAP BTP that enables finance users to detect, diagnose, and resolve SAP S/4HANA cost center accounting errors through a conversational interface. The agent replaces hours of manual root cause investigation with seconds of AI-driven analysis backed by live SAP data.

---

## 2. Product Vision

> *"Enable finance users to resolve overhead accounting and cost center related errors through an intelligent conversational AI assistant with automated recommendations and guided actions."*

---

## 3. Target Personas

| Persona | Role | Primary Pain Points |
|---------|------|-------------------|
| **Cost Center Accountant** | Posts costs, runs allocations, handles period-end | Cannot interpret cryptic SAP errors; depends on CO team |
| **Cost Center Manager** | Owns cost center budget and master data | Unaware of errors until month-end delays surface |
| **Shared Services Finance** | Processes high volumes of cross-company postings | Error resolution bottlenecks entire team |
| **Controlling Team (CO)** | Maintains configuration, approves exceptions | Overloaded with support requests from accounting |
| **Finance Operations Support** | Triage and escalate SAP issues | Lacks SAP expertise to resolve without IT involvement |

---

## 4. Business Requirements

### BR-01: Error Detection
The system shall detect cost center related errors from SAP application logs, failed journal postings, allocation cycle failures, and planning run exceptions.

### BR-02: Root Cause Analysis
The system shall analyze every detected error and provide a root cause explanation in plain business language within 8 seconds.

### BR-03: Recommendation Engine
The system shall generate ranked, actionable recommendations for each error with priority (HIGH/MEDIUM/LOW) and confidence percentage.

### BR-04: Action Execution
The system shall enable users to execute corrective actions directly from the conversational interface without navigating to multiple SAP transactions.

### BR-05: Conversational Interface
The system shall support natural language queries in English about cost center errors, allocations, budgets, and period-end issues.

### BR-06: Error Ingestion
The system shall support bulk ingestion of errors from SAP S/4HANA application logs via API.

### BR-07: Historical Intelligence
The system shall store resolution history and use it to improve recommendation accuracy over time.

### BR-08: Audit Trail
Every AI recommendation, user action, and error resolution shall be logged with timestamp, user ID, and outcome.

---

## 5. Functional Requirements

### 5.1 Error Classification

The system classifies errors into four layers:

| Layer | Message Classes | Examples |
|-------|----------------|---------|
| **MASTER_DATA** | KS*, AA* | Blocked cost center, expired validity, missing profit center |
| **TRANSACTION** | KI*, KP*, BU*, F5* | Period closed, budget exceeded, cost element mismatch |
| **CONFIG** | KSW*, K2*, KO* | Missing allocation cycle, invalid settlement rule |
| **AUTHORIZATION** | 7Q*, SU* | K_CSKS authorization failure, company code restriction |

### 5.2 AI Analysis Engine

**Pass 1 — Rule Engine (< 100ms)**
- Pattern match against 20+ known error signatures in knowledge base
- Returns layer, root cause template, and recommended Fiori app

**Pass 2 — Claude AI Engine (< 8s)**
- Invokes 8 SAP data tools for live context fetching
- Generates business-language root cause explanation
- Produces ranked recommendations with confidence scoring

### 5.3 Claude Tools (SAP Data Lookups)

| Tool | SAP API/Table | Data Retrieved |
|------|--------------|---------------|
| `get_cost_center_details` | API_COSTCENTER_SRV | Lock status, validity, profit center |
| `get_posting_period_status` | API_FISCALYEAR_SRV | Period open/closed status |
| `get_error_message_text` | T100 | Full SAP error message text |
| `get_application_log_details` | API_APPLICATIONLOG_SRV | Error log entries |
| `get_journal_entry` | ACDOCA | Document line items |
| `search_error_patterns` | Local DB | Known error templates |
| `get_budget_status` | Budget API | Available/consumed budget |
| `get_activity_type_assignment` | API_COSTCENTERACTIVITYTYPE_SRV | Activity type validity |

### 5.4 Recommendation Framework

| Priority | Trigger Condition | Confidence Threshold |
|----------|-----------------|-------------------|
| **HIGH** | Month-end context, authorization failure, posting block | Any |
| **MEDIUM** | Budget exceedance, master data issue, config gap | ≥ 70% |
| **LOW** | Informational guidance, alternative workarounds | ≥ 50% |

### 5.5 Action Framework

| Action Code | Description | SAP Backend |
|-------------|-------------|------------|
| `RETRY_POSTING` | Reprocess failed document | API_JOURNALENTRY_SRV |
| `CREATE_WORKFLOW` | Create approval workflow ticket | API_TASK_SRV |
| `UPDATE_COSTCENTER` | Unlock / extend cost center | API_COSTCENTER_SRV |
| `LAUNCH_FIORI` | Deep-link to Fiori application | URL routing |
| `ESCALATE` | Notify CO team via Teams webhook | HTTP POST |

### 5.6 Supported Conversational Queries

| Category | Example Prompts |
|----------|----------------|
| **Error Investigation** | "Why did my cost center posting fail?" |
| | "Explain the root cause for error KS113" |
| | "Show me unresolved errors for CC1000" |
| **Recommendations** | "How can I resolve this allocation error?" |
| | "Suggest an alternative cost center" |
| | "What caused the budget exceedance?" |
| **Actions** | "Retry the posting" |
| | "Create a workflow ticket" |
| | "Open the Manage Cost Centers app" |
| **Analytics** | "What are the top recurring errors this month?" |
| | "Show me all authorization failures" |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| **Performance** | Root cause analysis ≤ 8 seconds end-to-end |
| **Availability** | 99.5% uptime (SAP BTP SLA) |
| **Scalability** | Multi-company code, multi-controlling area |
| **Security** | XSUAA JWT authentication, role-based authorization |
| **Auditability** | Full audit trail of all AI actions and user decisions |
| **Compliance** | No sensitive financial data stored beyond BTP tenant boundary |

---

## 7. Data Model

### Core Entities

```
Errors (1) ──────────────── (N) Recommendations
  │                                    │
  │                                    │ (1) ──── (N) Feedback
  │
  └─────────────────────── (N) Actions

Conversations (session-scoped, linked to Errors)
ErrorPatterns (knowledge base, seeded with 20 patterns)
```

### Key Fields

**Errors:** `errorCode, messageClass, documentNumber, costCenter, companyCode, controllingArea, fiscalYear, fiscalPeriod, status [OPEN/IN_PROGRESS/RESOLVED], layer, rootCauseText`

**Recommendations:** `priority, confidence, title, description, actionCode, actionPayload, status [PENDING/ACCEPTED/EXECUTED/REJECTED]`

**Actions:** `actionType, initiatedBy, status [INITIATED/COMPLETED/FAILED], workflowId, result`

---

## 8. Integration Architecture

```
SAP S/4HANA (On-Premise)
        │
        │  HTTPS via Cloud Connector
        │
SAP BTP Connectivity Service
        │
        │  BTP Destination: S4H_COSTCENTER
        │
CAP Node.js Backend  ←→  SAP AI Core (Claude deployment)
        │                       │
        │               OAuth2 token endpoint
        │
SAP HANA Cloud (persistence)
        │
SAP Fiori / UI5 (browser)
```

---

## 9. SAP APIs and Tables

### Cost Center Master
| API/Table | Purpose |
|-----------|---------|
| `API_COSTCENTER_SRV` | Read/update cost center master |
| `CSKS` | Cost center master table |
| `CSKT` | Cost center text |
| `I_CostCenter` | CDS view |

### Financial Posting
| API/Table | Purpose |
|-----------|---------|
| `API_JOURNALENTRYITEMBASIC_SRV` | Read journal entry items |
| `API_JOURNALENTRY_SRV` | Post / reprocess documents |
| `ACDOCA` | Universal journal table |
| `BKPF / BSEG` | Accounting document tables |

### Error & Log Management
| API/Table | Purpose |
|-----------|---------|
| `API_APPLICATIONLOG_SRV` | Error log ingestion |
| `BALHDR / BALDAT` | Application log tables |
| `T100 / T100T` | SAP message text repository |

### Workflow & Authorization
| API/Table | Purpose |
|-----------|---------|
| `API_TASK_SRV` | Create workflow tasks |
| `AGR_USERS` | Role assignments |
| `SU53 logs` | Authorization failure details |

---

## 10. Security & Authorization

### Authorization Objects
| Object | Field | Usage |
|--------|-------|-------|
| `K_CSKS` | KOKRS, KOSTL, ACTVT | Cost center read/write |
| `K_CCA` | KOKRS, KSTAR, ACTVT | Cost element authorization |
| `F_BKPF_BUK` | BUKRS, ACTVT | Company code posting |
| `S_TABU_DIS` | DICBERCLS, ACTVT | Table display authorization |

### XSUAA Roles
| Role | Scopes | Can Execute Actions |
|------|--------|-------------------|
| `CostCenterAccountant` | Read, chat | No |
| `CostCenterManager` | Read, chat, execute | Yes (limited) |
| `ControllingAdmin` | Full | Yes (all) |

---

## 11. KPI Dashboard (Phase 2)

| KPI | Formula | Target |
|-----|---------|--------|
| Error Resolution Time | avg(resolvedAt - createdAt) | < 30 min |
| Repeat Error Rate | recurring/total × 100 | < 15% |
| AI Recommendation Accuracy | accepted/generated × 100 | > 85% |
| Automation Rate | auto-resolved/total × 100 | > 40% |
| Month-End Delay Reduction | baseline vs current close time | -30% |

---

## 12. Implementation Roadmap

### Phase 1 — MVP (Current)
- ✅ Error ingestion and classification
- ✅ AI root cause analysis (Claude via AI Core)
- ✅ Recommendation engine with confidence scoring
- ✅ Action framework (5 action types)
- ✅ Fiori/UI5 chat interface
- ✅ BTP deployment (mta.yaml, XSUAA, HANA)

### Phase 2 — Intelligence (Q3 2026)
- 📊 Analytics and KPI dashboard
- 🔄 Automated batch remediation
- 🧠 Historical learning feedback loop
- 📧 Email/Teams notification center
- 🔗 SAP Build Process Automation integration

### Phase 3 — Predictive AI (Q4 2026)
- 🔮 Predictive error prevention
- 🎙 Voice-enabled finance assistant
- 🌐 Cross-module error intelligence (FI/MM/SD)
- 🤖 Autonomous correction engine

---

## 13. Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-01 | Agent responds to chat message within 10 seconds |
| AC-02 | Root cause correctly classified (layer) for ≥ 90% of known error codes |
| AC-03 | Recommendations generated for 100% of ingested errors |
| AC-04 | Workflow creation action completes successfully end-to-end |
| AC-05 | Cost center lookup returns live data from S/4HANA |
| AC-06 | All actions logged in Actions table with user and timestamp |
| AC-07 | Feedback (thumbs up/down) persisted and linked to recommendation |
| AC-08 | Multi-user sessions isolated by sessionId |

---

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| SAP AI Core quota limits | API throttling during peak | Implement retry with exponential backoff |
| Cloud Connector downtime | S/4HANA data unavailable | Fallback to rule-based analysis without live data |
| Claude model changes | API breaking changes | Pin model version, monitor AI Core release notes |
| XSUAA token expiry | Session drops mid-analysis | Token refresh handled in ai-engine.js |
| Large error volumes | HANA write bottleneck | Batch ingest with deduplication |
