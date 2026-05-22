namespace cc.errorresolution;

using { managed, cuid, sap.common.CodeList } from '@sap/cds/common';

// ─── Error Layers & Statuses ───────────────────────────────────────────────

type ErrorLayer   : String(20) enum { MASTER_DATA; TRANSACTION; CONFIG; AUTHORIZATION; UNKNOWN; }
type ErrorStatus  : String(20) enum { OPEN; IN_PROGRESS; RESOLVED; ESCALATED; CLOSED; }
type Priority     : String(10) enum { HIGH; MEDIUM; LOW; }
type ActionStatus : String(20) enum { INITIATED; IN_PROGRESS; COMPLETED; FAILED; CANCELLED; }
type RecStatus    : String(20) enum { PENDING; ACCEPTED; REJECTED; EXECUTED; }
type Role         : String(15) enum { user; assistant; system; }

// ─── Core Entities ─────────────────────────────────────────────────────────

entity Errors : cuid, managed {
  errorCode        : String(20);
  messageClass     : String(20);
  messageNumber    : String(10);
  errorText        : String(512);
  documentNumber   : String(20);
  costCenter       : String(20);
  companyCode      : String(4);
  controllingArea  : String(4);
  fiscalYear       : String(4);
  fiscalPeriod     : String(3);
  userId           : String(12);
  processContext   : String(100);
  status           : ErrorStatus  default 'OPEN';
  layer            : ErrorLayer   default 'UNKNOWN';
  rootCauseText    : LargeString;
  resolvedAt       : Timestamp;
  resolvedBy       : String(12);
  resolutionNotes  : String(1000);
  recommendations  : Composition of many Recommendations on recommendations.error = $self;
  actions          : Composition of many Actions          on actions.error = $self;
}

entity ErrorPatterns : cuid {
  errorCode          : String(20);
  messageClass       : String(20);
  patternDescription : String(500);
  rootCauseTemplate  : LargeString;
  layer              : ErrorLayer;
  recommendedAction  : String(200);
  fioriAppId         : String(100);
  frequency          : Integer  default 0;
  successRate        : Decimal(5,2);
  isActive           : Boolean  default true;
}

entity Recommendations : cuid, managed {
  error              : Association to Errors;
  priority           : Priority     default 'MEDIUM';
  confidence         : Decimal(5,2) default 0;
  title              : String(200);
  description        : LargeString;
  actionCode         : String(50);
  actionPayload      : LargeString;
  status             : RecStatus    default 'PENDING';
  executedAt         : Timestamp;
  executedBy         : String(12);
  feedback           : Composition of many Feedback on feedback.recommendation = $self;
}

entity Actions : cuid, managed {
  error              : Association to Errors;
  recommendation     : Association to Recommendations;
  actionType         : String(50);
  actionDescription  : String(300);
  initiatedBy        : String(12);
  initiatedAt        : Timestamp;
  completedAt        : Timestamp;
  status             : ActionStatus default 'INITIATED';
  result             : LargeString;
  workflowId         : String(50);
  errorMessage       : String(500);
}

entity Conversations : cuid {
  sessionId          : String(50)  @mandatory;
  userId             : String(12);
  role               : Role;
  content            : LargeString @mandatory;
  timestamp          : Timestamp;
  errorRef           : String(50);
  metadata           : LargeString;
}

entity Feedback : cuid {
  recommendation     : Association to Recommendations;
  rating             : Integer; // 1-5
  helpful            : Boolean  default false;
  comment            : String(500);
  submittedBy        : String(12);
  submittedAt        : Timestamp;
}
