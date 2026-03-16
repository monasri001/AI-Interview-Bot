import React, { createContext, useContext, useState, useEffect } from "react";
import type { EvaluationResult } from "@workspace/api-client-react";

export type SessionState = "idle" | "in_progress" | "completed";

interface InterviewState {
  status: SessionState;
  sessionId: string | null;
  domain: string | null;
  candidateName: string | null;
  currentQuestion: string | null;
  questionNumber: number;
  totalQuestions: number;
  history: string[];
  evaluations: EvaluationResult[];
  startTime: number | null;
  elapsedSeconds: number;
}

interface InterviewContextType {
  state: InterviewState;
  startSession: (domain: string, candidateName: string, firstQuestion: string, sessionId: string, totalQuestions: number) => void;
  recordEvaluation: (evaluation: EvaluationResult) => void;
  nextQuestion: (question: string, isLast: boolean) => void;
  endInterview: () => void;
  resetInterview: () => void;
}

const initialState: InterviewState = {
  status: "idle",
  sessionId: null,
  domain: null,
  candidateName: null,
  currentQuestion: null,
  questionNumber: 0,
  totalQuestions: 10,
  history: [],
  evaluations: [],
  startTime: null,
  elapsedSeconds: 0,
};

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export function InterviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InterviewState>(initialState);

  // Timer logic
  useEffect(() => {
    let interval: number;
    if (state.status === "in_progress" && state.startTime) {
      interval = window.setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedSeconds: Math.floor((Date.now() - prev.startTime!) / 1000),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.status, state.startTime]);

  const startSession = (domain: string, candidateName: string, firstQuestion: string, sessionId: string, totalQuestions: number) => {
    setState({
      ...initialState,
      status: "in_progress",
      domain,
      candidateName,
      sessionId,
      currentQuestion: firstQuestion,
      questionNumber: 1,
      totalQuestions,
      history: [firstQuestion],
      startTime: Date.now(),
    });
  };

  const recordEvaluation = (evaluation: EvaluationResult) => {
    setState((prev) => ({
      ...prev,
      evaluations: [...prev.evaluations, evaluation],
    }));
  };

  const nextQuestion = (question: string, isLast: boolean) => {
    setState((prev) => {
      const nextNum = prev.questionNumber + 1;
      return {
        ...prev,
        currentQuestion: question,
        questionNumber: nextNum,
        history: [...prev.history, question],
      };
    });
  };

  const endInterview = () => {
    setState((prev) => ({ ...prev, status: "completed" }));
  };

  const resetInterview = () => {
    setState(initialState);
  };

  return (
    <InterviewContext.Provider value={{ state, startSession, recordEvaluation, nextQuestion, endInterview, resetInterview }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }
  return context;
}
