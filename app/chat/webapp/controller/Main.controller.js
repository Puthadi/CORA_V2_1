sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Text",
  "sap/m/Title",
  "sap/m/List",
  "sap/m/StandardListItem"
], function (Controller, JSONModel, MessageToast, MessageBox,
             Dialog, Button, Text, Title, List, StandardListItem) {
  "use strict";

  // Works with both the CAP backend (port 4004) and the mock server (port 4005).
  const BASE  = "";   // relative — works on any host/port
  const AGENT = BASE + "/agent";
  const ERROR = BASE + "/error";

  return Controller.extend("cc.errorresolution.chat.controller.Main", {

    // ─── Lifecycle ────────────────────────────────────────────────────────

    onInit: function () {
      this._sessionId   = this._uuid();
      this._activeLayer = "";

      const model = new JSONModel({
        sessionId:       this._sessionId,
        messages:        [],
        inputText:       "",
        busy:            false,
        listBusy:        false,
        errorList:       [],
        currentError:    null,
        recommendations: [],
        actions:         [],
        counts: { MASTER_DATA: 0, TRANSACTION: 0, CONFIG: 0, AUTHORIZATION: 0 },
      });
      this.getView().setModel(model, "agent");

      this._loadOpenErrors();
    },

    // ─── Error list ────────────────────────────────────────────────────────

    _loadOpenErrors: function () {
      const model  = this.getView().getModel("agent");
      const filter = this._activeLayer
        ? `(status eq 'OPEN' or status eq 'IN_PROGRESS') and layer eq '${this._activeLayer}'`
        : `status eq 'OPEN' or status eq 'IN_PROGRESS'`;

      model.setProperty("/listBusy", true);

      fetch(`${ERROR}/Errors?$filter=${encodeURIComponent(filter)}&$orderby=createdAt desc&$top=50`)
        .then(r => r.json())
        .then(data => {
          const list = data.value || [];
          model.setProperty("/errorList", list);
          this._updateCounts(list);
        })
        .catch(err => {
          console.warn("Error loading errors:", err);
          model.setProperty("/errorList", []);
        })
        .finally(() => model.setProperty("/listBusy", false));
    },

    _updateCounts: function (list) {
      const model  = this.getView().getModel("agent");
      const counts = { MASTER_DATA: 0, TRANSACTION: 0, CONFIG: 0, AUTHORIZATION: 0 };
      list.forEach(e => { if (counts[e.layer] !== undefined) counts[e.layer]++; });
      model.setProperty("/counts", counts);
    },

    onRefreshErrors: function () {
      this._loadOpenErrors();
      MessageToast.show("Error list refreshed");
    },

    onLayerFilterChange: function (oEvent) {
      this._activeLayer = oEvent.getParameter("selectedItem").getKey();
      this._loadOpenErrors();
    },

    onClearFilter: function () {
      this.byId("layerFilter").setSelectedKey("");
      this._activeLayer = "";
      this._loadOpenErrors();
    },

    onChipFilter: function (oEvent) {
      const src   = oEvent.getSource();
      const layer = src.data("layer");
      this._activeLayer = (this._activeLayer === layer) ? "" : layer;
      this.byId("layerFilter").setSelectedKey(this._activeLayer);
      this._loadOpenErrors();
    },

    onErrorSelect: function (oEvent) {
      const ctx   = oEvent.getParameter("listItem").getBindingContext("agent");
      const error = ctx.getObject();
      const model = this.getView().getModel("agent");

      model.setProperty("/currentError",     error);
      model.setProperty("/recommendations",  []);
      model.setProperty("/actions",          []);

      // Auto-trigger analysis
      const autoMsg = `Analyze this SAP error: ${error.errorCode} — "${error.errorText}" on cost center ${error.costCenter} (${error.companyCode}).`;
      model.setProperty("/inputText", "");
      this._sendMessage(autoMsg, error.ID);
    },

    // ─── Chat ──────────────────────────────────────────────────────────────

    onSend: function () {
      const model = this.getView().getModel("agent");
      const text  = (model.getProperty("/inputText") || "").trim();
      if (!text || model.getProperty("/busy")) return;
      const errorId = (model.getProperty("/currentError") || {}).ID;
      model.setProperty("/inputText", "");
      this._sendMessage(text, errorId);
    },

    onSuggestion: function (oEvent) {
      const text  = oEvent.getSource().getText();
      const model = this.getView().getModel("agent");
      if (model.getProperty("/busy")) return;

      model.setProperty("/busy", true);
      const errorId = (model.getProperty("/currentError") || {}).ID;

      fetch(`${AGENT}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          input: { sessionId: this._sessionId, message: text, errorId: errorId || null }
        }),
      })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => {
          const resp = data.value || data;
          model.setProperty("/recommendations", resp.recommendations || []);
          this._showResultDialog(text, resp.message || "(no response)", resp.recommendations || []);
        })
        .catch(err => MessageBox.error(`Could not reach CORA: ${err.message}`))
        .finally(() => model.setProperty("/busy", false));
    },

    _showResultDialog: function (question, answer, recommendations) {
      var content = [];

      var answerText = new Text({ text: answer, wrapping: true });
      answerText.addStyleClass("coraDlgAnswer");
      content.push(answerText);

      if (recommendations && recommendations.length > 0) {
        var recHeading = new Title({ text: "AI Recommendations", level: "H6" });
        recHeading.addStyleClass("coraDlgRecHeading");
        content.push(recHeading);

        var recList = new List({ showSeparators: "Inner" });
        recommendations.forEach(function (rec) {
          recList.addItem(new StandardListItem({
            title:       rec.title,
            description: rec.description,
            info:        rec.priority,
            infoState:   rec.priority === "HIGH" ? "Error" : rec.priority === "MEDIUM" ? "Warning" : "Success",
            highlight:   rec.priority === "HIGH" ? "Error" : rec.priority === "MEDIUM" ? "Warning" : "Success"
          }));
        });
        content.push(recList);
      }

      var oDialog = new Dialog({
        title:        question,
        contentWidth: "540px",
        resizable:    true,
        draggable:    true,
        content:      content,
        beginButton: new Button({
          text: "Close",
          type: "Emphasized",
          press: function () { oDialog.close(); }
        }),
        afterClose: function () { oDialog.destroy(); }
      });

      this.getView().addDependent(oDialog);
      oDialog.open();
    },

    _sendMessage: function (text, errorId) {
      const model    = this.getView().getModel("agent");
      const messages = model.getProperty("/messages") || [];

      // Append user bubble
      messages.push({ role: "user", content: text, timestamp: this._time() });
      model.setProperty("/messages",  messages);
      model.setProperty("/busy",      true);

      fetch(`${AGENT}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          input: { sessionId: this._sessionId, message: text, errorId: errorId || null }
        }),
      })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`); return r.json(); })
        .then(data => {
          const resp = data.value || data;
          const msgs = model.getProperty("/messages");

          // Append bot bubble
          msgs.push({ role: "assistant", content: resp.message || "(no response)", timestamp: this._time() });
          model.setProperty("/messages",        msgs);
          model.setProperty("/recommendations", resp.recommendations || []);
          model.setProperty("/actions",         resp.actions        || []);

          // Update error summary
          if (resp.errorSummary) {
            const current = model.getProperty("/currentError") || {};
            model.setProperty("/currentError", { ...current, ...resp.errorSummary });
          }

          this._sessionId = resp.sessionId || this._sessionId;
          this._scrollBottom();
        })
        .catch(err => {
          const msgs = model.getProperty("/messages");
          msgs.push({
            role:      "assistant",
            content:   `⚠️ Could not reach CORA backend: ${err.message}\n\nMake sure the mock server is running:\n  node test/mock-server.js`,
            timestamp: this._time(),
          });
          model.setProperty("/messages", msgs);
          this._scrollBottom();
        })
        .finally(() => model.setProperty("/busy", false));
    },

    onClearChat: function () {
      const model = this.getView().getModel("agent");
      model.setProperty("/messages",        []);
      model.setProperty("/recommendations", []);
      model.setProperty("/actions",         []);
      model.setProperty("/currentError",    null);
      this._sessionId = this._uuid();
    },

    onCloseContext: function () {
      const model = this.getView().getModel("agent");
      model.setProperty("/currentError", null);
    },

    onCollapseRecs: function () {
      const panel = this.byId("recsPanel");
      if (panel) panel.setExpanded(!panel.getExpanded());
    },

    // ─── Recommendations ───────────────────────────────────────────────────

    onExecuteRecommendation: function (oEvent) {
      const ctx  = oEvent.getSource().getBindingContext("agent");
      const rec  = ctx.getObject();
      const path = ctx.getPath();
      const model = this.getView().getModel("agent");
      const errorId = (model.getProperty("/currentError") || {}).ID;

      MessageBox.confirm(
        `Execute: "${rec.title}"?\n\n${rec.description}`,
        {
          title:   "Confirm Action",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: (action) => {
            if (action !== MessageBox.Action.OK) return;
            this._doExecute(rec, errorId, path);
          },
        }
      );
    },

    _doExecute: function (rec, errorId, recPath) {
      const model = this.getView().getModel("agent");
      model.setProperty("/busy", true);

      fetch(`${AGENT}/executeAction`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          input: {
            errorId,
            recommendationId: rec.ID,
            actionCode:       rec.actionCode,
            actionPayload:    rec.actionPayload,
          }
        }),
      })
        .then(r => r.json())
        .then(data => {
          const result = data.value || data;

          if (result.success) {
            // Mark recommendation executed in model
            model.setProperty(recPath + "/status", "EXECUTED");

            // Show success in chat
            const msgs = model.getProperty("/messages");
            msgs.push({
              role:      "assistant",
              content:   `✅ **Action completed:** ${result.message}${result.workflowId ? `\n\nWorkflow ID: **${result.workflowId}**` : ""}`,
              timestamp: this._time(),
            });
            model.setProperty("/messages", msgs);
            this._scrollBottom();

            // Reload error list to reflect status change
            this._loadOpenErrors();

            if (result.fioriUrl) {
              MessageBox.information(
                `Fiori deep-link ready:\n${result.fioriUrl}\n\n(In production, this would open your SAP Fiori Launchpad)`,
                { title: "Open Fiori App" }
              );
            }
          } else {
            MessageBox.error(result.message || "Action failed.");
          }
        })
        .catch(err => MessageBox.error(`Action failed: ${err.message}`))
        .finally(() => model.setProperty("/busy", false));
    },

    onThumbUp: function (oEvent) {
      const rec = oEvent.getSource().getBindingContext("agent").getObject();
      this._sendFeedback(rec.ID, true);
      MessageToast.show("Thanks — feedback recorded! 👍");
    },

    onThumbDown: function (oEvent) {
      const rec = oEvent.getSource().getBindingContext("agent").getObject();
      this._sendFeedback(rec.ID, false);
      MessageToast.show("Feedback noted — we'll improve. 👎");
    },

    _sendFeedback: function (recId, helpful) {
      fetch(`${AGENT}/submitFeedback`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ recommendationId: recId, helpful, rating: helpful ? 5 : 1 }),
      }).catch(console.warn);
    },

    // ─── Test data helpers ─────────────────────────────────────────────────

    onIngestSample: function () {
      const samples = [
        { errorCode: "KS113", messageClass: "KS", messageNumber: "113", errorText: "Cost Center CC1000 is blocked for primary postings in period 05/2026", documentNumber: "1800001234", costCenter: "CC1000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "SARAH", processContext: "Manual journal entry posting" },
        { errorCode: "BU011", messageClass: "BU", messageNumber: "011", errorText: "Posting period 05/2026 is closed for account type S in company code 1000", documentNumber: "1800001235", costCenter: "CC2000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "BATCH_JOB", processContext: "Overnight batch posting run" },
        { errorCode: "KP006", messageClass: "KP", messageNumber: "006", errorText: "Budget exceeded for cost center CC3000, cost element 430000 by EUR 15,000", documentNumber: "", costCenter: "CC3000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "ALICE", processContext: "Purchase order commitment check" },
        { errorCode: "7Q299", messageClass: "7Q", messageNumber: "299", errorText: "User BOB does not have authorization for object K_CSKS on cost center CC4000", documentNumber: "", costCenter: "CC4000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "BOB", processContext: "Cost center report display" },
        { errorCode: "KI235", messageClass: "KI", messageNumber: "235", errorText: "Cost element 430500 is not assigned to cost center category A for CC5000", documentNumber: "1800001236", costCenter: "CC5000", companyCode: "2000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "ALICE", processContext: "Direct activity allocation" },
        { errorCode: "KI261", messageClass: "KI", messageNumber: "261", errorText: "Assessment cycle EMEA_IT_ALLOC failed — receiver cost center CC5050 is expired", documentNumber: "", costCenter: "CC5050", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "SYSTEM", processContext: "Month-end allocation cycle EMEA_IT_ALLOC" },
        { errorCode: "KP042", messageClass: "KP", messageNumber: "042", errorText: "Activity type MACH_HR is not assigned to cost center CC2000 for fiscal year 2026", documentNumber: "1800001237", costCenter: "CC2000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "PROD_CTRL", processContext: "Internal order ORDS-2341 machine hours confirmation" },
        { errorCode: "KS124", messageClass: "KS", messageNumber: "124", errorText: "Cost center CC6000 is not valid on posting date 31.05.2026 — validity expired 28.02.2026", documentNumber: "1800001238", costCenter: "CC6000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "FINANCE_OPS", processContext: "Vendor invoice posting — travel expenses" },
      ];

      fetch(`${ERROR}/ingest`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ input: { errors: samples } }),
      })
        .then(r => r.json())
        .then(data => {
          const r = data.value || data;
          MessageToast.show(`Ingested ${r.created} errors (${r.skipped} duplicates skipped)`);
          this._loadOpenErrors();
        })
        .catch(err => MessageBox.error(`Ingest failed: ${err.message}`));
    },

    onResetMock: function () {
      MessageBox.confirm("Reset all mock data to the initial 8 test errors?", {
        title: "Reset Mock Data",
        onClose: (action) => {
          if (action !== MessageBox.Action.OK) return;
          fetch(`${BASE}/test/reset`, { method: "POST" })
            .then(() => {
              this.onClearChat();
              this._loadOpenErrors();
              MessageToast.show("Mock data reset to initial state");
            })
            .catch(() => {
              // Mock server reset not available — just reload
              this._loadOpenErrors();
              MessageToast.show("Errors reloaded");
            });
        }
      });
    },

    // ─── Utilities ─────────────────────────────────────────────────────────

    _scrollBottom: function () {
      const scroll = this.byId("chatScroll");
      if (!scroll) return;
      setTimeout(() => {
        const dom = scroll.getDomRef();
        if (dom) dom.scrollTop = dom.scrollHeight;
      }, 80);
    },

    _time: function () {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    },

    _uuid: function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
      });
    },
  });
});
