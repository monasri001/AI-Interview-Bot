import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { textToSpeech, speechToText, ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import {
  StartInterviewBody,
  TranscribeAudioBody,
  EvaluateAnswerBody,
  GetNextQuestionBody,
  TextToSpeechBody,
  GenerateReportBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TOTAL_QUESTIONS = 10;

const DOMAIN_LABELS: Record<string, string> = {
  "software-developer": "Software Developer",
  "data-science": "Data Science",
  "ai-ml": "AI / Machine Learning",
  "hr-behavioral": "HR / Behavioral",
  "general-aptitude": "General Aptitude",
};

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getDomainPromptContext(domain: string): string {
  const contexts: Record<string, string> = {
    "software-developer": "software development, data structures, algorithms, system design, object-oriented programming, databases, and coding practices",
    "data-science": "data science, statistics, machine learning fundamentals, data analysis, Python/R, SQL, data visualization, and experimental design",
    "ai-ml": "artificial intelligence, machine learning, deep learning, neural networks, NLP, computer vision, model evaluation, and AI ethics",
    "hr-behavioral": "behavioral competencies, situational judgment, teamwork, leadership, communication, conflict resolution, and professional values",
    "general-aptitude": "logical reasoning, quantitative aptitude, verbal ability, critical thinking, and problem-solving",
  };
  return contexts[domain] || "general interview topics";
}

router.post("/interview/start", async (req, res) => {
  try {
    const body = StartInterviewBody.parse(req.body);
    const { domain, candidateName } = body;

    const domainLabel = DOMAIN_LABELS[domain] || domain;
    const context = getDomainPromptContext(domain);

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a senior professional interviewer conducting a ${domainLabel} interview for an Indian candidate. Generate a thoughtful opening interview question about ${context}. The question should be clear, specific, and appropriate for a fresher or entry-level candidate preparing for placements. Only output the question itself, nothing else.`,
        },
        {
          role: "user",
          content: `Generate the first interview question for a ${domainLabel} interview. This is question 1 of ${TOTAL_QUESTIONS}.`,
        },
      ],
    });

    const firstQuestion = completion.choices[0]?.message?.content?.trim() || "Tell me about yourself and your background.";
    const sessionId = generateSessionId();

    res.json({
      sessionId,
      domain,
      firstQuestion,
      questionNumber: 1,
      totalQuestions: TOTAL_QUESTIONS,
    });
  } catch (err) {
    console.error("Start interview error:", err);
    res.status(500).json({ error: "Failed to start interview" });
  }
});

router.post("/interview/transcribe", async (req, res) => {
  try {
    const body = TranscribeAudioBody.parse(req.body);
    const { audio } = body;

    const audioBuffer = Buffer.from(audio, "base64");
    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);

    const text = await speechToText(buffer, format as "wav" | "mp3" | "webm" | "mp4" | "m4a" | "ogg" | "oga" | "flac");

    res.json({ text: text || "" });
  } catch (err) {
    console.error("Transcribe error:", err);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

router.post("/interview/evaluate", async (req, res) => {
  try {
    const body = EvaluateAnswerBody.parse(req.body);
    const { question, answer, domain, questionNumber } = body;

    const domainLabel = DOMAIN_LABELS[domain] || domain;

    if (!answer || answer.trim().length < 5) {
      res.json({
        score: 0,
        strengths: "No answer was provided.",
        improvements: "Please provide a verbal answer to the question.",
        sampleBetterAnswer: "A sample answer would address the core aspects of the question with specific examples.",
        feedbackText: "I didn't receive a response. Please try speaking your answer clearly into the microphone.",
      });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are a senior ${domainLabel} interviewer evaluating a candidate preparing for interviews in India. You must respond with valid JSON only, no extra text. Evaluate the candidate's answer constructively and realistically.`,
        },
        {
          role: "user",
          content: `Question ${questionNumber}: "${question}"
          
Candidate's Answer: "${answer}"

Evaluate this answer and respond with JSON in this exact format:
{
  "score": <number from 0 to 10>,
  "strengths": "<what the candidate did well, be specific>",
  "improvements": "<what needs improvement, be constructive>",
  "sampleBetterAnswer": "<a concise example of a stronger answer>",
  "feedbackText": "<a friendly 2-3 sentence spoken feedback summary>"
}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim() || "{}";

    let evaluation;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      evaluation = {
        score: 5,
        strengths: "You attempted to answer the question.",
        improvements: "Try to be more specific and structured in your response.",
        sampleBetterAnswer: "A good answer would include concrete examples from your experience.",
        feedbackText: "Thanks for your answer. Try to include more specific examples next time.",
      };
    }

    res.json({
      score: Math.min(10, Math.max(0, Number(evaluation.score) || 0)),
      strengths: evaluation.strengths || "",
      improvements: evaluation.improvements || "",
      sampleBetterAnswer: evaluation.sampleBetterAnswer || "",
      feedbackText: evaluation.feedbackText || "",
    });
  } catch (err) {
    console.error("Evaluate error:", err);
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
});

router.post("/interview/next-question", async (req, res) => {
  try {
    const body = GetNextQuestionBody.parse(req.body);
    const { domain, questionNumber, previousQuestions } = body;

    const domainLabel = DOMAIN_LABELS[domain] || domain;
    const context = getDomainPromptContext(domain);
    const isLast = questionNumber >= TOTAL_QUESTIONS;

    if (isLast) {
      res.json({
        question: "That concludes our interview. Thank you for participating!",
        questionNumber,
        isLast: true,
      });
      return;
    }

    const previousQuestionsText = previousQuestions.length > 0
      ? `Previously asked questions (do NOT repeat these):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a senior ${domainLabel} interviewer. Generate a new, unique interview question about ${context} for an Indian candidate. ${previousQuestionsText}. Only output the question itself, nothing else. Make it progressively more specific as the interview proceeds.`,
        },
        {
          role: "user",
          content: `Generate question ${questionNumber} of ${TOTAL_QUESTIONS} for the ${domainLabel} interview.`,
        },
      ],
    });

    const question = completion.choices[0]?.message?.content?.trim() || `Tell me about a challenge you faced related to ${domainLabel}.`;

    res.json({
      question,
      questionNumber,
      isLast: false,
    });
  } catch (err) {
    console.error("Next question error:", err);
    res.status(500).json({ error: "Failed to get next question" });
  }
});

router.post("/interview/tts", async (req, res) => {
  try {
    const body = TextToSpeechBody.parse(req.body);
    const { text, voice } = body;

    const ttsVoice = (voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer") || "nova";
    const audioBuffer = await textToSpeech(text, ttsVoice, "mp3");

    res.json({ audio: audioBuffer.toString("base64") });
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "Failed to convert text to speech" });
  }
});

router.post("/interview/report", async (req, res) => {
  try {
    const body = GenerateReportBody.parse(req.body);
    const { domain, evaluations, questions, timeTaken } = body;

    const domainLabel = DOMAIN_LABELS[domain] || domain;
    const totalQuestions = evaluations.length;
    const overallScore = totalQuestions > 0
      ? evaluations.reduce((sum: number, e: { score: number }) => sum + e.score, 0) / totalQuestions
      : 0;

    const roundedScore = Math.round(overallScore * 10) / 10;

    let grade = "F";
    if (roundedScore >= 9) grade = "A+";
    else if (roundedScore >= 8) grade = "A";
    else if (roundedScore >= 7) grade = "B+";
    else if (roundedScore >= 6) grade = "B";
    else if (roundedScore >= 5) grade = "C";
    else if (roundedScore >= 4) grade = "D";
    else grade = "F";

    const qaSummary = questions.map((q: string, i: number) => {
      const ev = evaluations[i];
      return `Q${i + 1}: ${q}\nScore: ${ev?.score ?? "N/A"}/10\nStrengths: ${ev?.strengths ?? ""}\nImprovements: ${ev?.improvements ?? ""}`;
    }).join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are a senior ${domainLabel} interviewer writing a final performance report for an Indian candidate. Respond with valid JSON only.`,
        },
        {
          role: "user",
          content: `Generate a final performance report based on this interview:
          
Domain: ${domainLabel}
Overall Score: ${roundedScore}/10
Grade: ${grade}
Time Taken: ${Math.floor(timeTaken / 60)} minutes ${timeTaken % 60} seconds
Total Questions: ${totalQuestions}

Question-by-Question Summary:
${qaSummary}

Respond with JSON:
{
  "summary": "<2-3 sentence overall performance summary>",
  "strongAreas": ["<area 1>", "<area 2>"],
  "improvementAreas": ["<area 1>", "<area 2>"],
  "recommendations": ["<specific recommendation 1>", "<specific recommendation 2>", "<specific recommendation 3>"]
}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim() || "{}";
    let report;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      report = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      report = {
        summary: "You completed the interview session. Keep practicing to improve your scores.",
        strongAreas: ["Completed the interview", "Attempted all questions"],
        improvementAreas: ["Technical depth", "Communication clarity"],
        recommendations: [
          "Practice more mock interviews",
          "Study core concepts for your domain",
          "Work on structuring your answers",
        ],
      };
    }

    res.json({
      overallScore: roundedScore,
      totalQuestions,
      grade,
      summary: report.summary || "",
      strongAreas: report.strongAreas || [],
      improvementAreas: report.improvementAreas || [],
      recommendations: report.recommendations || [],
    });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
