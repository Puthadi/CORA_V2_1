<div align="center">

# 🤖 CORA — Cost Center Error Resolution Agent

### AI-Powered SAP S/4HANA Finance Operations Assistant

[![SAP BTP](https://img.shields.io/badge/SAP-BTP-0066B3?style=for-the-badge&logo=sap)](https://www.sap.com/products/technology-platform.html)
[![SAP CAP](https://img.shields.io/badge/SAP-CAP_Node.js-0FAAFF?style=for-the-badge&logo=sap)](https://cap.cloud.sap)
[![SAP AI Core](https://img.shields.io/badge/SAP-AI_Core-FF6600?style=for-the-badge&logo=sap)](https://www.sap.com/products/artificial-intelligence/ai-core.html)
[![Claude](https://img.shields.io/badge/Anthropic-Claude-8A2BE2?style=for-the-badge)](https://www.anthropic.com)
[![Fiori](https://img.shields.io/badge/SAP-Fiori_UI5-009FDF?style=for-the-badge&logo=sap)](https://experience.sap.com/fiori-design-web/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Detect · Explain · Recommend · Resolve**

*Transform SAP cost center error resolution from hours of manual investigation to seconds of AI-driven insight.*

---

[📋 PRD](docs/PRD.md) · [🏗 SDD](docs/SDD.md) · [🤖 Agent Details](docs/AGENT_DETAILS.md) · [🔵 Problem Statement](docs/PROBLEM_STATEMENT.md) · [💡 Solution](docs/SOLUTION.md) · [🔄 Flow Diagrams](docs/FLOW_DIAGRAMS.md) · [📱 Use Cases](docs/USE_CASES.md) · [🎯 Presentation](docs/END_USER_PRESENTATION.md)

</div>

---

## 📸 Application Screenshots

### Main Chat Interface — CORA in Action

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CORA — Cost Center Error Resolution Agent                    🔄  ⚙️            │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│  📋 Open Errors    [+]  🔍   │  💬 Analyzing: KS113 on CC1000                  │
│  ─────────────────────────── │  ─────────────────────────────────────────────── │
│  🔴 KS113 — CC1000           │  ┌─────────────────────────────────────────────┐ │
│  Cost center blocked for     │  │ ⚠️  Root Cause: Cost center CC1000 has an   │ │
│  primary postings   [MASTER] │  │    active posting block for period 05/2026   │ │
│  ─────────────────────────── │  └─────────────────────────────────────────────┘ │
│  🔴 BU011 — CC2000           │                                                  │
│  Period 05/2026 closed       │  ┌──────────────────────────────────────────┐    │
│  [TRANSACTION]               │  │ 🤖 CORA                           10:23  │    │
│  ─────────────────────────── │  │                                          │    │
│  🟡 KP006 — CC3000           │  │ Cost center CC1000 is blocked for primary│    │
│  Budget exceeded EUR 15K     │  │ postings in fiscal period 05/2026. This  │    │
│  [TRANSACTION]               │  │ block was applied during period-end close │    │
│  ─────────────────────────── │  │ on 31-May-2026. The cost center has been │    │
│  🔴 7Q299 — CC4000           │  │ valid since 01-Jan-2020 and is assigned  │    │
│  Auth failure K_CSKS         │  │ to Profit Center PC-EMEA in hierarchy    │    │
│  [AUTHORIZATION]             │  │ COST_H1.                                 │    │
│  ─────────────────────────── │  │                                          │    │
│  🟡 KI235 — CC5000           │  │ 💡 3 recommendations ready ↓             │    │
│  Cost element mismatch       │  └──────────────────────────────────────────┘    │
│  [TRANSACTION]               │                                                  │
│                              │  ─── 🎯 AI Recommendations ──────────────────── │
│                              │                                                  │
│                              │  [HIGH 94%] Unlock Cost Center via Fiori App    │
│                              │  Modify the posting block on CC1000 using       │
│                              │  Manage Cost Centers (F1482).        [Execute]  │
│                              │                                                  │
│                              │  [MED 78%] Use Alternative Active Cost Center   │
│                              │  CC1001 is active and accepts primary postings. │
│                              │                                [Execute] 👍 👎  │
│                              │                                                  │
│                              │  [LOW 72%] Create Workflow Approval Request     │
│                              │  Raise ticket to CO team for emergency unlock.  │
│                              │                                [Execute] 👍 👎  │
│                              │  ─────────────────────────────────────────────  │
│                              │  [ Ask CORA about a cost center error...    📤] │
└──────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 🎯 What is CORA?

**CORA (Cost Center Operations Resolution Agent)** is an AI-powered assistant built on **SAP BTP** that helps finance teams instantly diagnose and resolve SAP S/4HANA cost center accounting errors — eliminating hours of manual investigation, reducing dependency on technical teams, and accelerating month-end close.

| Before CORA | After CORA |
|---|---|
| 2–4 hours manual root cause investigation | ⚡ 5 seconds AI analysis |
| Multiple SAP transactions to check | 💬 Single conversational interface |
| Cryptic SAP error codes | 📖 Plain business language explanation |
| IT/CO team dependency for every error | 🔧 Self-service resolution actions |
| Month-end delays from error backlogs | 📅 30% faster period close |

---

## 🚨 Business Problem

Finance teams face significant operational challenges with SAP cost center errors:

- **2–4 hours** average manual investigation per complex error
- **10–15 SAP transactions** checked per root cause analysis
- **45% of errors** recur monthly with identical root causes
- **Month-end delays** caused by allocation and posting failures
- **High IT/CO team dependency** for every non-trivial error
- **Cryptic technical messages** misunderstood by business users

> *"Our CO team spends 30% of month-end close time just debugging errors that have the same root causes every single period."*
> — Shared Services Finance Manager

---

## 💡 Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CORA Agent Architecture                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Finance User                                                          │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────┐    ┌──────────────────────────────────────────────┐   │
│  │  SAP Fiori  │───▶│              SAP BTP                         │   │
│  │  Chat UI    │    │  ┌──────────────────────────────────────┐    │   │
│  │  (UI5)      │◀───│  │         CAP Node.js Backend           │    │   │
│  └─────────────┘    │  │  ┌────────────┐  ┌───────────────┐  │    │   │
│                     │  │  │AgentService│  │ ErrorService  │  │    │   │
│                     │  │  └─────┬──────┘  └───────────────┘  │    │   │
│                     │  │        │                              │    │   │
│                     │  │  ┌─────▼──────────────────────────┐  │    │   │
│                     │  │  │        AI Engine Layer          │  │    │   │
│                     │  │  │  ┌───────────┐  ┌───────────┐  │  │    │   │
│                     │  │  │  │Root Cause │  │  Rec.     │  │  │    │   │
│                     │  │  │  │  Engine   │  │  Engine   │  │  │    │   │
│                     │  │  │  └─────┬─────┘  └───────────┘  │  │    │   │
│                     │  │  │        │                         │  │    │   │
│                     │  │  │  ┌─────▼─────┐  ┌───────────┐  │  │    │   │
│                     │  │  │  │ SAP AI    │  │  Action   │  │  │    │   │
│                     │  │  │  │ Core +    │  │ Framework │  │  │    │   │
│                     │  │  │  │ Claude    │  │           │  │  │    │   │
│                     │  │  │  └───────────┘  └─────┬─────┘  │  │    │   │
│                     │  │  └────────────────────────│────────┘  │    │   │
│                     │  └───────────────────────────│───────────┘    │   │
│                     └───────────────────────────────│───────────────┘   │
│                                                     │                   │
│                                                     ▼                   │
│                          ┌──────────────────────────────────────────┐  │
│                          │    SAP S/4HANA (Private Cloud/On-Prem)   │  │
│                          │  via Cloud Connector + BTP Destination   │  │
│                          │  API_COSTCENTER_SRV │ API_JOURNALENTRY   │  │
│                          │  API_WORKFLOW_SRV   │ API_APPLICATIONLOG │  │
│                          └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🔍 Intelligent Error Detection
- Real-time ingestion of SAP application log errors
- Automatic classification into 4 error layers: Master Data, Transaction, Configuration, Authorization
- Pattern matching against 20+ known SAP error signatures

### 🧠 AI-Powered Root Cause Analysis
- Two-pass engine: instant rule-based lookup → deep Claude AI analysis
- 8 live SAP data tools: cost center master, period status, budget, activity types
- Business-language explanations for every technical SAP error code

### 💡 Ranked Recommendations
- Priority scoring (HIGH / MEDIUM / LOW) with confidence percentage
- Executable action payloads ready for one-click resolution
- Historical learning improves accuracy over time

### ⚡ One-Click Action Execution
| Action | What It Does |
|--------|-------------|
| **Retry Posting** | Reprocesses the failed SAP document |
| **Create Workflow** | Raises approval ticket to CO team |
| **Update Cost Center** | Unlocks/extends master data directly |
| **Launch Fiori App** | Deep-links to the exact SAP app needed |
| **Escalate** | Sends Teams notification to CO lead |

### 📊 Error Monitoring & Trends
- Open error dashboard with layer/status filters
- Bulk ingestion from S/4HANA application logs
- Top recurring errors this month
- Resolution time and AI accuracy KPIs

---

## 🗂 Project Structure

```
costcenter-error-agent/
├── 📁 app/chat/webapp/           SAP Fiori/UI5 chat interface
│   ├── view/Main.view.xml        Chat UI with error sidebar
│   ├── controller/Main.controller.js
│   ├── manifest.json
│   └── index.html
├── 📁 srv/
│   ├── agent-service.cds/.js     Conversational chat endpoint
│   ├── error-service.cds/.js     Error CRUD + bulk ingest
│   └── 📁 lib/
│       ├── ai-engine.js          SAP AI Core + Claude integration
│       ├── root-cause-engine.js  Two-pass root cause analysis
│       ├── recommendation-engine.js
│       ├── sap-connector.js      S/4HANA OData via Cloud SDK
│       ├── action-framework.js   Action execution
│       ├── knowledge-base.js     Error pattern rules
│       ├── tools.js              Claude tool definitions
│       └── prompt-templates.js   CORA system prompt
├── 📁 db/
│   ├── schema.cds                Data model (6 entities)
│   └── data/ErrorPatterns.csv   20 seeded error patterns
├── 📁 docs/
│   ├── PRD.md                    Product Requirements Document
│   ├── PROBLEM_STATEMENT.md
│   ├── SOLUTION.md
│   ├── FLOW_DIAGRAMS.md          Mermaid architecture + flow diagrams
│   ├── USE_CASES.md              8 real-world use cases with mockups
│   └── END_USER_PRESENTATION.md  Executive slide deck
├── mta.yaml                      BTP deployment descriptor
├── xs-security.json              XSUAA roles and scopes
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- SAP BTP account with AI Core (Claude deployment)
- SAP S/4HANA Private Cloud/On-Premise with Cloud Connector
- Node.js 20+, `@sap/cds-dk` 8+, `mbt` CLI

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/sumanputhadi9342/costcenter_error_resolution-.git
cd costcenter_error_resolution-

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in AI_CORE_* and S4H_DESTINATION_NAME values

# 4. Deploy local SQLite schema
cds deploy --to sqlite

# 5. Start the development server
cds watch
# → CAP server: http://localhost:4004
# → Fiori UI:   http://localhost:4004/app/chat/webapp/index.html
```

### BTP Deployment

```bash
# Build MTA archive
mbt build

# Deploy to Cloud Foundry
cf login -a https://api.cf.eu10.hana.ondemand.com
cf deploy mta_archives/cc-error-agent_1.0.0.mtar
```

---

## ⚙️ Configuration

### `.env` Variables

| Variable | Description |
|----------|-------------|
| `AI_CORE_TOKEN_URL` | SAP AI Core OAuth2 token endpoint |
| `AI_CORE_CLIENT_ID` | Service key client ID |
| `AI_CORE_CLIENT_SECRET` | Service key client secret |
| `AI_CORE_BASE_URL` | AI Core inference API base URL |
| `AI_CORE_DEPLOYMENT_ID` | Your Claude model deployment ID |
| `AI_RESOURCE_GROUP` | AI Core resource group (default: `default`) |
| `S4H_DESTINATION_NAME` | BTP destination name for S/4HANA |
| `TEAMS_WEBHOOK_URL` | MS Teams webhook for escalation alerts |

### BTP Destination Setup (`S4H_COSTCENTER`)
```
Name:           S4H_COSTCENTER
Type:           HTTP
URL:            https://your-s4hana-host:443
Authentication: BasicAuthentication
ProxyType:      OnPremise   ← requires Cloud Connector
```

---

## 🔌 SAP API Coverage

| API / Table | Purpose | Used By |
|-------------|---------|---------|
| `API_COSTCENTER_SRV` | Cost center master data | Root cause, actions |
| `API_JOURNALENTRYITEMBASIC_SRV` | Journal entry line items | Retry posting |
| `API_APPLICATIONLOG_SRV` | Error log ingestion | Error ingest |
| `API_WORKFLOW_SRV` | Workflow task creation | Action framework |
| `API_FISCALYEAR_SRV` | Posting period status | Claude tool |
| `ACDOCA` | Universal journal | Journal lookup |
| `T100` | Error message texts | Claude tool |
| `CSKS / CSKT` | Cost center master | Cost center tool |

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **CostCenterAccountant** | View errors, chat with CORA, submit feedback |
| **CostCenterManager** | + Execute actions, approve workflows |
| **ControllingAdmin** | + Configure error patterns, full administration |

---

## 📈 Expected Business Impact

| KPI | Target |
|-----|--------|
| Manual investigation time | **↓ 40%** |
| Month-end close duration | **↓ 30%** |
| Issue resolution time | **↓ 50%** |
| Recurring error rate | **↓ 45%** |
| AI recommendation accuracy | **> 90%** |
| Automation rate (Phase 2) | **> 60%** |

---

## 🗺 Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| **Phase 1** (MVP) | Chat agent, root cause analysis, error ingestion, action execution | ✅ Built |
| **Phase 2** | Analytics dashboard, automated remediation, historical intelligence | 🔜 Planned |
| **Phase 3** | Predictive error prevention, voice assistant, cross-module intelligence | 🔮 Future |

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | SAP CAP Node.js 8, Express |
| **AI Engine** | SAP AI Core + Claude (Anthropic) |
| **Database** | SAP HANA Cloud (SQLite for dev) |
| **Frontend** | SAP Fiori / UI5 1.120, Horizon theme |
| **Platform** | SAP Business Technology Platform (BTP) |
| **SAP Integration** | SAP Cloud SDK, BTP Destination, Cloud Connector |
| **Security** | SAP XSUAA, JWT, Role-based access |
| **Deployment** | Cloud Foundry, MTA, HTML5 App Router |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📋 PRD](docs/PRD.md) | Full Product Requirements Document |
| [🏗 SDD](docs/SDD.md) | Software Design Document — architecture, components, data model, APIs |
| [🤖 Agent Details](docs/AGENT_DETAILS.md) | AI model, activities, actions, tool definitions, scoring |
| [🚨 Problem Statement](docs/PROBLEM_STATEMENT.md) | Business challenges addressed |
| [💡 Solution](docs/SOLUTION.md) | Technical and functional solution design |
| [🔄 Flow Diagrams](docs/FLOW_DIAGRAMS.md) | Architecture, data flow, and process diagrams |
| [📱 Use Cases](docs/USE_CASES.md) | 8 real-world use cases with UI mockups |
| [🎯 Presentation](docs/END_USER_PRESENTATION.md) | Executive slide deck for stakeholders |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ for SAP Finance Teams**

*Powered by SAP BTP · SAP AI Core · Anthropic Claude · SAP Fiori*

</div>
