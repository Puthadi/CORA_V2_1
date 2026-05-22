sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment) {
  "use strict";

  const AGENT_BASE = "/agent/chat";
  const ERROR_BASE = "/error";

  return Controller.extend("cc.errorresolution.chat.controller.Main", {

    onInit: function () {
      this._sessionId = this._uuid();
      this._loadOpenErrors();
    },

    // ─── Error list ────────────────────────────────────────────────────

    _loadOpenErrors: function () {
      const model = this.getView().getModel("agent");
      fetch(`${ERROR_BASE}/Errors?$filter=status eq 'OPEN' or status eq 'IN_PROGRESS'&$orderby=createdAt desc&$top=50`)
        .then(r => r.json())
        .then(data => {
          const errors = (data.value || []).map(e => ({
            ID:           e.ID,
            errorCode:    e.errorCode,
            costCenter:   e.costCenter,
            companyCode:  e.companyCode,
            layer:        e.layer,
            status:       e.status,
            errorText:    e.errorText,
            rootCauseText: e.rootCauseText,
          }));
          model.setProperty("/errorList", errors);
        })
        .catch(() => model.setProperty("/errorList", []));
    },

    onRefreshErrors: function () {
      this._loadOpenErrors();
      MessageToast.show("Error list refreshed");
    },

    onLayerFilterChange: function (oEvent) {
      const layer = oEvent.getParameter("selectedItem").getKey();
      const model = this.getView().getModel("agent");
      const all   = model.getProperty("/errorList") || [];
      if (!layer) {
        model.setProperty("/errorListFiltered", all);
      } else {
        model.setProperty("/errorListFiltered", all.filter(e => e.layer === layer));
      }
    },

    onErrorSelect: function (oEvent) {
      const item  = oEvent.getParameter("listItem");
      const ctx   = item.getBindingContext("agent");
      const error = ctx.getObject();
      const model = this.getView().getModel("agent");

      model.setProperty("/currentError",     error);
      model.setProperty("/recommendations",  []);
      model.setProperty("/actions",          []);

      this.byId("chatTitle").setText(`Analyzing: ${error.errorCode} on ${error.costCenter}`);

      // Auto-prompt analysis
      const autoMsg = `Analyze this SAP error: ${error.errorCode} — "${error.errorText}" on cost center ${error.costCenter} (${error.companyCode}).`;
      model.setProperty("/inputText", autoMsg);
      this._sendMessage(autoMsg, error.ID);
    },

    // ─── Chat ──────────────────────────────────────────────────────────

    onSend: function () {
      const model = this.getView().getModel("agent");
      const text  = (model.getProperty("/inputText") || "").trim();
      if (!text) return;
      const errorId = (model.getProperty("/currentError") || {}).ID;
      model.setProperty("/inputText", "");
      this._sendMessage(text, errorId);
    },

    onSuggestion: function (oEvent) {
      const text = oEvent.getSource().getText();
      this.getView().getModel("agent").setProperty("/inputText", text);
      this.onSend();
    },

    _sendMessage: function (text, errorId) {
      const model    = this.getView().getModel("agent");
      const messages = model.getProperty("/messages") || [];

      messages.push({ role: "user", content: text, timestamp: this._now() });
      model.setProperty("/messages",  messages);
      model.setProperty("/busy",      true);

      fetch(AGENT_BASE, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          input: { sessionId: this._sessionId, message: text, errorId: errorId || null }
        }),
      })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(data => {
          const resp = data.value || data;
          const msgs = model.getProperty("/messages");
          msgs.push({ role: "assistant", content: resp.message, timestamp: this._now() });
          model.setProperty("/messages",        msgs);
          model.setProperty("/recommendations", resp.recommendations || []);
          model.setProperty("/actions",         resp.actions || []);

          if (resp.errorSummary) {
            model.setProperty("/currentError", {
              ...model.getProperty("/currentError"),
              ...resp.errorSummary,
            });
          }

          this._sessionId = resp.sessionId || this._sessionId;
          this._scrollChatToBottom();
        })
        .catch(err => {
          const msgs = model.getProperty("/messages");
          msgs.push({ role: "assistant", content: `⚠ Error communicating with CORA: ${err.message}`, timestamp: this._now() });
          model.setProperty("/messages", msgs);
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
      this.byId("chatTitle").setText("Chat with CORA");
    },

    // ─── Recommendations ───────────────────────────────────────────────

    onExecuteRecommendation: function (oEvent) {
      const ctx  = oEvent.getSource().getBindingContext("agent");
      const rec  = ctx.getObject();
      const model = this.getView().getModel("agent");
      const errorId = (model.getProperty("/currentError") || {}).ID;

      MessageBox.confirm(
        `Execute: "${rec.title}"?\n\n${rec.description}`,
        {
          title: "Confirm Action",
          onClose: (action) => {
            if (action !== MessageBox.Action.OK) return;
            this._executeAction(rec.actionCode, rec.actionPayload, rec.ID, errorId, ctx.getPath());
          },
        }
      );
    },

    _executeAction: function (actionCode, actionPayload, recId, errorId, recPath) {
      const model = this.getView().getModel("agent");
      model.setProperty("/busy", true);

      fetch(`/agent/executeAction`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          input: { errorId, recommendationId: recId, actionCode, actionPayload }
        }),
      })
        .then(r => r.json())
        .then(data => {
          const result = data.value || data;
          if (result.success) {
            MessageToast.show(result.message || "Action completed successfully.");
            model.setProperty(recPath + "/status", "EXECUTED");

            if (result.fioriUrl) {
              sap.m.URLHelper.redirect(result.fioriUrl, true);
            }
            this._loadOpenErrors();
          } else {
            MessageBox.error(result.message || "Action failed. Please try again.");
          }
        })
        .catch(err => MessageBox.error(`Action failed: ${err.message}`))
        .finally(() => model.setProperty("/busy", false));
    },

    onThumbUp: function (oEvent) {
      const ctx = oEvent.getSource().getBindingContext("agent");
      this._submitFeedback(ctx.getObject().ID, true);
    },

    onThumbDown: function (oEvent) {
      const ctx = oEvent.getSource().getBindingContext("agent");
      this._submitFeedback(ctx.getObject().ID, false);
    },

    _submitFeedback: function (recId, helpful) {
      fetch(`/agent/submitFeedback`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ recommendationId: recId, helpful, rating: helpful ? 5 : 1 }),
      }).then(() => MessageToast.show(helpful ? "Thanks for the feedback!" : "Feedback recorded — we'll improve."));
    },

    // ─── Demo: ingest sample errors ────────────────────────────────────

    onIngestSample: function () {
      const samples = [
        { errorCode: "KS113", messageClass: "KS", messageNumber: "113", errorText: "Cost Center CC1000 is blocked for primary postings in period 05/2026", documentNumber: "1800001234", costCenter: "CC1000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "ALICE", processContext: "Manual posting" },
        { errorCode: "BU011", messageClass: "BU", messageNumber: "011", errorText: "Posting period 05/2026 is closed for account type S in company code 1000", documentNumber: "1800001235", costCenter: "CC2000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "BOB", processContext: "Batch posting" },
        { errorCode: "KP006", messageClass: "KP", messageNumber: "006", errorText: "Budget exceeded for cost center CC3000, cost element 430000 by EUR 15,000", documentNumber: "", costCenter: "CC3000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "ALICE", processContext: "Purchase order commitment" },
        { errorCode: "7Q299", messageClass: "7Q", messageNumber: "299", errorText: "User BOB does not have authorization for K_CSKS on cost center CC4000", documentNumber: "", costCenter: "CC4000", companyCode: "1000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "BOB", processContext: "Cost center display" },
        { errorCode: "KI235", messageClass: "KI", messageNumber: "235", errorText: "Cost element 430500 is not assigned to cost center category A for CC5000", documentNumber: "1800001236", costCenter: "CC5000", companyCode: "2000", controllingArea: "A000", fiscalYear: "2026", fiscalPeriod: "005", userId: "ALICE", processContext: "Direct activity allocation" },
      ];

      fetch(`${ERROR_BASE}/ingest`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ input: { errors: samples } }),
      })
        .then(r => r.json())
        .then(data => {
          const result = data.value || data;
          MessageToast.show(`Ingested ${result.created} errors (${result.skipped} skipped as duplicates)`);
          this._loadOpenErrors();
        })
        .catch(err => MessageBox.error(`Ingest failed: ${err.message}`));
    },

    onSettings: function () {
      MessageToast.show("Settings panel coming in Phase 2.");
    },

    // ─── Helpers ───────────────────────────────────────────────────────

    _scrollChatToBottom: function () {
      const scroll = this.byId("chatScroll");
      if (scroll) setTimeout(() => scroll.scrollTo(0, 99999), 100);
    },

    _now: function () {
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
