import type { ConversationSessionRecord } from '../../repositories/conversations/conversation.repository.types.js';
import type { LLMProvider } from '../../adapters/llm/llm.types.js';

export interface PersonaProfile {
  topic: string;
  expertiseLevel: 'foundational' | 'intermediate' | 'advanced' | 'expert';
  focusAreas: string[];
  tone: 'supportive' | 'directive' | 'probing';
}

export interface ConversationStartRequest {
  userId: string;
  personaTopic: string;
  llmProvider?: LLMProvider;
  focusAreas?: string[];
}

export interface ConversationAnswerRequest {
  sessionId: string;
  userId: string;
  userAnswer: string;
  llmProvider?: LLMProvider;
  thoughtProcess?: string;
}

export interface ConversationQuestion {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ConversationEvaluation {
  evaluation: string;
  proficiencyLevel: string;
  nextQuestion?: ConversationQuestion;
  insights: string[];
  followUpPlan?: string;
}

export interface ConversationStartResult {
  session: ConversationSessionRecord;
  initialQuestion: ConversationQuestion;
}
