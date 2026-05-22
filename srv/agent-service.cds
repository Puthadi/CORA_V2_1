using cc.errorresolution as db from '../db/schema';

service AgentService @(path: '/agent') {

  // ─── Conversational chat ──────────────────────────────────────────────
  type ChatRequest {
    sessionId : String(50);
    message   : String(2000);
    errorId   : String(36); // optional — pin conversation to a specific error
  }

  type ChatResponse {
    sessionId        : String(50);
    message          : String;
    recommendations  : array of RecommendationDTO;
    actions          : array of ActionDTO;
    errorSummary     : ErrorSummaryDTO;
  }

  type RecommendationDTO {
    ID          : UUID;
    priority    : String(10);
    confidence  : Decimal(5,2);
    title       : String(200);
    description : String;
    actionCode  : String(50);
    actionPayload: String;
    status      : String(20);
  }

  type ActionDTO {
    code        : String(50);
    label       : String(100);
    description : String(300);
    enabled     : Boolean;
  }

  type ErrorSummaryDTO {
    ID             : UUID;
    errorCode      : String(20);
    costCenter     : String(20);
    companyCode    : String(4);
    layer          : String(20);
    status         : String(20);
    rootCauseText  : String;
  }

  type ActionRequest {
    errorId       : String(36);
    recommendationId: String(36);
    actionCode    : String(50);
    actionPayload : String;
  }

  type ActionResult {
    success     : Boolean;
    message     : String;
    workflowId  : String(50);
    fioriUrl    : String(300);
  }

  // ─── Actions ──────────────────────────────────────────────────────────
  action chat(input: ChatRequest) returns ChatResponse;
  action executeAction(input: ActionRequest) returns ActionResult;
  action submitFeedback(recommendationId: String(36), helpful: Boolean, rating: Integer, comment: String(500)) returns { success: Boolean };

  // ─── Read-only views ──────────────────────────────────────────────────
  @readonly entity ConversationHistory as projection on db.Conversations
    where userId = $user.id;

  @readonly entity OpenErrors as select from db.Errors {
    *,
    recommendations,
    actions,
  } where status in ('OPEN', 'IN_PROGRESS');
}
