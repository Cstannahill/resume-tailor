import { getLLMAdapter } from '../../adapters/llm/index.js';
import {
  appendConversationResponse,
  createConversationSession,
  getConversationSessionById,
  updateConversationSession
} from '../../repositories/conversations/conversation.repository.js';
import { createInsight } from '../../repositories/insights/insight.repository.js';
import type {
  ConversationAnswerRequest,
  ConversationEvaluation,
  ConversationQuestion,
  ConversationStartRequest,
  ConversationStartResult,
  PersonaProfile
} from './conversation.types.js';
import {
  createConversationEvaluationPrompt,
  createPersonaQuestionPrompt
} from '../../prompts/basePrompts.js';
import { extractFocusAreasFromInsights } from './conversation.utils.js';
import { parseJsonResponse } from '../../utils/json.js';

const personaCatalog: Record<string, PersonaProfile> = {
  'full-stack': {
    topic: 'Full-Stack Engineering',
    expertiseLevel: 'expert',
    focusAreas: ['API design', 'performant React', 'DevOps pipelines'],
    tone: 'probing'
  },
  'frontend-react': {
    topic: 'React & Frontend Architecture',
    expertiseLevel: 'advanced',
    focusAreas: ['state management', 'performance optimization', 'testing'],
    tone: 'supportive'
  },
  'backend-node': {
    topic: 'Node.js Systems Design',
    expertiseLevel: 'advanced',
    focusAreas: ['scalability', 'observability', 'data modeling'],
    tone: 'directive'
  }
};

const resolvePersona = (topic: string, focus?: string[]): PersonaProfile => {
  const preset = personaCatalog[topic.toLowerCase()] ?? {
    topic,
    expertiseLevel: 'advanced',
    focusAreas: focus ?? [],
    tone: 'probing'
  };

  return {
    ...preset,
    focusAreas: focus?.length ? focus : preset.focusAreas
  };
};

const generatePersonaQuestion = async (
  persona: PersonaProfile,
  llmProvider?: ConversationStartRequest['llmProvider']
): Promise<ConversationQuestion> => {
  const adapter = getLLMAdapter(llmProvider);
  const response = await adapter.generate({
    messages: createPersonaQuestionPrompt(persona),
    maxOutputTokens: 300
  });

  const parsed = parseJsonResponse<{ question: ConversationQuestion }>(response.content);
  return (
    parsed?.question ?? {
      text: 'Describe how you would architect a production-ready service for this persona.',
      difficulty: 'medium'
    }
  );
};

const evaluateAnswer = async (
  question: string,
  answer: ConversationAnswerRequest,
  personaSummary: string
): Promise<ConversationEvaluation> => {
  const adapter = getLLMAdapter(answer.llmProvider);
  const response = await adapter.generate({
    messages: createConversationEvaluationPrompt(question, answer, personaSummary),
    maxOutputTokens: 500
  });

  const parsed = parseJsonResponse<ConversationEvaluation>(response.content);
  if (!parsed) {
    return {
      evaluation: response.content,
      proficiencyLevel: 'unknown',
      insights: ['LLM returned unstructured response.']
    };
  }

  return parsed;
};

export const startConversation = async (input: ConversationStartRequest): Promise<ConversationStartResult> => {
  const persona = resolvePersona(input.personaTopic, input.focusAreas);
  const question = await generatePersonaQuestion(persona, input.llmProvider);

  const session = await createConversationSession({
    userId: input.userId,
    personaTopic: persona.topic,
    personaSummary: `Focus Areas: ${persona.focusAreas.join(', ')}, Tone: ${persona.tone}, Level: ${persona.expertiseLevel}`,
    currentQuestion: question.text,
    insights: { focusAreas: persona.focusAreas }
  });

  return {
    session,
    initialQuestion: question
  };
};

export const submitConversationAnswer = async (
  input: ConversationAnswerRequest
): Promise<{ session: Awaited<ReturnType<typeof getConversationSessionById>>; evaluation: ConversationEvaluation }> => {
  const session = await getConversationSessionById(input.sessionId);

  if (!session || !session.currentQuestion) {
    throw new Error('Conversation session not found or already completed');
  }

  if (session.userId !== input.userId) {
    throw new Error('Forbidden');
  }

  const evaluation = await evaluateAnswer(session.currentQuestion, input, session.personaSummary);
  const focusAreas = extractFocusAreasFromInsights(session.insights);

  const updatedSession = await appendConversationResponse({
    sessionId: session.id,
    question: session.currentQuestion,
    userAnswer: input.userAnswer,
    evaluation: evaluation.evaluation,
    followUpPlan: evaluation.followUpPlan ?? null
  });

  const latestResponse = updatedSession.responses.at(-1);

  if (latestResponse) {
    await createInsight({
      userId: session.userId,
      topic: `${session.personaTopic} response`,
      level: 'raw',
      source: 'conversation-response',
      layer: 'raw',
      conversationSessionId: session.id,
      conversationResponseId: latestResponse.id,
      payload: {
        question: session.currentQuestion,
        userAnswer: input.userAnswer,
        thoughtProcess: input.thoughtProcess
      },
      technologyNames: focusAreas
    });
  }

  const technologyNames = focusAreas.length > 0 ? focusAreas : evaluation.insights;

  await createInsight({
    userId: session.userId,
    topic: `${session.personaTopic} evaluation`,
    level: evaluation.proficiencyLevel,
    source: 'conversation-evaluator',
    layer: 'derived',
    conversationSessionId: session.id,
    conversationResponseId: latestResponse?.id ?? null,
    notes: evaluation.evaluation,
    payload: evaluation,
    technologyNames
  });

  await updateConversationSession({
    sessionId: session.id,
    currentQuestion: evaluation.nextQuestion?.text ?? null,
    insights: { lastEvaluation: evaluation }
  });

  return {
    session: updatedSession,
    evaluation
  };
};

export const getConversationSession = (sessionId: string) => getConversationSessionById(sessionId);
