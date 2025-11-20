import { apiRequest } from "@/lib/api-client";
import type {
  ConversationSession,
  RespondConversationPayload,
  RespondConversationResponse,
  StartConversationPayload,
  StartConversationResponse,
} from "@/types";

export const startConversation = (payload: StartConversationPayload) =>
  apiRequest<StartConversationResponse>({
    path: "/conversations/session",
    method: "POST",
    data: payload,
  });

export const respondToConversation = (
  sessionId: string,
  payload: RespondConversationPayload,
) =>
  apiRequest<RespondConversationResponse>({
    path: `/conversations/session/${sessionId}/respond`,
    method: "POST",
    data: payload,
  });

export const getConversation = (sessionId: string) =>
  apiRequest<ConversationSession>({
    path: `/conversations/session/${sessionId}`,
    method: "GET",
  });
