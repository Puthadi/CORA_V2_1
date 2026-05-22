using cc.errorresolution as db from '../db/schema';

service ErrorService @(path: '/error') {

  // ─── Full CRUD entities ───────────────────────────────────────────────
  entity Errors           as projection on db.Errors;
  entity Recommendations  as projection on db.Recommendations;
  entity Actions          as projection on db.Actions;
  entity Feedback         as projection on db.Feedback;
  entity ErrorPatterns    as projection on db.ErrorPatterns;

  // ─── Ingestion ────────────────────────────────────────────────────────
  type IngestRequest {
    errors: array of {
      errorCode       : String(20);
      messageClass    : String(20);
      messageNumber   : String(10);
      errorText       : String(512);
      documentNumber  : String(20);
      costCenter      : String(20);
      companyCode     : String(4);
      controllingArea : String(4);
      fiscalYear      : String(4);
      fiscalPeriod    : String(3);
      userId          : String(12);
      processContext  : String(100);
    };
  }

  type IngestResult {
    created : Integer;
    skipped : Integer;
    ids     : array of String;
  }

  action ingest(input: IngestRequest) returns IngestResult;

  // ─── Summary & trends ────────────────────────────────────────────────
  @readonly entity ErrorSummary as select from db.Errors {
    layer,
    status,
    count(*) as count : Integer,
  } group by layer, status;

  @readonly entity ErrorTrends as select from db.Errors {
    errorCode,
    messageClass,
    costCenter,
    count(*) as occurrences : Integer,
  } where createdAt >= $now - interval 30 day
    group by errorCode, messageClass, costCenter
    order by occurrences desc;
}
