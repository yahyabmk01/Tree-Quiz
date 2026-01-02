
import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, TreeDeciduous, ShieldCheck, Mail, Phone, User, 
  ClipboardList, Timer, CheckCircle2, AlertTriangle, MapPin, 
  TrendingUp, RotateCcw, History, Trash2, Clock, 
  ArrowLeft
} from 'lucide-react';
import { 
  AppState, QuizAnswers, UserInfo, AssessmentResult, 
  HistoricalReport 
} from './types';
import { QUIZ_QUESTIONS, LOADING_STEPS } from './constants';
import RiskMeter from './components/RiskMeter';
import FloatingBackground from './components/FloatingBackground';
import { getTreeAssessment } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STORAGE_KEY = 'arborrisk_history_v1';

/**
 * TiltCard Component
 */
const TiltCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRotate = 5;

    setRotateX(((y - centerY) / centerY) * -maxRotate);
    setRotateY(((x - centerX) / centerX) * maxRotate);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: 'transform 0.1s ease-out',
        willChange: 'transform'
      }}
      className={cn("liquid-glass", className)}
    >
      {children}
    </div>
  );
};

/**
 * ShinyCTA Component
 */
const ShinyCTA: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className }) => {
  return (
    <button onClick={onClick} className={cn("shiny-cta focus:outline-none", className)}>
      <span>{children}</span>
    </button>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('HOME');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    condition: '', location: '', storms: '', cracks: '', age: '', concerns: '',
  });
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '', phone: '', postcode: '' });
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [history, setHistory] = useState<HistoricalReport[]>([]);
  const [activeLoadingStepIdx, setActiveLoadingStepIdx] = useState(0);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedHistory = JSON.parse(saved);
        setHistory(parsedHistory);
        if (parsedHistory.length > 0) {
          setUserInfo(parsedHistory[0].userInfo);
        }
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Sync history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  useEffect(() => {
    if (state === 'LOADING') {
      const stepInterval = setInterval(() => {
        setActiveLoadingStepIdx((prev) => {
          if (prev < LOADING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 1100); 
      return () => clearInterval(stepInterval);
    }
  }, [state]);

  const handleStartQuiz = () => {
    handleResetQuizState();
    setState('QUIZ');
  };

  const handleOptionSelect = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    if (currentQuestionIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      setState('ADDITIONAL_INFO');
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('LOADING');
    setActiveLoadingStepIdx(0);
    
    const startTime = Date.now();
    const MIN_LOAD_TIME = 5500;
    
    try {
      // Initiate AI request immediately
      const result = await getTreeAssessment(answers, userInfo.name);
      
      // Calculate how much longer we MUST wait to satisfy the 5.5s rule
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOAD_TIME - elapsedTime);
      
      // Enforce the wait
      await new Promise(resolve => setTimeout(resolve, remainingTime));

      const newReport: HistoricalReport = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        userInfo,
        answers,
        assessment: result
      };

      setAssessment(result);
      setHistory(prev => [newReport, ...prev]);
      setState('RESULTS');
    } catch (err) {
      console.error("Critical Assessment Failure:", err);
      // Wait remaining time even on crash
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOAD_TIME - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      setState('HOME'); 
    }
  };

  const handleViewHistorical = (report: HistoricalReport) => {
    setAssessment(report.assessment);
    setUserInfo(report.userInfo);
    setAnswers(report.answers);
    setState('RESULTS');
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your entire assessment history?")) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleResetQuizState = () => {
    setAssessment(null);
    setCurrentQuestionIdx(0);
    setAnswers({ condition: '', location: '', storms: '', cracks: '', age: '', concerns: '' });
  };

  const handleQuizBack = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(currentQuestionIdx - 1);
    } else {
      handleResetQuizState();
      setState('HOME');
    }
  };

  const progress = ((currentQuestionIdx + (state === 'QUIZ' ? 0 : 1)) / (QUIZ_QUESTIONS.length + 1)) * 100;

  return (
    <div className="relative min-h-screen selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden transition-all duration-700 animate-fade-in">
      <FloatingBackground />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10 lg:py-16">
        {/* Header */}
        <header className="flex items-center justify-between mb-10 md:mb-14 lg:mb-20 animate-fade-in">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
            handleResetQuizState();
            setState('HOME');
          }}>
            <div className="p-2.5 bg-[#1e40af] rounded-xl text-white shadow-xl transition-transform duration-500 group-hover:rotate-[-8deg]">
              <TreeDeciduous size={28} />
            </div>
            <span className="text-2xl md:text-4xl font-black tracking-tighter text-[#0f172a]">ArborRisk</span>
          </div>
        </header>

        {/* Home / Hero Dashboard */}
        {state === 'HOME' && (
          <main className="animate-slide-in-bottom max-w-4xl mx-auto py-2">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-[11px] md:text-[12px] font-black uppercase tracking-widest mb-8 border border-red-100 shadow-sm transition-all hover:bg-red-100">
                <AlertTriangle size={14} />
                <span>Safety Protocol Active</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-[#0f172a] mb-8 md:mb-10 leading-[1.1] tracking-tight max-w-5xl mx-auto px-2">
                Could You Be Wasting <span className="text-red-600 tabular-nums">$5,000+</span> on <br className="hidden md:block"/> 
                <span className="animated-underline-red text-slate-800">unnecessary tree removal?</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-slate-500 mb-10 md:mb-16 leading-relaxed font-medium max-w-3xl mx-auto px-6">
                {history.length > 0 
                  ? `Welcome back, ${userInfo.name.split(' ')[0]}. Here is your safety dashboard.`
                  : "Take our FREE 60-second assessment and discover exactly what your tree needs."}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <ShinyCTA onClick={handleStartQuiz}>
                  {history.length > 0 ? "Start New Assessment 🌳" : "Begin Free Check-up 🛡️"}
                </ShinyCTA>
              </div>
            </div>

            {/* History Log */}
            {history.length > 0 && (
              <div className="max-w-2xl mx-auto animate-fade-in">
                <div className="flex items-center justify-between mb-6 px-4">
                  <div className="flex items-center gap-3">
                    <History className="text-blue-500" size={20} />
                    <h3 className="text-xl font-black text-[#1e293b]">Your Tree History</h3>
                  </div>
                  <button 
                    onClick={handleClearHistory}
                    className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
                  >
                    <Trash2 size={14} /> Clear Log
                  </button>
                </div>

                <div className="space-y-4">
                  {history.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => handleViewHistorical(report)}
                      className="w-full text-left p-6 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all group flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shrink-0",
                          report.assessment.riskLevel <= 30 ? "bg-emerald-500" :
                          report.assessment.riskLevel <= 70 ? "bg-amber-400" : "bg-red-600"
                        )}>
                          <span className="text-xl font-black">{report.assessment.riskLevel}%</span>
                          <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">Risk</span>
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors capitalize">
                            {report.answers.location.split('-').join(' ')} Tree
                          </h4>
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mt-1">
                            <Clock size={12} />
                            {new Date(report.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            <span className="mx-1">•</span>
                            <MapPin size={12} />
                            {report.userInfo.postcode}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>
        )}

        {/* Quiz Flow */}
        {state === 'QUIZ' && (
          <div className="max-w-xl mx-auto animate-slide-in-right">
            <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-10">
                <button onClick={handleQuizBack} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-full max-w-[120px] bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase ml-4">{Math.round(progress)}%</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-[#1e293b] mb-12 text-center leading-tight">
                {QUIZ_QUESTIONS[currentQuestionIdx].question}
              </h2>
              <div className="grid gap-4">
                {QUIZ_QUESTIONS[currentQuestionIdx].options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleOptionSelect(QUIZ_QUESTIONS[currentQuestionIdx].id, option.value)}
                    className="w-full text-left p-5 md:p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all group flex items-center gap-5 shadow-sm active:scale-[0.98] bg-slate-50/40"
                  >
                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                      {(option as any).icon}
                    </div>
                    <span className="text-lg font-bold text-slate-600 group-hover:text-blue-900 flex-1">{option.label}</span>
                    <ChevronRight className="text-slate-200 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-transform" size={24} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        {state === 'ADDITIONAL_INFO' && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-10">
                <button onClick={() => setState('QUIZ')} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                  <ArrowLeft size={20} />
                </button>
              </div>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-black text-[#1e293b] mb-2">Extra Details? 📋</h2>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Help Tom understand the specific situation</p>
              </div>
              <div className="mb-8">
                <textarea 
                  value={answers.concerns}
                  onChange={(e) => setAnswers(prev => ({ ...prev, concerns: e.target.value }))}
                  placeholder="E.g., recent tilting, dying leaves, fungi at base..."
                  className="w-full p-8 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-200 rounded-[2.5rem] outline-none text-lg min-h-[220px] transition-all shadow-inner placeholder:text-slate-300"
                />
              </div>
              <button 
                onClick={() => setState('LEAD_CAPTURE')}
                className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Continue to Final Step
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Lead Capture */}
        {state === 'LEAD_CAPTURE' && (
          <div className="max-w-md mx-auto animate-slide-in-right">
            <div className="bg-white p-8 md:p-14 rounded-[3.5rem] shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-10">
                <button onClick={() => setState('ADDITIONAL_INFO')} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                  <ArrowLeft size={20} />
                </button>
              </div>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-black text-[#1e293b] mb-2">Almost Done! 🌿</h2>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Save your report to your dashboard</p>
              </div>
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input required type="text" value={userInfo.name} onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })} placeholder="Your Name" className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-200 rounded-2xl outline-none text-lg font-bold transition-all shadow-sm" />
                </div>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input required type="email" value={userInfo.email} onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })} placeholder="Email Address" className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-200 rounded-2xl outline-none text-lg font-bold transition-all shadow-sm" />
                </div>
                <div className="relative group">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input required type="tel" value={userInfo.phone} onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })} placeholder="Phone Number" className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-200 rounded-2xl outline-none text-lg font-bold transition-all shadow-sm" />
                </div>
                <div className="relative group">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input required type="text" value={userInfo.postcode} onChange={(e) => setUserInfo({ ...userInfo, postcode: e.target.value })} placeholder="Postcode" className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-200 rounded-2xl outline-none text-lg font-bold transition-all shadow-sm" />
                </div>
                
                <button type="submit" className="w-full bg-blue-600 text-white py-6 md:py-7 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3 mt-6">
                  Get My Report
                  <ChevronRight size={24} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Results Page */}
        {state === 'RESULTS' && assessment && (
          <div className="max-w-3xl mx-auto animate-slide-in-bottom pb-20 px-0 md:px-2">
            <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-16 shadow-[0_40px_120px_-30px_rgba(30,58,138,0.1)] border border-slate-50 overflow-hidden mb-10 flex flex-col items-center mobile-tight">
              
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6 transition-all hover:bg-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-blue-500">Tree Strategy Dashboard</span>
              </div>

              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-[#1a365d] mb-12 md:mb-16 tracking-tight text-center leading-tight px-2">
                Your Expert <span className="text-blue-600">Tree Report.</span>
              </h2>

              <div className="w-full flex justify-center mb-16 md:mb-24 scale-[1.05] md:scale-110">
                <RiskMeter value={assessment.riskLevel} statusLabel={assessment.statusLabel} />
              </div>

              <div className="w-full bg-slate-50/60 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-14 border border-slate-200/40 shadow-inner">
                <div className="flex items-center gap-4 md:gap-5 mb-10">
                  <div className="relative group">
                    <img 
                      src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150&h=150" 
                      alt="Tom Edwards" 
                      className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] object-cover shadow-2xl border-4 border-white transform transition-transform group-hover:scale-110 duration-500"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-[#1a365d]">Tom Edwards' Note</h3>
                    <p className="text-emerald-600 font-black text-[10px] md:text-[11px] uppercase tracking-[0.25em] flex items-center gap-1.5">
                      <ShieldCheck size={12} /> Certified ISA Specialist
                    </p>
                  </div>
                </div>

                <div className="text-slate-600 leading-relaxed text-base md:text-2xl font-medium space-y-6 md:space-y-10 mobile-text-compact">
                  {assessment.summary.split('\n\n').map((para, i) => {
                    const lines = assessment.summary.split('\n\n');
                    const isLast = i === lines.length - 1;
                    return (
                      <p key={i} className={cn(
                        "leading-[1.7] md:leading-loose", 
                        isLast ? "mt-12 pt-12 border-t border-slate-200 text-[#1a365d] font-black text-center text-2xl md:text-3xl italic" : ""
                      )}>
                        {para}
                      </p>
                    );
                  })}
                </div>

                <div className="mt-12 md:mt-16 flex justify-center">
                  <ShinyCTA onClick={() => window.alert("Success! Tom's team will contact you shortly.")}>
                    Book Site Estimate 🌿
                  </ShinyCTA>
                </div>
              </div>
            </div>

            {/* Steps & Timeline */}
            <div className="grid md:grid-cols-2 gap-6 md:gap-10 mb-10 md:mb-16">
              <TiltCard className="p-8 md:p-12 rounded-[3rem]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600 shadow-sm">
                    <ClipboardList size={28} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-[#1a365d] tracking-tight">Response Plan</h3>
                </div>
                <ul className="space-y-5 md:space-y-8">
                  {assessment.planSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[12px] font-black shrink-0 text-white shadow-lg border-2 border-white/40">{i + 1}</div>
                      <span className="text-base md:text-lg font-bold text-slate-700/80 leading-snug">{step}</span>
                    </li>
                  ))}
                </ul>
              </TiltCard>

              <TiltCard className="p-8 md:p-12 rounded-[3rem]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-emerald-600/10 rounded-2xl text-emerald-600 shadow-sm">
                    <Timer size={28} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-[#1a365d] tracking-tight">Timeline</h3>
                </div>
                <div className="mb-6">
                  <span className="text-4xl md:text-5xl font-[1000] tracking-tighter text-blue-600 block mb-2">{assessment.timeline}</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <p className="text-[11px] md:text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">
                      Priority Dispatch Confirmed
                    </p>
                  </div>
                </div>
                <p className="text-base md:text-lg text-slate-600/70 font-medium leading-relaxed">Safety dispatch automatically triggered for your postcode area.</p>
              </TiltCard>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-12">
              <button 
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  handleResetQuizState();
                  setState('QUIZ');
                }}
                className="flex items-center gap-2 px-8 py-4 bg-white text-slate-600 font-black text-[12px] uppercase tracking-widest rounded-2xl border border-slate-100 shadow-sm hover:text-blue-600 transition-all"
              >
                <RotateCcw size={16} /> Retake Assessment
              </button>
              <button 
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  handleResetQuizState();
                  setState('HOME');
                }}
                className="flex items-center gap-2 px-8 py-4 bg-[#0f172a] text-white font-black text-[12px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-blue-600 transition-all"
              >
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {state === 'LOADING' && (
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[500px] animate-zoom-in">
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-50 w-full mb-8">
              <div className="flex flex-col items-center mb-10">
                <div className="p-5 bg-blue-50 rounded-2xl text-blue-600 mb-6 shadow-sm">
                  <ShieldCheck size={56} />
                </div>
                <h2 className="text-3xl font-black text-[#1e293b] mb-2 tracking-tight">Generating Report</h2>
                <p className="text-slate-500 font-medium text-center">Tom is analyzing your structural findings...</p>
              </div>

              <div className="w-full mb-10">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Progress</span>
                  <span className="text-[14px] font-black text-blue-600 tabular-nums">
                    {Math.round(((activeLoadingStepIdx + 1) / LOADING_STEPS.length) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                    style={{ width: `${((activeLoadingStepIdx + 1) / LOADING_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {LOADING_STEPS.map((step, idx) => {
                  const isActive = idx === activeLoadingStepIdx;
                  const isCompleted = idx < activeLoadingStepIdx;
                  return (
                    <div 
                      key={step.id} 
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all duration-500 flex items-center justify-between",
                        isActive ? "bg-blue-50 border-blue-200 scale-[1.02]" : 
                        isCompleted ? "bg-slate-50 border-transparent opacity-60" : "bg-white border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-black text-[12px]",
                          isCompleted ? "bg-blue-500 text-white" : 
                          isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                        )}>
                          {isCompleted ? <CheckCircle2 size={18} /> : step.id}
                        </div>
                        <p className={cn("font-bold text-sm", isActive ? "text-blue-900" : "text-slate-600")}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-12 border-t border-slate-200/40 text-center pb-16 animate-fade-in">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.8em] mb-6">ArborRisk Intelligence © 2025</p>
          <div className="flex justify-center gap-8 opacity-25 grayscale hover:grayscale-0 transition-all duration-700">
             <div className="flex items-center gap-2"><TreeDeciduous size={16}/> <span className="text-[10px] font-black tracking-widest uppercase">ISA Registered</span></div>
             <div className="flex items-center gap-2"><ShieldCheck size={16}/> <span className="text-[10px] font-black tracking-widest uppercase">Property Secure</span></div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
