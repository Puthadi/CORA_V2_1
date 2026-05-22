# 📱 Real-Time Use Cases & Screenshots

## CORA — 8 End-to-End Use Cases with UI Mockups

---

## Use Case 1: Cost Center Blocked for Postings

**Scenario:** A finance accountant tries to post a travel expense to cost center CC1000 but receives a blocking error at period 05/2026 month-end close.

**User:** Sarah Chen, Cost Center Accountant, Company Code 1000

### Step 1 — Error Occurs in SAP

```
╔══════════════════════════════════════════════════════════════════╗
║  SAP S/4HANA — Journal Entry Posting                             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Document Date:  31.05.2026                                      ║
║  Company Code:   1000                                            ║
║  Cost Center:    CC1000    ← [cursor here]                       ║
║  Amount:         EUR 1,250.00                                    ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ ❌  Error  KS 113                                        │   ║
║  │    Cost center CC1000 is locked against primary          │   ║
║  │    cost postings in fiscal year 2026                     │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  [Post]  [Check]  [Hold]  [Cancel]                               ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 2 — User Opens CORA

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CORA — Cost Center Error Resolution Agent              🔄  ⚙️          │
├────────────────────────┬────────────────────────────────────────────────┤
│  📋 Open Errors  [+]   │  💬 Chat with CORA                            │
│  ─────────────────────  │                                               │
│  🔴 KS113 — CC1000      │  ┌──────────────────────────────────────┐    │
│  Period blocked         │  │    💡 Quick start — select an error    │    │
│  [MASTER DATA]          │  │    from the left, or ask me anything   │    │
│                         │  │                                        │    │
│                         │  │  💬 "Why did my posting fail?"         │    │
│                         │  │  💬 "Show top errors this month"       │    │
│                         │  │  💬 "Recommend corrective action"      │    │
│                         │  └──────────────────────────────────────┘    │
│                         │                                               │
│                         │  ┌─────────────────────────────────────────┐ │
│                         │  │ Ask CORA about a cost center error... 📤 │ │
│                         │  └─────────────────────────────────────────┘ │
└────────────────────────┴────────────────────────────────────────────────┘
```

### Step 3 — AI Analysis (< 8 seconds)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CORA — Cost Center Error Resolution Agent              🔄  ⚙️          │
├────────────────────────┬────────────────────────────────────────────────┤
│  📋 Open Errors  [+]   │  💬 Analyzing: KS113 on CC1000                │
│  ─────────────────────  │  ──────────────────────────────────────────── │
│  ▶ KS113 — CC1000 🔴   │  ┌──────────────────────────────────────────┐ │
│  Period blocked         │  │ ⚠️ Cost center CC1000 has an active       │ │
│  [MASTER DATA]          │  │    posting block for period 05/2026.      │ │
│                         │  └──────────────────────────────────────────┘ │
│                         │                                               │
│                         │  ┌──────────────────────────────────────┐    │
│                         │  │ 🤖 CORA                       10:23  │    │
│                         │  │                                      │    │
│                         │  │ Cost center CC1000 is currently      │    │
│                         │  │ BLOCKED for primary cost postings.   │    │
│                         │  │                                      │    │
│                         │  │ Root cause: The posting block        │    │
│                         │  │ (IsBlockedForPrimCosts = 'X') was    │    │
│                         │  │ set on 31-May-2026 during period-end │    │
│                         │  │ close. This is a standard control    │    │
│                         │  │ to prevent late postings.            │    │
│                         │  │                                      │    │
│                         │  │ Responsible person: Sarah Chen       │    │
│                         │  │ Profit Center: PC-EMEA               │    │
│                         │  │ Hierarchy: COST_H1 > EMEA > Finance  │    │
│                         │  │                                      │    │
│                         │  │ 3 recommendations ready ↓            │    │
│                         │  └──────────────────────────────────────┘    │
│                         │                                               │
│                         │  🎯 AI Recommendations                        │
│                         │  ─────────────────────────────────────────── │
│                         │  🔴 HIGH  94%  Unlock cost center CC1000     │
│                         │  Remove the primary posting block via        │
│                         │  Manage Cost Centers (F1482). Requires       │
│                         │  CostCenterManager authorization.            │
│                         │                               [Execute] 👍👎 │
│                         │                                               │
│                         │  🟡 MED   82%  Use alternate cost center     │
│                         │  CC1001 is active with same hierarchy.       │
│                         │                               [Execute] 👍👎 │
│                         │                                               │
│                         │  🔵 LOW   71%  Create workflow approval      │
│                         │  Request CO team to authorize emergency      │
│                         │  posting unlock via workflow ticket.         │
│                         │                               [Execute] 👍👎 │
└────────────────────────┴────────────────────────────────────────────────┘
```

**Outcome:** Sarah clicks "Execute" on the workflow recommendation → ticket created, CO team notified → posting processed within 30 minutes instead of waiting for email response.

---

## Use Case 2: Posting Period Closed

**Scenario:** Batch job fails at 00:30 on June 1st posting June expenses to multiple cost centers — period 05/2026 was closed at midnight.

**User:** Automated batch process + Finance Operations Support

### CORA Chat Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Chat with CORA                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ 👤 Finance Ops                                00:45  │              │
│  │                                                      │              │
│  │ Our overnight batch failed with BU011 on 47          │              │
│  │ documents. What happened and what do we do?          │              │
│  └──────────────────────────────────────────────────────┘              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ 🤖 CORA                                       00:46  │              │
│  │                                                      │              │
│  │ I can see 47 BU011 errors in the system. Here's      │              │
│  │ what happened:                                       │              │
│  │                                                      │              │
│  │ 📅 Fiscal period 05/2026 was CLOSED at 00:00 on      │              │
│  │ 01-Jun-2026 for account type S (G/L) in company      │              │
│  │ code 1000. Your batch job started at 00:30 and       │              │
│  │ attempted to post 47 documents to the closed period. │              │
│  │                                                      │              │
│  │ Options:                                             │              │
│  │                                                      │              │
│  │ 1️⃣  [HIGH] Request emergency period re-opening       │              │
│  │    Posts in period 05 with CFO approval. Requires    │              │
│  │    workflow to Finance Director + Auditor sign-off.  │              │
│  │                             [Create Workflow] 👍👎   │              │
│  │                                                      │              │
│  │ 2️⃣  [HIGH] Post in period 06/2026 instead            │              │
│  │    Post all 47 documents to June (period 06).        │              │
│  │    Include explanatory note in document text.        │              │
│  │                              [Retry Posting] 👍👎    │              │
│  │                                                      │              │
│  │ 3️⃣  [MED] Investigate if any are truly May expenses  │              │
│  │    Review each document — if all are June costs      │              │
│  │    (just delayed), option 2 is cleaner and safer.    │              │
│  │                            [Launch Analysis] 👍👎    │              │
│  └──────────────────────────────────────────────────────┘              │
│                                                                         │
│  [ Ask follow-up...                                                 📤 ]│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Use Case 3: Budget Exceeded

**Scenario:** Procurement team creates a purchase order for CC3000, but the cost center has already consumed 108% of its annual IT budget.

### CORA Analysis Screen

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CORA — Cost Center Error Resolution Agent                              │
├────────────────────────┬────────────────────────────────────────────────┤
│  📋 Open Errors  [+]   │  Error Summary                                 │
│  ─────────────────────  │  ─────────────────────────────────────────── │
│  🔴 KP006 — CC3000 🔴  │  ┌──────────────────────────────────────────┐ │
│  Budget exceeded        │  │  Cost Center:     CC3000 — IT Operations │ │
│  EUR 15,000             │  │  Company Code:    1000                   │ │
│  [TRANSACTION]          │  │  Layer:           TRANSACTION            │ │
│                         │  │  Error Code:      KP006                  │ │
│                         │  └──────────────────────────────────────────┘ │
│                         │                                               │
│                         │  💬 CORA Analysis                            │
│                         │  ─────────────────────────────────────────── │
│                         │                                               │
│                         │  📊 Budget Status for CC3000 (FY 2026):      │
│                         │  ┌──────────────────────────────────────────┐ │
│                         │  │  Total Budget:     EUR  250,000          │ │
│                         │  │  Consumed:         EUR  270,000  (108%) │ │
│                         │  │  Overshoot:        EUR   20,000          │ │
│                         │  │  Cost Element:     430000 (IT Services) │ │
│                         │  └──────────────────────────────────────────┘ │
│                         │                                               │
│                         │  Root Cause: CC3000 exceeded its annual IT   │
│                         │  services budget (430000) by EUR 20,000.     │
│                         │  The new PO of EUR 15,000 would push total   │
│                         │  overshoot to EUR 35,000 (114% utilization). │
│                         │                                               │
│                         │  🎯 Recommendations                          │
│                         │  🔴 HIGH  91%  Request budget supplement     │
│                         │  Raise budget increase request via workflow  │
│                         │  to Cost Center Manager (John Davies).       │
│                         │                           [Create Ticket]    │
│                         │                                               │
│                         │  🟡 MED   79%  Transfer from CC3001 IT pool  │
│                         │  CC3001 has EUR 45,000 unspent in the same  │
│                         │  cost element group. Budget transfer         │
│                         │  possible within same controlling area.      │
│                         │                          [Create Workflow]   │
└────────────────────────┴────────────────────────────────────────────────┘
```

---

## Use Case 4: Authorization Failure (K_CSKS)

**Scenario:** New hire Bob attempts to display a cost center report for CC4000 but lacks the authorization object K_CSKS for that cost center.

### CORA Chat

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Chat with CORA                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ 👤 Bob                                   09:15   │                  │
│  │                                                  │                  │
│  │ I got error 7Q299 trying to display CC4000.      │                  │
│  │ What does it mean and how do I get access?       │                  │
│  └──────────────────────────────────────────────────┘                  │
│                                                                         │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ 🤖 CORA                                  09:15   │                  │
│  │                                                  │                  │
│  │ This is an AUTHORIZATION error. Your user        │                  │
│  │ account (BOB) doesn't have the required          │                  │
│  │ permission to access cost center CC4000.         │                  │
│  │                                                  │                  │
│  │ Missing authorization:                           │                  │
│  │  Object: K_CSKS (Cost Center Authorization)      │                  │
│  │  Field:  KOSTL = CC4000                          │                  │
│  │  Action: Display (ACTVT = 03)                    │                  │
│  │                                                  │                  │
│  │ CC4000 is in the "R&D" cost center group which   │                  │
│  │ requires the role "CC_RD_VIEWER" assigned by     │                  │
│  │ your IT Security team.                           │                  │
│  │                                                  │                  │
│  │ 🎯 What you should do:                           │                  │
│  │                                                  │                  │
│  │ 1️⃣  [HIGH] Submit access request to IT          │                  │
│  │    I'll create a pre-filled ServiceNow ticket    │                  │
│  │    requesting role CC_RD_VIEWER for your user.   │                  │
│  │    Typical approval: 1–2 business days.          │                  │
│  │                          [Create IT Ticket] 👍   │                  │
│  │                                                  │                  │
│  │ 2️⃣  [MED]  Ask your manager to request on your  │                  │
│  │    behalf if urgent — they can fast-track via    │                  │
│  │    the role assignment workflow.                 │                  │
│  └──────────────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Use Case 5: Assessment Cycle Failure

**Scenario:** Month-end allocation cycle "EMEA_IT_ALLOC" fails because receiver cost center CC5050 expired on 28-Feb-2026.

### CORA Batch Error Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CORA — Cost Center Error Resolution Agent                              │
├────────────────────────┬────────────────────────────────────────────────┤
│  📋 Open Errors  [+]   │  💬 Analyzing: KI261 — Assessment Cycle Error  │
│  ─────────────────────  │                                               │
│  🔴 KI261 — CC5050 🔴  │  ┌──────────────────────────────────────────┐ │
│  Assessment receiver    │  │ ⚠️ Assessment cycle failed — receiver      │ │
│  expired                │  │    cost center CC5050 is expired.          │ │
│  [MASTER DATA]          │  └──────────────────────────────────────────┘ │
│                         │                                               │
│                         │  ┌──────────────────────────────────────┐    │
│                         │  │ 🤖 CORA                       23:05  │    │
│                         │  │                                      │    │
│                         │  │ Assessment cycle "EMEA_IT_ALLOC"     │    │
│                         │  │ failed on 31-May-2026 at 23:00.      │    │
│                         │  │                                      │    │
│                         │  │ Cause: Receiver cost center CC5050   │    │
│                         │  │ "Legacy IT Operations" expired on    │    │
│                         │  │ 28-Feb-2026 (ValidityEnd: 2026-02-28)│    │
│                         │  │ and has not been extended or replaced.│    │
│                         │  │                                      │    │
│                         │  │ The cycle has 3 other receivers      │    │
│                         │  │ (CC5051, CC5052, CC5053) that are    │    │
│                         │  │ all active — only CC5050 is failing. │    │
│                         │  │                                      │    │
│                         │  │ Impact: EUR 45,000 of IT costs are  │    │
│                         │  │ NOT being allocated to R&D division. │    │
│                         │  └──────────────────────────────────────┘    │
│                         │                                               │
│                         │  🎯 Recommendations                          │
│                         │  🔴 HIGH  93%  Extend CC5050 validity        │
│                         │  Extend validity to 31-Dec-2026 via          │
│                         │  Manage Cost Centers (F1482). Then           │
│                         │  rerun the allocation cycle.                 │
│                         │                    [Update Cost Center]      │
│                         │                                               │
│                         │  🟡 MED   85%  Replace with CC5054           │
│                         │  If CC5050 is being decommissioned,          │
│                         │  update the allocation cycle to use          │
│                         │  CC5054 "New IT Operations" instead.         │
│                         │                    [Launch Manage Alloc]     │
│                         │                                               │
│                         │  🔵 LOW   74%  Manual reallocation           │
│                         │  Post a manual correcting entry for          │
│                         │  the missed EUR 45,000 allocation.           │
│                         │                    [Open Journal Entry]      │
└────────────────────────┴────────────────────────────────────────────────┘
```

---

## Use Case 6: Activity Type Not Assigned

**Scenario:** Internal order ORDS-2341 attempts to confirm machine hours to cost center CC2000, but activity type MACH_HR is not assigned to CC2000 for FY 2026.

### CORA Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Chat with CORA                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ 👤 Production Controller               14:22     │                  │
│  │                                                  │                  │
│  │ Error KP042 on order ORDS-2341. Can't post       │                  │
│  │ machine hours to CC2000. Please advise.          │                  │
│  └──────────────────────────────────────────────────┘                  │
│                                                                         │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ 🤖 CORA                                14:23     │                  │
│  │                                                  │                  │
│  │ I've analyzed the KP042 error for order          │                  │
│  │ ORDS-2341. Here's the situation:                 │                  │
│  │                                                  │                  │
│  │ Activity type "MACH_HR" (Machine Hours) has      │                  │
│  │ NOT been assigned to cost center CC2000          │                  │
│  │ "Production Line 1" for fiscal year 2026.        │                  │
│  │                                                  │                  │
│  │ ✅ CC2000 has these activity types in 2026:      │                  │
│  │   • LABOR_HR  (Labour Hours)    — active         │                  │
│  │   • SETUP_HR  (Setup Hours)     — active         │                  │
│  │                                                  │                  │
│  │ ❌ MACH_HR was active in 2025 but was NOT        │                  │
│  │   carried forward to the 2026 planning cycle.   │                  │
│  │                                                  │                  │
│  │ Fix: Assign MACH_HR to CC2000 for FY 2026        │                  │
│  │ via transaction KP26 (Activity Type Planning).   │                  │
│  │ Set planned quantity and confirm the price.      │                  │
│  │                                                  │                  │
│  │ [🚀 Open KP26 via Fiori]   [📋 Create Ticket]   │                  │
│  └──────────────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Use Case 7: Top Recurring Errors Dashboard Query

**Scenario:** CO Team Lead wants to understand the most common errors this month to plan preventive actions.

### CORA Analytics Response

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Chat with CORA                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ 👤 CO Team Lead                            08:30     │              │
│  │                                                      │              │
│  │ Show me the top recurring errors this month          │              │
│  │ and what's causing them                              │              │
│  └──────────────────────────────────────────────────────┘              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ 🤖 CORA                                    08:31     │              │
│  │                                                      │              │
│  │ 📊 Top 5 Recurring Errors — May 2026                 │              │
│  │                                                      │              │
│  │ ┌─────┬────────┬──────┬────────────────────────────┐ │              │
│  │ │ # │ Code   │ Count│ Root Cause                  │ │              │
│  │ ├─────┼────────┼──────┼────────────────────────────┤ │              │
│  │ │ 1 │ BU011  │  89  │ Period close blocks —       │ │              │
│  │ │   │        │      │ batch jobs run after 00:00  │ │              │
│  │ ├─────┼────────┼──────┼────────────────────────────┤ │              │
│  │ │ 2 │ KS113  │  67  │ CC master locked — no       │ │              │
│  │ │   │        │      │ automatic lock review       │ │              │
│  │ ├─────┼────────┼──────┼────────────────────────────┤ │              │
│  │ │ 3 │ 7Q299  │  43  │ New hires missing K_CSKS   │ │              │
│  │ │   │        │      │ — IT onboarding gap         │ │              │
│  │ ├─────┼────────┼──────┼────────────────────────────┤ │              │
│  │ │ 4 │ KP006  │  31  │ Q2 budget depleted early    │ │              │
│  │ │   │        │      │ — IT project overrun         │ │              │
│  │ ├─────┼────────┼──────┼────────────────────────────┤ │              │
│  │ │ 5 │ KI235  │  28  │ Cost element category       │ │              │
│  │ │   │        │      │ mismatch after CoA change   │ │              │
│  │ └─────┴────────┴──────┴────────────────────────────┘ │              │
│  │                                                      │              │
│  │ 💡 Top Preventive Actions I Recommend:               │              │
│  │                                                      │              │
│  │ 1. Shift batch jobs to run BEFORE midnight (BU011)   │              │
│  │ 2. Add auto-review of CC locks before period-end     │              │
│  │ 3. Update IT onboarding checklist to include K_CSKS  │              │
│  │                                                      │              │
│  │ [📥 Export Report]   [📋 Create Action Plan Ticket]  │              │
│  └──────────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Use Case 8: Self-Service — Retry Failed Posting

**Scenario:** After a CO team member unlocks cost center CC1000, the original user Sarah returns to CORA to retry the failed posting directly.

### Retry Posting Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Chat with CORA                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ 👤 Sarah                                 11:45   │                  │
│  │                                                  │                  │
│  │ The CO team unlocked CC1000. Can you retry       │                  │
│  │ the original failed document 1800001234?         │                  │
│  └──────────────────────────────────────────────────┘                  │
│                                                                         │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ 🤖 CORA                                  11:45   │                  │
│  │                                                  │                  │
│  │ Document 1800001234 details:                     │                  │
│  │  • Amount:   EUR 1,250.00                        │                  │
│  │  • CC:       CC1000 (now UNLOCKED ✅)            │                  │
│  │  • Period:   05/2026 (still OPEN ✅)             │                  │
│  │  • Posted:   31-May-2026                         │                  │
│  │                                                  │                  │
│  │ ✅ All preconditions are met. Ready to retry.    │                  │
│  │                                                  │                  │
│  │ [▶ Retry Posting 1800001234]                     │                  │
│  └──────────────────────────────────────────────────┘                  │
│                                                                         │
│  ╔══════════════════════════════════════════════════╗                  │
│  ║  ✅ Posting Successful!                          ║                  │
│  ║  Document 1800001234 posted successfully to      ║                  │
│  ║  CC1000 for period 05/2026. EUR 1,250.00         ║                  │
│  ║  charged to cost element 430000.                 ║                  │
│  ║                             [View Document]      ║                  │
│  ╚══════════════════════════════════════════════════╝                  │
│                                                                         │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ 🤖 CORA                                  11:46   │                  │
│  │                                                  │                  │
│  │ Posting was successful! Error KS113 on CC1000    │                  │
│  │ is now RESOLVED. 🎉                              │                  │
│  │                                                  │                  │
│  │ Was this analysis helpful?                       │                  │
│  │  [👍 Yes, very helpful]  [👎 Needs improvement]  │                  │
│  └──────────────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Use Case Summary

| # | Error | Layer | Resolution Time | Action Taken |
|---|-------|-------|----------------|-------------|
| 1 | KS113 — CC blocked | MASTER_DATA | 30 min (vs 3h) | Workflow to CO team |
| 2 | BU011 — Period closed | TRANSACTION | 45 min (vs 4h) | Post in next period |
| 3 | KP006 — Budget exceeded | TRANSACTION | 1 hour (vs 5h) | Budget supplement request |
| 4 | 7Q299 — Auth failure | AUTHORIZATION | 2 days (SLA) | IT access request |
| 5 | KI261 — Assessment cycle fail | MASTER_DATA | 25 min (vs 2h) | Extend CC validity + rerun |
| 6 | KP042 — Activity type missing | TRANSACTION | 20 min (vs 2h) | Assign activity type |
| 7 | Analytics query | N/A | Instant | Preventive action plan |
| 8 | Retry failed posting | N/A | Instant | Self-service retry |
