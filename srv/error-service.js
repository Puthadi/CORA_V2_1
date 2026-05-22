'use strict';

require('dotenv').config();
const cds  = require('@sap/cds');
const { v4: uuid } = require('uuid');
const kb   = require('./lib/knowledge-base');

module.exports = class ErrorService extends cds.ApplicationService {

  async init() {
    const { ingest } = this.operations;
    this.on(ingest, this._onIngest.bind(this));
    return super.init();
  }

  async _onIngest(req) {
    const { errors: incoming } = req.data.input;
    if (!incoming || incoming.length === 0) return { created: 0, skipped: 0, ids: [] };

    const { Errors } = cds.entities('cc.errorresolution');
    const created = [];
    let skipped = 0;

    for (const e of incoming) {
      // Deduplicate: skip if same errorCode + documentNumber already OPEN
      if (e.documentNumber) {
        const existing = await SELECT.one.from(Errors)
          .where({ documentNumber: e.documentNumber, errorCode: e.errorCode, status: 'OPEN' });
        if (existing) { skipped++; continue; }
      }

      const id    = uuid();
      const layer = kb.classifyLayer(e.messageClass || '', e.errorCode || '');

      await INSERT.into(Errors).entries({
        ID:             id,
        errorCode:      e.errorCode,
        messageClass:   e.messageClass,
        messageNumber:  e.messageNumber,
        errorText:      e.errorText,
        documentNumber: e.documentNumber,
        costCenter:     e.costCenter,
        companyCode:    e.companyCode,
        controllingArea: e.controllingArea,
        fiscalYear:     e.fiscalYear,
        fiscalPeriod:   e.fiscalPeriod,
        userId:         e.userId,
        processContext: e.processContext,
        status:         'OPEN',
        layer,
      });
      created.push(id);
    }

    return { created: created.length, skipped, ids: created };
  }
};
