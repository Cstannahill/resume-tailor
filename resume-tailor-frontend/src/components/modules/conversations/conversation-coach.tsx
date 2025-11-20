"use client";

import { useState } from "react";
import { Brain, Play } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PERSONA_TOPICS } from "@/lib/constants";
import { startConversation, respondToConversation } from "@/services/conversations";
import type { ConversationQuestion, ConversationSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type PersonaTopic = (typeof PERSONA_TOPICS)[number]["value"];

export const ConversationCoach = () => {
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ConversationQuestion | null>(null);
  const [focusAreas, setFocusAreas] = useState("");
  const [persona, setPersona] = useState<PersonaTopic>(PERSONA_TOPICS[0].value);
  const [userAnswer, setUserAnswer] = useState("");
  const [thoughtProcess, setThoughtProcess] = useState("");

  const startMutation = useMutation({
    mutationFn: () =>
      startConversation({
        personaTopic: persona,
        focusAreas: focusAreas.split(",").filter(Boolean),
      }),
    onSuccess: (payload) => {
      setSession(payload.session);
      setCurrentQuestion(payload.initialQuestion);
      toast.success("Coach ready", {
        description: payload.initialQuestion.text,
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const respondMutation = useMutation({
    mutationFn: () =>
      session
        ? respondToConversation(session.id, { userAnswer, thoughtProcess })
        : Promise.reject(new Error("Session missing")),
    onSuccess: (payload) => {
      setSession(payload.session);
      setCurrentQuestion(payload.evaluation.nextQuestion ?? null);
      setUserAnswer("");
      setThoughtProcess("");
      toast.info("Evaluation", {
        description: payload.evaluation.evaluation,
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Persona coach
        </CardTitle>
        <CardDescription>LLM quizzes you on specific stacks and stores learning insights.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Persona focus</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={persona}
              onChange={(event) => setPersona(event.target.value as PersonaTopic)}
            >
              {PERSONA_TOPICS.map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {topic.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Focus areas</Label>
            <Input
              placeholder="observability, scaling"
              value={focusAreas}
              onChange={(event) => setFocusAreas(event.target.value)}
            />
          </div>
        </div>
        <Button type="button" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
          <Play className="mr-2 h-4 w-4" />
          {session ? "Restart session" : "Start session"}
        </Button>

        {currentQuestion && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium uppercase text-primary">Current question</p>
            <p className="mt-2 text-base">{currentQuestion.text}</p>
            {currentQuestion.difficulty && (
              <Badge className="mt-3 w-fit" variant="secondary">
                {currentQuestion.difficulty}
              </Badge>
            )}
          </div>
        )}

        {session && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Your answer</Label>
              <Textarea
                rows={4}
                value={userAnswer}
                onChange={(event) => setUserAnswer(event.target.value)}
                placeholder="Reason through the answer..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thought process (optional)</Label>
              <Textarea
                rows={3}
                value={thoughtProcess}
                onChange={(event) => setThoughtProcess(event.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => respondMutation.mutate()}
              disabled={respondMutation.isPending || !userAnswer}
            >
              Submit answer
            </Button>
          </div>
        )}

        {session?.responses?.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Session history</p>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
              {session.responses.map((response) => (
                <div key={response.createdAt} className="rounded-lg border border-border/60 p-3 text-sm">
                  <p className="font-medium text-foreground">{response.question.text}</p>
                  <p className="mt-1 text-muted-foreground">{response.userAnswer}</p>
                  {response.evaluation && (
                    <p className="mt-2 text-xs text-primary">{response.evaluation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
