import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Award, Target, TrendingUp, BookOpen, Clock, ChevronLeft, RefreshCw } from "lucide-react";
import { useInterview } from "@/context/InterviewContext";
import { useGenerateReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatTime } from "@/lib/utils";

export default function Report() {
  const [_, setLocation] = useLocation();
  const { state, resetInterview } = useInterview();
  const { data: report, mutate: generateReport, isPending, error } = useGenerateReport();

  useEffect(() => {
    if (state.status !== "completed") {
      setLocation("/");
      return;
    }

    // Trigger confetti on successful completion landing
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    // Call API to generate report
    generateReport({
      data: {
        domain: state.domain!,
        evaluations: state.evaluations,
        questions: state.history,
        timeTaken: state.elapsedSeconds
      }
    });

    return () => clearInterval(interval);
  }, []);

  const handleRestart = () => {
    resetInterview();
    setLocation("/");
  };

  if (isPending || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Analyzing Your Performance</h2>
        <p className="text-muted-foreground max-w-md">Our AI is reviewing your answers, generating feedback, and calculating your final score...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-6">
          <Target className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Report Generation Failed</h2>
        <p className="text-muted-foreground mb-6">We couldn't generate your final report.</p>
        <Button onClick={handleRestart}>Return Home</Button>
      </div>
    );
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (grade.startsWith('B')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (grade.startsWith('C')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-8">
      <div className="container mx-auto px-4 max-w-5xl">
        
        {/* Top Nav */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={handleRestart} className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <Button variant="outline" onClick={handleRestart}>
            <RefreshCw className="w-4 h-4 mr-2" /> Start New Interview
          </Button>
        </div>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">Interview Performance Report</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{report.summary}</p>
        </motion.div>

        {/* Key Metrics Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
        >
          <Card className="bg-black/40 backdrop-blur text-center border-white/5">
            <CardContent className="p-8">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Overall Score</h3>
              <div className="flex items-end justify-center justify-items-baseline">
                <span className="text-6xl font-bold font-mono text-white leading-none">{report.overallScore}</span>
                <span className="text-xl text-muted-foreground ml-1 mb-1">/10</span>
              </div>
              <Progress value={report.overallScore * 10} className="mt-6 h-1.5" />
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur text-center border-white/5">
            <CardContent className="p-8 flex flex-col items-center justify-center h-full">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Final Grade</h3>
              <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${getGradeColor(report.grade)}`}>
                <span className="text-5xl font-bold font-display">{report.grade}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur text-center border-white/5">
            <CardContent className="p-8 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Session Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-muted-foreground flex items-center"><Clock className="w-4 h-4 mr-2"/> Duration</span>
                    <span className="font-mono text-white">{formatTime(state.elapsedSeconds)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-muted-foreground flex items-center"><BookOpen className="w-4 h-4 mr-2"/> Questions</span>
                    <span className="font-mono text-white">{report.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Award className="w-4 h-4 mr-2"/> Domain</span>
                    <span className="text-white capitalize text-sm">{state.domain?.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detailed Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-400">
                  <TrendingUp className="w-5 h-5 mr-2" /> Top Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {report.strongAreas.map((item, i) => (
                    <li key={i} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">{i+1}</span>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="h-full border-white/5 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-400">
                  <Target className="w-5 h-5 mr-2" /> Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {report.improvementAreas.map((item, i) => (
                    <li key={i} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">{i+1}</span>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action Plan */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary">Recommended Action Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="bg-background/50 border border-white/5 rounded-xl p-4 flex items-start">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 shrink-0"></div>
                    <p className="text-sm text-gray-300 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
