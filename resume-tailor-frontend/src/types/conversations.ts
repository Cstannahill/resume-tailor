import type { EntityBase } from "./common";
import type { LLMProvider } from "./llm";

export interface ConversationQuestion {
  text: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface ConversationResponse {
  question: ConversationQuestion;
  userAnswer: string;
  evaluation?: string;
  createdAt: string;
  insights?: string[];
  proficiencyLevel?: string;
}

export interface ConversationSession extends EntityBase {
  userId: string;
  personaTopic: string;
  focusAreas?: string[];
  currentQuestion?: ConversationQuestion;
  responses: ConversationResponse[];
  insights?: string[];
  proficiencyLevel?: string;
}

export interface StartConversationPayload {
  personaTopic: string;
  focusAreas?: string[];
  llmProvider?: LLMProvider;
}

export interface StartConversationResponse {
  session: ConversationSession;
  initialQuestion: ConversationQuestion;
}

export interface RespondConversationPayload {
  userAnswer: string;
  thoughtProcess?: string;
  llmProvider?: LLMProvider;
}

export interface RespondConversationResponse {
  session: ConversationSession;
  evaluation: {
    evaluation: string;
    proficiencyLevel: string;
    nextQuestion?: ConversationQuestion;
    insights: string[];
    followUpPlan?: string;
  };
}
