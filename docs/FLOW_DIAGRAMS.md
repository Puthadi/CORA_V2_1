# 🔄 Flow Diagrams

## CORA — System & Process Flow Diagrams

> All diagrams use [Mermaid](https://mermaid.js.org/) syntax — rendered automatically on GitHub.

---

## 1. End-to-End Error Resolution Flow

```mermaid
flowchart TD
    A([Finance User Encounters SAP Error]) --> B[Error Occurs in S/4HANA]
    B --> C{Error Source}
    C -->|Failed journal posting| D[Application Log Entry]
    C -->|Allocation cycle failure| D
    C -->|Planning upload failure| D
    C -->|Manual user report| E[User Reports via Chat]

    D --> F[POST /error/ingest]
    E --> G[POST /agent/chat]
    F --> H[Error Saved to HANA DB]
    H --> G

    G --> I[Root Cause Engine - Pass 1]
    I --> J{Pattern Match\nConfidence?}
    J -->|≥ 90%| K[Rule-Based Result]
    J -->|< 90%| L[AI Engine - Pass 2]

    L --> M[Claude via SAP AI Core]
    M --> N{Needs SAP\nData?}
    N -->|Yes| O[Tool Use - SAP OData APIs]
    O --> P[Fetch Cost Center / Period / Budget Data]
    P --> M
    N -->|No| Q[Generate Root Cause + Recommendations]
    K --> Q

    Q --> R[Recommendations Stored in DB]
    R --> S[User Sees Analysis + Ranked Recommendations]

    S --> T{User Action}
    T -->|Select recommendation| U[Action Framework]
    T -->|Ask follow-up| G

    U --> V{Action Type}
    V -->|RETRY_POSTING| W[Reprocess Document via OData]
    V -->|CREATE_WORKFLOW| X[Create Approval Task in S/4HANA]
    V -->|UPDATE_COSTCENTER| Y[Update Cost Center Master Data]
    V -->|LAUNCH_FIORI| Z[Return Deep-Link URL]
    V -->|ESCALATE| AA[Send Teams Notification]

    W --> AB[Action Result Stored]
    X --> AB
    Y --> AB
    Z --> AB
    AA --> AB

    AB --> AC[Error Status → RESOLVED]
    AC --> AD[User Submits Feedback 👍/👎]
    AD --> AE[Knowledge Base Updated]
    AE --> AF([Resolution Complete])

    style A fill:#ff6b6b,color:#fff
    style AF fill:#51cf66,color:#fff
    style M fill:#7950f2,color:#fff
    style O fill:#1971c2,color:#fff
```

---

## 2. System Architecture Diagram

```mermaid
graph TB
    subgraph Browser["🌐 Browser — SAP Fiori/UI5"]
        UI[Chat Interface\nMain.view.xml]
        EC[Error List Sidebar]
        RC[Recommendations Panel]
    end

    subgraph BTP["☁️ SAP Business Technology Platform"]
        AR[App Router\nXSUAA Auth]
        CAP[CAP Node.js\nAgentService / ErrorService]

        subgraph AILayer["🤖 AI Engine Layer"]
            RCE[Root Cause Engine\n2-pass analysis]
            REC[Recommendation Engine\nPriority scoring]
            AF[Action Framework\n5 action types]
        end

        subgraph AICore["🔮 SAP AI Core"]
            CL[Claude Model\nAnthropic]
            TOOLS[8 SAP Tool\nDefinitions]
        end

        HANA[(SAP HANA Cloud\nErrors / Recommendations\nConversations / Actions)]
    end

    subgraph S4H["🏢 SAP S/4HANA (On-Premise)"]
        CC[API_COSTCENTER_SRV]
        JE[API_JOURNALENTRY_SRV]
        WF[API_WORKFLOW_SRV]
        AL[API_APPLICATIONLOG_SRV]
        FY[API_FISCALYEAR_SRV]
    end

    subgraph Connectivity["🔗 BTP Connectivity"]
        DS[Destination Service\nS4H_COSTCENTER]
        CCS[Cloud Connector\nSecure Tunnel]
    end

    UI --> AR
    AR --> CAP
    CAP --> RCE
    RCE --> AICore
    CL --> TOOLS
    TOOLS --> DS
    DS --> CCS
    CCS --> CC
    CCS --> JE
    CCS --> WF
    CCS --> AL
    CCS --> FY
    CAP --> HANA
    RCE --> REC
    REC --> AF
    AF --> DS

    style BTP fill:#e7f5ff,stroke:#1971c2
    style AICore fill:#f3d9fa,stroke:#7950f2
    style S4H fill:#fff9db,stroke:#f08c00
    style Connectivity fill:#ebfbee,stroke:#2f9e44
```

---

## 3. AI Engine — Agentic Tool Use Loop

```mermaid
sequenceDiagram
    participant U as Finance User
    participant API as CAP AgentService
    participant RCE as Root Cause Engine
    participant AI as Claude (AI Core)
    participant SAP as SAP S/4HANA OData

    U->>API: POST /agent/chat\n{message, errorId, sessionId}
    API->>RCE: analyzeError(error)
    RCE->>RCE: Pass 1 — rule match

    alt High confidence pattern match
        RCE-->>API: rule-based result
    else Low confidence / unknown
        RCE->>AI: messages + tools + system prompt
        
        loop Agentic Tool Loop (max 10 iterations)
            AI->>AI: Reason about error...
            AI-->>RCE: stop_reason: "tool_use"\ntool: get_cost_center_details
            RCE->>SAP: GET API_COSTCENTER_SRV\n?CostCenter=CC1000
            SAP-->>RCE: {IsBlocked: "X", ValidityEnd: "9999-12-31"...}
            RCE->>AI: tool_result: {data from SAP}
            
            AI-->>RCE: stop_reason: "tool_use"\ntool: get_posting_period_status
            RCE->>SAP: GET API_FISCALYEAR_SRV\n?Period=005/2026
            SAP-->>RCE: {FiscalPeriodIsOpen: false}
            RCE->>AI: tool_result: {period closed}
            
            AI-->>RCE: stop_reason: "end_turn"\ntext: root cause + recommendations JSON
        end
        
        RCE-->>API: {layer, rootCauseText, recommendations[]}
    end

    API->>API: Save recommendations to HANA
    API-->>U: {message, recommendations, actions, errorSummary}
```

---

## 4. Error Classification Decision Tree

```mermaid
flowchart TD
    START([SAP Error Received]) --> A{Is messageClass\nor errorCode in\nAUTH_SET?}
    A -->|Yes 7Q*/SU*| AUTHZ[Layer: AUTHORIZATION\nRecommend: CREATE_WORKFLOW\nEscalate to IT/Security]
    A -->|No| B{Is errorCode in\nPERIOD_LOCK_SET?}
    B -->|Yes BU011/F5702| TRANS1[Layer: TRANSACTION\nType: Period Lock\nRecommend: Request period opening]
    B -->|No| C{messageClass\nstarts with KS?}
    C -->|Yes| D{What type of\nKS error?}
    D -->|KS113/KS114 Block| MAST1[Layer: MASTER_DATA\nType: Posting Block\nRecommend: Unlock CC or use alternate]
    D -->|KS124/KS125 Validity| MAST2[Layer: MASTER_DATA\nType: Validity Date\nRecommend: Extend validity period]
    C -->|No| E{messageClass\nstarts with KI/KP?}
    E -->|KI - cost element| TRANS2[Layer: TRANSACTION\nType: Cost Element\nRecommend: Reassign element category]
    E -->|KP - budget| TRANS3[Layer: TRANSACTION\nType: Budget\nRecommend: Budget transfer/supplement]
    E -->|No| F{messageClass\nstarts with KO/KSW?}
    F -->|Yes| CONFIG[Layer: CONFIG\nType: Cycle/Settlement\nRecommend: Define missing config]
    F -->|No| UNKNOWN[Layer: UNKNOWN\nSend to AI Pass 2\nfor deep analysis]

    style AUTHZ fill:#ff6b6b,color:#fff
    style MAST1 fill:#ffa94d,color:#fff
    style MAST2 fill:#ffa94d,color:#fff
    style TRANS1 fill:#ff6b6b,color:#fff
    style TRANS2 fill:#ffd43b
    style TRANS3 fill:#ffd43b
    style CONFIG fill:#74c0fc
    style UNKNOWN fill:#e9ecef
```

---

## 5. Data Model Entity Relationship

```mermaid
erDiagram
    ERRORS {
        uuid ID PK
        string errorCode
        string messageClass
        string messageNumber
        string errorText
        string documentNumber
        string costCenter
        string companyCode
        string controllingArea
        string fiscalYear
        string fiscalPeriod
        string userId
        string status
        string layer
        text rootCauseText
        timestamp resolvedAt
    }

    RECOMMENDATIONS {
        uuid ID PK
        uuid error_ID FK
        string priority
        decimal confidence
        string title
        text description
        string actionCode
        text actionPayload
        string status
        timestamp executedAt
    }

    ACTIONS {
        uuid ID PK
        uuid error_ID FK
        uuid recommendation_ID FK
        string actionType
        string initiatedBy
        timestamp initiatedAt
        timestamp completedAt
        string status
        text result
        string workflowId
    }

    CONVERSATIONS {
        uuid ID PK
        string sessionId
        string userId
        string role
        text content
        timestamp timestamp
        string errorRef
    }

    FEEDBACK {
        uuid ID PK
        uuid recommendation_ID FK
        integer rating
        boolean helpful
        string comment
        string submittedBy
    }

    ERRORPATTERNS {
        uuid ID PK
        string errorCode
        string messageClass
        text patternDescription
        text rootCauseTemplate
        string layer
        string recommendedAction
        integer frequency
        decimal successRate
    }

    ERRORS ||--o{ RECOMMENDATIONS : "has"
    ERRORS ||--o{ ACTIONS : "triggers"
    RECOMMENDATIONS ||--o{ FEEDBACK : "receives"
    RECOMMENDATIONS ||--o{ ACTIONS : "executes"
```

---

## 6. BTP Deployment Architecture

```mermaid
graph LR
    subgraph CF["Cloud Foundry Space (SAP BTP)"]
        AR[cc-error-agent-approuter\nNode.js 256MB]
        SRV[cc-error-agent-srv\nCAP Node.js 512MB]
        DB[cc-error-agent-db-deployer\nHDI Deployer]
    end

    subgraph Services["BTP Managed Services"]
        XSUAA[xsuaa\napplication plan]
        HANA[hana\nhdi-shared]
        DEST[destination\nlite]
        CONN[connectivity\nlite]
        HTML5[html5-apps-repo\napp-runtime]
        AICORE[aicore\nextended plan]
    end

    subgraph OnPrem["On-Premise"]
        CC[Cloud Connector]
        S4[SAP S/4HANA]
    end

    AR --> XSUAA
    AR --> HTML5
    AR --> SRV
    SRV --> XSUAA
    SRV --> HANA
    SRV --> DEST
    SRV --> CONN
    SRV --> AICORE
    DB --> HANA
    DEST --> CONN
    CONN --> CC
    CC --> S4

    style CF fill:#e7f5ff,stroke:#1971c2
    style Services fill:#f8f9fa,stroke:#868e96
    style OnPrem fill:#fff9db,stroke:#f08c00
```

---

## 7. Month-End Close Process — Before vs After CORA

```mermaid
gantt
    title Month-End Close: Before vs After CORA
    dateFormat HH:mm
    axisFormat %H:%M

    section Before CORA
    Allocation cycle run        :active, a1, 00:00, 2h
    Error investigation (manual):crit,   a2, 02:00, 4h
    CO team triage              :crit,   a3, 06:00, 3h
    Error resolution            :crit,   a4, 09:00, 5h
    Re-run allocations          :        a5, 14:00, 2h
    Period close finalized      :        a6, 16:00, 1h

    section After CORA
    Allocation cycle run        :active, b1, 00:00, 2h
    CORA auto-analysis          :        b2, 02:00, 0.5h
    Self-service resolution     :        b3, 02:30, 1h
    Re-run allocations          :        b4, 03:30, 2h
    Period close finalized      :        b5, 05:30, 1h
```

---

## 8. User Journey — Self-Service Error Resolution

```mermaid
journey
    title Finance User Resolves Cost Center Error with CORA
    section Discovers Error
      Attempts journal posting: 1: User
      SAP shows error KS113: 2: User, SAP
      Opens CORA chat interface: 5: User
    section Gets Analysis
      Error auto-loaded in sidebar: 5: CORA
      Clicks error → AI analysis starts: 5: User
      CORA explains root cause clearly: 5: CORA, AI Core
      Sees 3 ranked recommendations: 5: User, CORA
    section Takes Action
      Reads HIGH priority recommendation: 5: User
      Clicks Execute on recommendation: 5: User
      Confirms action in dialog: 5: User
      CORA executes unlock workflow: 5: CORA, SAP
      Receives workflow confirmation: 5: User
    section Resolution
      Returns to SAP and retries posting: 5: User
      Posting succeeds: 5: User, SAP
      Submits thumbs-up feedback: 5: User
      Error marked as RESOLVED: 5: CORA
```
