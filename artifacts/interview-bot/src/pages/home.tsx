import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Code, Database, BrainCircuit, Users, Briefcase, ArrowRight, Loader2 } from "lucide-react";
import { useStartInterview, StartInterviewBodyDomain } from "@workspace/api-client-react";
import { useInterview } from "@/context/InterviewContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DOMAINS = [
  { id: StartInterviewBodyDomain["software-developer"], title: "Software Engineer", icon: Code, desc: "Data structures, algorithms, and system design." },
  { id: StartInterviewBodyDomain["data-science"], title: "Data Science", icon: Database, desc: "Statistics, SQL, machine learning, and data wrangling." },
  { id: StartInterviewBodyDomain["ai-ml"], title: "AI & ML", icon: BrainCircuit, desc: "Deep learning, NLP, computer vision, and model deployment." },
  { id: StartInterviewBodyDomain["hr-behavioral"], title: "HR & Behavioral", icon: Users, desc: "Leadership, conflict resolution, and cultural fit." },
  { id: StartInterviewBodyDomain["general-aptitude"], title: "General Aptitude", icon: Briefcase, desc: "Logical reasoning, puzzles, and problem-solving." },
];

export default function Home() {
  const [_, setLocation] = useLocation();
  const [selectedDomain, setSelectedDomain] = useState<StartInterviewBodyDomain | null>(null);
  const [name, setName] = useState("");
  const { startSession } = useInterview();
  const { toast } = useToast();
  
  const { mutateAsync: startInterviewAPI, isPending } = useStartInterview();

  const handleStart = async () => {
    if (!selectedDomain) {
      toast({ title: "Select a domain", description: "Please select an interview domain to continue.", variant: "destructive" });
      return;
    }
    
    try {
      const response = await startInterviewAPI({
        data: { domain: selectedDomain, candidateName: name || "Candidate" }
      });
      
      startSession(
        response.domain,
        name || "Candidate",
        response.firstQuestion,
        response.sessionId,
        response.totalQuestions
      );
      
      setLocation("/interview");
    } catch (error) {
      toast({ 
        title: "Failed to start interview", 
        description: "There was an error connecting to the server. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Abstract technology background" 
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 flex-1 flex flex-col justify-center max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-2xl mb-6 border border-primary/20">
            <BrainCircuit className="w-6 h-6 text-primary mr-2" />
            <span className="text-primary font-semibold tracking-wide uppercase text-sm">AI-Powered Practice</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight">
            Master Your Next <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Tech Interview
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience realistic, voice-based interview simulations tailored to your domain. Get instant, actionable feedback to land your dream job.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
        >
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOMAINS.map((domain, idx) => {
              const Icon = domain.icon;
              const isSelected = selectedDomain === domain.id;
              return (
                <motion.div key={domain.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-300 h-full",
                      isSelected 
                        ? "border-primary shadow-[0_0_20px_rgba(0,229,255,0.15)] bg-primary/5" 
                        : "hover:border-white/20 hover:bg-white/5"
                    )}
                    onClick={() => setSelectedDomain(domain.id as StartInterviewBodyDomain)}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <Icon className={cn("w-8 h-8 mb-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <h3 className="font-display text-xl font-semibold mb-2">{domain.title}</h3>
                      <p className="text-sm text-muted-foreground mt-auto">{domain.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Card className="sticky top-8 border-white/10 bg-black/40 backdrop-blur-2xl">
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>Configure your practice environment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Candidate Name (Optional)</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-12 px-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Selected Domain</label>
                <div className="h-12 px-4 rounded-xl bg-background/30 border border-white/5 flex items-center text-muted-foreground">
                  {selectedDomain ? DOMAINS.find(d => d.id === selectedDomain)?.title : "None selected"}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Questions</span>
                  <span className="font-medium">10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium">Voice & Text</span>
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <Button 
                className="w-full group" 
                size="lg" 
                onClick={handleStart}
                disabled={!selectedDomain || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing Environment...
                  </>
                ) : (
                  <>
                    Start Interview
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
