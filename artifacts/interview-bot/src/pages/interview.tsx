import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, StopCircle, ArrowRight, CheckCircle2, BrainCircuit } from "lucide-react";
import { useInterview } from "@/context/InterviewContext";
import { useTranscribeAudio, useEvaluateAnswer, useGetNextQuestion, useTextToSpeech } from "@workspace/api-client-react";
import { useVoiceRecorder } from "@workspace/integrations-openai-ai-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn, formatTime, blobToBase64 } from "@/lib/utils";

type InterviewStep = 'playing_question' | 'waiting' | 'recording' | 'processing' | 'feedback' | 'finished';

export default function Interview() {
  const [_, setLocation] = useLocation();
  const { state, recordEvaluation, nextQuestion, endInterview } = useInterview();
  const { toast } = useToast();
  
  const [step, setStep] = useState<InterviewStep>('playing_question');
  const [transcript, setTranscript] = useState<string>("");
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Hook integrations
  const { isRecording, start, stop, blob, clear } = useVoiceRecorder() || { isRecording: false, start: () => {}, stop: () => {}, blob: null, clear: () => {} };
  const { mutateAsync: ttsAPI } = useTextToSpeech();
  const { mutateAsync: transcribeAPI } = useTranscribeAudio();
  const { mutateAsync: evaluateAPI } = useEvaluateAnswer();
  const { mutateAsync: nextQuestionAPI } = useGetNextQuestion();

  // Redirect if accessed directly without session
  useEffect(() => {
    if (state.status === "idle") {
      setLocation("/");
    }
  }, [state.status, setLocation]);

  // Handle Question Audio Playback on new question
  useEffect(() => {
    if (state.currentQuestion && step === 'playing_question') {
      playTextAudio(state.currentQuestion).then(() => {
        setStep('waiting');
      }).catch(err => {
        console.error("TTS Failed:", err);
        setStep('waiting'); // Fallback to waiting if audio fails
      });
    }
  }, [state.currentQuestion]);

  const playTextAudio = async (text: string) => {
    try {
      setIsAiSpeaking(true);
      const res = await ttsAPI({ data: { text, voice: "alloy" } });
      const audio = new Audio(`data:audio/mp3;base64,${res.audio}`);
      setCurrentAudio(audio);
      
      return new Promise<void>((resolve) => {
        audio.onended = () => {
          setIsAiSpeaking(false);
          setCurrentAudio(null);
          resolve();
        };
        audio.play().catch((e) => {
          console.error("Audio playback blocked", e);
          setIsAiSpeaking(false);
          resolve();
        });
      });
    } catch (error) {
      setIsAiSpeaking(false);
      throw error;
    }
  };

  const stopAiSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsAiSpeaking(false);
      if (step === 'playing_question') setStep('waiting');
    }
  };

  const handleToggleRecord = async () => {
    if (isAiSpeaking) stopAiSpeaking();

    if (isRecording) {
      stop();
      setStep('processing');
      handleSubmission();
    } else {
      clear();
      setTranscript("");
      try {
        await start();
        setStep('recording');
      } catch (err) {
        toast({ title: "Microphone Access Denied", description: "Please allow microphone access to practice.", variant: "destructive" });
      }
    }
  };

  const handleSubmission = async () => {
    try {
      // Small delay to ensure blob is populated by the hook
      await new Promise(r => setTimeout(r, 500));
      if (!blob) {
        toast({ title: "Recording failed", description: "No audio captured. Please try again.", variant: "destructive" });
        setStep('waiting');
        return;
      }

      const base64Audio = await blobToBase64(blob);
      
      // 1. Transcribe
      const transcribeRes = await transcribeAPI({ data: { audio: base64Audio } });
      setTranscript(transcribeRes.text);
      
      // 2. Evaluate
      const evaluateRes = await evaluateAPI({ 
        data: { 
          question: state.currentQuestion!, 
          answer: transcribeRes.text,
          domain: state.domain!,
          questionNumber: state.questionNumber
        } 
      });
      
      recordEvaluation(evaluateRes);
      setStep('feedback');
      
      // 3. Play feedback audio
      await playTextAudio(evaluateRes.feedbackText);
      
    } catch (error) {
      console.error(error);
      toast({ title: "Processing Error", description: "Something went wrong while analyzing your answer.", variant: "destructive" });
      setStep('waiting');
    }
  };

  const handleNextQuestion = async () => {
    if (isAiSpeaking) stopAiSpeaking();
    setStep('processing');
    
    if (state.questionNumber >= state.totalQuestions) {
      endInterview();
      setLocation("/report");
      return;
    }

    try {
      const res = await nextQuestionAPI({
        data: {
          domain: state.domain!,
          questionNumber: state.questionNumber,
          previousQuestions: state.history
        }
      });
      
      nextQuestion(res.question, res.isLast);
      setTranscript("");
      clear();
      setStep('playing_question');
    } catch (error) {
      toast({ title: "Network Error", description: "Failed to fetch next question.", variant: "destructive" });
      setStep('feedback'); // revert
    }
  };

  if (state.status === "idle") return null;

  const currentEval = state.evaluations[state.questionNumber - 1];
  const progressPercent = (state.questionNumber / state.totalQuestions) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-primary/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0 pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <BrainCircuit className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold leading-none">{state.domain?.replace('-', ' ').toUpperCase()}</h2>
              <span className="text-xs text-muted-foreground">Practice Session</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono tabular-nums text-lg">{formatTime(state.elapsedSeconds)}</span>
            </div>
          </div>
        </div>
        <Progress value={progressPercent} className="h-1 rounded-none bg-white/5" />
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 container mx-auto px-4 py-8 flex flex-col max-w-5xl">
        
        {/* Status indicator */}
        <div className="flex justify-between items-center mb-8">
          <Badge variant="outline" className="bg-background/50 backdrop-blur border-white/10 px-4 py-1.5 text-sm">
            Question {state.questionNumber} of {state.totalQuestions}
          </Badge>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {isAiSpeaking && (
              <span className="flex items-center text-primary">
                <span className="mr-2">AI Speaking</span>
                <div className="flex space-x-1 h-3 items-end">
                  {[1,2,3,4].map(i => <div key={i} className="w-1 bg-primary rounded-t-sm waveform-bar"></div>)}
                </div>
              </span>
            )}
            {isRecording && (
              <span className="flex items-center text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse mr-2"></span>
                Recording Answer
              </span>
            )}
            {step === 'processing' && (
              <span className="flex items-center text-accent">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Response
              </span>
            )}
          </div>
        </div>

        {/* Question Panel */}
        <Card className="mb-6 border-white/10 bg-black/40 backdrop-blur-xl">
          <CardContent className="p-8 md:p-10">
            <h3 className="text-2xl md:text-3xl font-display font-medium leading-relaxed text-white">
              "{state.currentQuestion}"
            </h3>
            
            <AnimatePresence>
              {transcript && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8 pt-6 border-t border-white/10"
                >
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Your Answer Transcript</p>
                  <p className="text-lg text-gray-300 italic leading-relaxed">"{transcript}"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Feedback Panel */}
        <AnimatePresence mode="wait">
          {step === 'feedback' && currentEval && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6 border-b border-white/10 pb-6">
                    <div>
                      <h4 className="text-xl font-display font-bold text-white mb-1">Feedback Analysis</h4>
                      <p className="text-muted-foreground">{currentEval.feedbackText}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 border-primary bg-background shadow-[0_0_20px_rgba(0,229,255,0.2)] shrink-0 ml-6">
                      <span className="text-2xl font-bold font-mono text-primary">{currentEval.score}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">/10</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
                      <h5 className="text-emerald-400 font-semibold mb-2 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Strengths
                      </h5>
                      <p className="text-sm text-emerald-100/70">{currentEval.strengths}</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                      <h5 className="text-amber-400 font-semibold mb-2 flex items-center">
                        <ArrowRight className="w-4 h-4 mr-2" /> Needs Improvement
                      </h5>
                      <p className="text-sm text-amber-100/70">{currentEval.improvements}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h5 className="text-white font-semibold mb-2">Ideal Response Example</h5>
                    <p className="text-sm text-muted-foreground italic">"{currentEval.sampleBetterAnswer}"</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-auto pt-8 flex items-center justify-center">
          {step === 'feedback' ? (
            <Button size="lg" onClick={handleNextQuestion} className="w-full md:w-auto min-w-[200px] h-14 text-lg">
              {state.questionNumber >= state.totalQuestions ? "Finish Interview & See Report" : "Next Question"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          ) : step === 'processing' ? (
            <div className="flex flex-col items-center text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p>Analyzing response...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative">
                {isRecording && (
                  <motion.div 
                    className="absolute inset-0 bg-destructive rounded-full z-0"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <Button 
                  size="icon"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={handleToggleRecord}
                  className={cn(
                    "relative z-10 transition-all duration-300 w-24 h-24 rounded-full",
                    !isRecording && "hover:scale-105 shadow-[0_0_30px_rgba(0,229,255,0.3)]"
                  )}
                >
                  {isRecording ? <StopCircle className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                </Button>
              </div>
              <p className="mt-6 text-muted-foreground font-medium">
                {isRecording ? "Tap to Stop & Submit" : "Tap to Answer"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
