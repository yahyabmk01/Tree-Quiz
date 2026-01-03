
import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, TreeDeciduous, ShieldCheck, Mail, Phone, User, 
  ClipboardList, Timer, CheckCircle2, AlertTriangle, MapPin, 
  RotateCcw, History, Trash2, Clock, 
  ArrowLeft, Lightbulb
} from 'lucide-react';
import { 
  AppState, QuizAnswers, UserInfo, AssessmentResult, 
  HistoricalReport 
} from './types';
import { QUIZ_QUESTIONS, LOADING_STEPS, TREE_FACTS } from './constants';
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
 * FactWidget Component - Cycles through tree facts
 */
const FactWidget: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % TREE_FACTS.length);
        setFade(true);
      }, 500);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl animate-fade-in transition-all">
      <div className="flex items-center gap-3 mb-3 text-emerald-700">
        <div className="p-1.5 bg-emerald-100 rounded-lg">
          <Lightbulb size={18} />
        </div>
        <span className="text-xs font-black uppercase tracking-widest">Did You Know?</span>
      </div>
      <p className={cn(
        "text-emerald-900 font-medium text-sm leading-relaxed transition-opacity duration-500",
        fade ? "opacity-100" : "opacity-0"
      )}>
        {TREE_FACTS[index]}
      </p>
    </div>
  );
};

/**
 * TiltCard Component (Liquid Glass Style)
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
const ShinyCTA: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string; disabled?: boolean; type?: 'button'|'submit' }> = ({ onClick, children, className, disabled, type = 'button' }) => {
  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick} 
      className={cn(
        "shiny-cta focus:outline-none", 
        disabled && "opacity-50 grayscale cursor-not-allowed",
        className
      )}
    >
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

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  useEffect(() => {
    if (state === 'LOADING') {
      const stepDuration = 10000 / LOADING_STEPS.length;
      const stepInterval = setInterval(() => {
        setActiveLoadingStepIdx((prev) => {
          if (prev < LOADING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, stepDuration); 
      return () => clearInterval(stepInterval);
    }
  }, [state]);

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setUserInfo({ ...userInfo, phone: formatted });
  };

  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setUserInfo({ ...userInfo, postcode: value });
  };

  const isFormValid = () => {
    const phoneDigits = userInfo.phone.replace(/\D/g, '').length;
    return (
      userInfo.name.length >= 2 &&
      userInfo.email.includes('@') &&
      phoneDigits === 10 &&
      userInfo.postcode.length === 5
    );
  };

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
    if (!isFormValid()) return;

    setState('LOADING');
    setActiveLoadingStepIdx(0);
    
    const startTime = Date.now();
    const MIN_LOAD_TIME = 10000;
    
    try {
      const result = await getTreeAssessment(answers, userInfo.name);
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOAD_TIME - elapsedTime);
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
        {/* Header - Hidden on results for compactness */}
        {state !== 'RESULTS' && state !== 'LOADING' && (
          <header className="flex items-center justify-between mb-8 md:mb-14 animate-fade-in">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
              handleResetQuizState();
              setState('HOME');
            }}>
              <div className="p-2 bg-[#1e40af] rounded-xl text-white shadow-lg transition-transform duration-500 group-hover:rotate-[-8deg]">
                <TreeDeciduous size={24} />
              </div>
              <span className="text-2xl md:text-3xl font-black tracking-tighter text-[#0f172a]">ArborRisk</span>
            </div>
          </header>
        )}

        {/* Home */}
        {state === 'HOME' && (
          <main className="animate-slide-in-bottom max-w-4xl mx-auto py-2">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-widest mb-8 border border-red-100 shadow-sm transition-all hover:bg-red-100">
                <AlertTriangle size={14} />
                <span>Safety Protocol Active</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-[#0f172a] mb-8 leading-[1.1] tracking-tight max-w-5xl mx-auto px-2">
                Could You Be Wasting <span className="text-red-600 tabular-nums">$5,000+</span> on <br className="hidden md:block"/> 
                <span className="animated-underline-red text-slate-800">unnecessary tree removal?</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 mb-10 leading-relaxed font-medium max-w-2xl mx-auto px-6">
                {history.length > 0 
                  ? `Welcome back, ${userInfo.name.split(' ')[0]}. Ready for a new check-up?`
                  : "Take our FREE 60-second assessment and discover exactly what your tree needs."}
              </p>
              <ShinyCTA onClick={handleStartQuiz}>
                {history.length > 0 ? "Start New Assessment 🌳" : "Begin Free Check-up 🛡️"}
              </ShinyCTA>
            </div>
            {history.length > 0 && (
              <div className="max-w-xl mx-auto animate-fade-in">
                <div className="flex items-center justify-between mb-6 px-4">
                  <div className="flex items-center gap-3">
                    <History className="text-blue-500" size={18} />
                    <h3 className="text-lg font-black text-[#1e293b]">Past Assessments</h3>
                  </div>
                  <button onClick={handleClearHistory} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
                <div className="space-y-3">
                  {history.map((report) => (
                    <button key={report.id} onClick={() => handleViewHistorical(report)} className="w-full text-left p-5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-md shrink-0", report.assessment.riskLevel <= 30 ? "bg-emerald-500" : report.assessment.riskLevel <= 70 ? "bg-amber-400" : "bg-red-600")}>
                          <span className="text-sm font-black">{report.assessment.riskLevel}%</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors capitalize">
                            {report.answers.location.split('-').join(' ')} Tree
                          </h4>
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold mt-0.5">
                            <Clock size={10} /> {new Date(report.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-200 group-hover:text-blue-500 transition-all" size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>
        )}

        {/* Quiz & Forms */}
        {state === 'QUIZ' && (
          <div className="max-w-xl mx-auto animate-slide-in-right">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <button onClick={handleQuizBack} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-full max-w-[100px] bg-slate-100 h-1.5 rounded-full overflow-hidden mx-4">
                  <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase">{Math.round(progress)}%</span>
              </div>
              <h2 className="text-2xl font-black text-[#1e293b] mb-10 text-center leading-tight">
                {QUIZ_QUESTIONS[currentQuestionIdx].question}
              </h2>
              <div className="grid gap-3">
                {QUIZ_QUESTIONS[currentQuestionIdx].options.map((option) => (
                  <button key={option.value} onClick={() => handleOptionSelect(QUIZ_QUESTIONS[currentQuestionIdx].id, option.value)} className="w-full text-left p-4 md:p-5 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all group flex items-center gap-4 shadow-sm active:scale-[0.98]">
                    <div className="p-2.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      {(option as any).icon}
                    </div>
                    <span className="text-base font-bold text-slate-600 group-hover:text-blue-900 flex-1">{option.label}</span>
                    <ChevronRight className="text-slate-200 group-hover:text-blue-500 transition-transform" size={20} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {state === 'ADDITIONAL_INFO' && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center">
              <h2 className="text-2xl font-black text-[#1e293b] mb-2">Extra Details? 📋</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">Help Tom understand the specifics</p>
              <textarea 
                value={answers.concerns}
                onChange={(e) => setAnswers(prev => ({ ...prev, concerns: e.target.value }))}
                placeholder="E.g., recent tilting, dying leaves, fungi at base..."
                className="w-full p-6 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-200 rounded-2xl outline-none text-base min-h-[180px] transition-all shadow-inner mb-8"
              />
              <button onClick={() => setState('LEAD_CAPTURE')} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-700 shadow-xl active:scale-95 transition-all">
                Final Step
              </button>
            </div>
          </div>
        )}

        {state === 'LEAD_CAPTURE' && (
          <div className="max-w-md mx-auto animate-slide-in-right">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center">
              <h2 className="text-2xl font-black text-[#1e293b] mb-2">Almost Done! 🌿</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">Verify your details for the report</p>
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <input required type="text" value={userInfo.name} onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })} placeholder="Full Name" className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl outline-none text-base font-bold transition-all" />
                <input required type="email" value={userInfo.email} onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })} placeholder="Email Address" className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl outline-none text-base font-bold transition-all" />
                <input required type="tel" value={userInfo.phone} onChange={handlePhoneChange} placeholder="Phone Number" className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl outline-none text-base font-bold transition-all" />
                <input required type="text" inputMode="numeric" value={userInfo.postcode} onChange={handlePostcodeChange} placeholder="ZIP Code" className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl outline-none text-base font-bold transition-all" />
                <ShinyCTA type="submit" disabled={!isFormValid()} className="w-full mt-4">
                  Generate My Report
                </ShinyCTA>
              </form>
            </div>
          </div>
        )}

        {/* Results */}
        {state === 'RESULTS' && assessment && (
          <div className="max-w-[540px] mx-auto animate-slide-in-bottom pb-12 flex flex-col items-center">
            
            {/* Meter Section - Distanced from card */}
            <div className="flex flex-col items-center text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">Tree Strategy Dashboard</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-[#1a365d] mb-8 tracking-tight">
                Your Expert <span className="text-blue-600">Tree Report.</span>
              </h2>
              <div className="w-full flex justify-center scale-110">
                <RiskMeter value={assessment.riskLevel} statusLabel={assessment.statusLabel} />
              </div>
            </div>

            {/* Main Expert Card - Condensed */}
            <div className="w-full bg-white rounded-[2rem] p-6 md:p-8 shadow-[0_15px_50px_-15px_rgba(30,58,138,0.08)] border border-slate-100 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative shrink-0">
                  <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150&h=150" alt="Tom Edwards" className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border border-white">
                    <CheckCircle2 size={10} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1a365d]">Tom Edwards' Note</h3>
                  <p className="text-emerald-600 font-black text-[8px] uppercase tracking-[0.15em] flex items-center gap-1">
                    @ CERTIFIED ISA SPECIALIST
                  </p>
                </div>
              </div>

              <div className="text-slate-600 leading-relaxed text-sm font-medium space-y-4 text-left mb-6">
                {assessment.summary.split('\n\n').map((para, i) => (
                  <p key={i} className="opacity-90">{para}</p>
                ))}
              </div>

              <hr className="my-6 border-slate-100" />

              <div className="flex flex-col items-center text-center">
                 <div className="space-y-0.5 mb-6 text-[#1a365d] font-black italic text-lg leading-snug">
                    <p>Book your free estimate today 👇</p>
                    <p>and let's see how we can help you</p>
                    <p>keep your tree safe. 🏠</p>
                 </div>
                 <button onClick={() => window.alert("Success! Tom's team will contact you shortly.")} className="bg-[#0f172a] text-white px-8 py-3.5 rounded-full font-black text-xs flex items-center gap-2 hover:bg-blue-900 shadow-lg active:scale-95 transition-all">
                   Book Site Estimate 🌿
                 </button>
              </div>
            </div>

            {/* Liquid Glass Sub-Widgets */}
            <div className="w-full grid grid-cols-2 gap-3 mb-8">
              <TiltCard className="p-5 rounded-[1.5rem] flex flex-col items-start text-left h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-50/50 rounded-lg text-blue-600">
                    <ClipboardList size={18} />
                  </div>
                  <h4 className="text-base font-black text-[#1a365d]">Plan</h4>
                </div>
                <ul className="space-y-3">
                  {assessment.planSteps.slice(0, 3).map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-black shrink-0 text-white shadow-sm">{i + 1}</div>
                      <span className="text-[10px] font-bold text-slate-500 leading-tight">{step}</span>
                    </li>
                  ))}
                </ul>
              </TiltCard>

              <TiltCard className="p-5 rounded-[1.5rem] flex flex-col items-start text-left h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-emerald-50/50 rounded-lg text-emerald-600">
                    <Timer size={18} />
                  </div>
                  <h4 className="text-base font-black text-[#1a365d]">Schedule</h4>
                </div>
                <div className="flex flex-col mb-2">
                  <span className="text-2xl font-black text-blue-600 leading-none tracking-tighter">Priority (72h)</span>
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">DISPATCH CONFIRMED</span>
                </div>
                <p className="text-[9px] font-medium text-slate-400 leading-relaxed mt-auto">
                  Automatic safety trigger for your postcode area.
                </p>
              </TiltCard>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { window.scrollTo({ top: 0 }); handleResetQuizState(); setState('QUIZ'); }} className="px-5 py-2.5 bg-white text-slate-500 font-black text-[9px] uppercase tracking-widest rounded-full border border-slate-100 shadow-sm hover:text-blue-600">
                <RotateCcw size={10} className="inline mr-1" /> Retake
              </button>
              <button onClick={() => { window.scrollTo({ top: 0 }); handleResetQuizState(); setState('HOME'); }} className="px-5 py-2.5 bg-[#0f172a] text-white font-black text-[9px] uppercase tracking-widest rounded-full shadow-lg hover:bg-blue-900">
                <ArrowLeft size={10} className="inline mr-1" /> Home
              </button>
            </div>
          </div>
        )}

        {state === 'LOADING' && (
          <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[500px] animate-zoom-in">
            <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl border border-slate-50 w-full mb-6">
              <div className="flex flex-col items-center mb-8 text-center">
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 mb-6 shadow-sm">
                  <ShieldCheck size={48} />
                </div>
                <h2 className="text-2xl font-black text-[#1e293b] mb-1">Generating Report</h2>
                <p className="text-slate-500 text-sm font-medium">Tom is reviewing your findings...</p>
              </div>
              <div className="w-full mb-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</span>
                  <span className="text-[12px] font-black text-blue-600">
                    {Math.round(((activeLoadingStepIdx + 1) / LOADING_STEPS.length) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${((activeLoadingStepIdx + 1) / LOADING_STEPS.length) * 100}%` }} />
                </div>
              </div>
              <div className="space-y-3">
                {LOADING_STEPS.map((step, idx) => (
                  <div key={step.id} className={cn("p-3 rounded-lg border flex items-center justify-between transition-all", idx === activeLoadingStepIdx ? "bg-blue-50 border-blue-200" : idx < activeLoadingStepIdx ? "bg-slate-50 border-transparent opacity-60" : "bg-white border-transparent")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px]", idx < activeLoadingStepIdx ? "bg-blue-500 text-white" : idx === activeLoadingStepIdx ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400")}>
                        {idx < activeLoadingStepIdx ? <CheckCircle2 size={14} /> : step.id}
                      </div>
                      <p className={cn("font-bold text-xs", idx === activeLoadingStepIdx ? "text-blue-900" : "text-slate-600")}>{step.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <FactWidget />
            </div>
          </div>
        )}

        <footer className="mt-8 pt-8 border-t border-slate-200/40 text-center pb-12 opacity-40">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.5em] mb-4">ArborRisk Intelligence © 2025</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
