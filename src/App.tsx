/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from "@vercel/analytics/next"
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, signInWithGoogle, db } from './lib/firebase';
import { parseDocument } from './lib/parser';
import { analyzeResume, ATSResult, ResumeMetadata, AnalysisResponse } from './lib/gemini';
import { cn, formatDate } from './lib/utils';
import {
  FileText,
  Upload,
  History as HistoryIcon,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  X,
  ChevronRight,
  AlertCircle,
  Search,
  Linkedin,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Clock,
  Sparkles,
  BarChart3,
  Check,
  Building2,
  Info,
  Download,
  Shield,
  Layout,
  Zap,
  Star,
  Quote,
  Lock,
  MessageSquare,
  Globe,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import { generatePDF } from './lib/exportReport';
import ScannerSection from './components/features/ScannerSection';
import Footer from './components/layout/Footer';
import StaticPage from './components/layout/StaticPage';
import IntroScreen from './components/features/IntroScreen';
import SignInPage from './components/features/SignInPage';
// --- Types ---
interface SavedScan {
  id: string;
  resumeText: string;
  jobDescription?: string;
  results: ATSResult[];
  metadata: ResumeMetadata;
  createdAt: any;
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'history' | 'landing' | 'story' | 'methodology' | 'privacy' | 'terms' | 'contact' | 'signin'>('landing');
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [viewingScan, setViewingScan] = useState<SavedScan | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDebug = localStorage.getItem('ATSify_DEBUG') === 'true';
      setDebugMode(isDebug);
      if (isDebug) console.log("[ATSify] Debug Mode Active. Disable with localStorage.removeItem('ATSify_DEBUG')");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        fetchHistory(user.uid);
      }
    });
    return unsubscribe;
  }, []);

  const fetchHistory = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'scans'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt
        };
      }) as SavedScan[];
      setHistory(docs);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const saveScan = async (scan: any) => {
    if (!user) return;

    const path = 'scans';
    try {
      // 🔍 DEBUG HERE
      if (debugMode) {
        console.log("Saving scan:", {
          userId: user.uid,
          hasResumeText: !!scan.resumeText,
          resultsCount: scan.results?.length,
          hasMetadata: !!scan.metadata
        });
      }

      const docRef = await addDoc(collection(db, path), {
        resumeText: scan.resumeText,
        jobDescription: scan.jobDescription || "",
        results: scan.results,
        metadata: scan.metadata || {},
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      const newScan = { ...scan, id: docRef.id, createdAt: Date.now() };
      setHistory(prev => [newScan, ...prev]);
      return newScan;

    } catch (error) {
      handleFirestoreError(error, 'write', path);
    }
  };

  function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous
      },
      operationType,
      path
    };
    console.error('Firestore Error Status: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  const deleteScan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scans', id));
      setHistory(prev => prev.filter(s => s.id !== id));
      if (viewingScan?.id === id) setViewingScan(null);
    } catch (error) {
      console.error("Error deleting scan:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030305]">
        <div className="w-12 h-12 border-4 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.2)]"></div>
      </div>
    );
  }

  if (showIntro) {
    return <IntroScreen onComplete={() => setShowIntro(false)} />;
  }

  return (
    <div className="min-h-screen w-full max-w-full flex flex-col bg-[#030305] selection:bg-cyan-500/30 relative overflow-x-hidden">
      {/* Permanent atmospheric background gradients */}
      <div className="fixed top-[-30%] left-[-20%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.12)_0%,_transparent_60%)] pointer-events-none -z-0 blur-[120px]" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.06)_0%,_transparent_70%)] pointer-events-none -z-0 blur-[100px]" />
      <div className="fixed top-[20%] right-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.05)_0%,_transparent_70%)] pointer-events-none -z-0 blur-[80px]" />
      
      <div className="flex-1 flex flex-col items-center min-h-screen w-full relative z-10 overflow-x-hidden">
        <header className="w-full py-4 sm:py-6 flex items-center justify-center border-b border-white/[0.05] bg-[#050507]/80 backdrop-blur-xl sticky top-0 z-50">
          {user ? (
            <div className="w-full max-w-[1800px] mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-4 sm:gap-12 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer shrink-0" onClick={() => { setActiveTab('landing'); setViewingScan(null); }}>
                  <div className="relative">
                    <img src="/assets/images/logo.jpeg" className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-transform group-hover:scale-110" alt="Logo" />
                    <div className="absolute -inset-1 bg-[#6366f1]/10 rounded-xl sm:rounded-2xl blur-lg -z-10 group-hover:bg-[#6366f1]/20 transition-all"></div>
                  </div>
                  <span className="text-2xl sm:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-[#6366f1] to-purple-400 hidden lg:block italic leading-none pr-2">ATSify</span>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 min-w-0">
                <div className="hidden lg:flex px-4 py-2.5 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full text-xs font-black text-[#10b981] leading-none items-center gap-2.5 uppercase tracking-tighter shrink-0">
                  <ShieldCheck className="w-4 h-4" /> SECURE: LOCAL PROCESSING
                </div>
                
                <div className="relative min-w-0" ref={profileDropdownRef}>
                  <div 
                    className="flex items-center gap-3 cursor-pointer group/user p-1 rounded-full hover:bg-white/5 transition-colors min-w-0"
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  >
                    <div className="text-right hidden sm:block min-w-0">
                      <p className="text-sm font-black text-white leading-none mb-1.5 truncate">{user.displayName || user.email?.split('@')[0]}</p>
                      <p className="text-[10px] text-[#6366f1] font-black uppercase tracking-[0.2em] opacity-80">ATSify Pro</p>
                    </div>
                    <div className="relative shrink-0">
                      <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-white/10 group-hover:border-[#6366f1]/50 transition-all shadow-xl" alt="User" />
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 rounded-full border-[3px] border-[#050507] transition-all",
                        showProfileDropdown ? "bg-[#6366f1] scale-110" : "bg-[#10b981]"
                      )} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-72 sm:w-80 bg-[#0c0c11]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 sm:p-6 z-50 overflow-hidden"
                      >
                        <div className="px-5 py-4 border-b border-white/5 mb-3 flex items-center gap-4">
                           <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border border-white/5" alt="Avatar" />
                           <div className="overflow-hidden">
                             <p className="text-white sm:text-lg font-black tracking-tight truncate">{user.displayName || 'User'}</p>
                             <p className="text-[10px] sm:text-xs text-white/30 truncate uppercase font-black">{user.email}</p>
                           </div>
                        </div>
                        <div className="space-y-1.5">
                          <button 
                            onClick={() => { setActiveTab('scanner'); setShowProfileDropdown(false); setViewingScan(null); }}
                            className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl hover:bg-white/5 text-left transition-all text-sm sm:text-base font-bold text-white/60 hover:text-white group"
                          >
                            New System Scan <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 group-hover:text-cyan-400 transition-colors" />
                          </button>
                          <button 
                            onClick={() => { setActiveTab('history'); setShowProfileDropdown(false); setViewingScan(null); }}
                            className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl hover:bg-white/5 text-left transition-all text-sm sm:text-base font-bold text-white/60 hover:text-white group"
                          >
                            Scan History <HistoryIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 group-hover:text-[#6366f1] transition-colors" />
                          </button>
                          <button 
                            onClick={() => { auth.signOut(); setShowProfileDropdown(false); }}
                            className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl hover:bg-red-500/10 text-left transition-all text-sm sm:text-base font-bold text-red-500/80 hover:text-red-500 group"
                          >
                            Terminate Session <LogOut className="w-4 h-4 sm:w-5 sm:h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 text-center px-4">
                           <p className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">ATSify Secure Auth Module</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[1800px] mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer shrink-0" onClick={() => setActiveTab('landing')}>
                <div className="relative">
                  <img src="/assets/images/logo.jpeg" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-cover shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-transform group-hover:scale-110" alt="Logo" />
                  <div className="absolute -inset-1 bg-[#6366f1]/10 rounded-xl sm:rounded-2xl blur-lg -z-10 group-hover:bg-[#6366f1]/20 transition-all"></div>
                </div>
                <span className="text-2xl sm:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-[#6366f1] to-purple-400 italic pr-2">ATSify</span>
              </div>
              <button
                onClick={() => setActiveTab('signin')}
                className="bg-[#6366f1] hover:bg-[#6366f1]/90 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-xl shadow-[#6366f1]/20 active:scale-95"
              >
                Get Started
              </button>
            </div>
          )}
        </header>

        <main className="w-full flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-20 relative z-10 overflow-x-hidden">
          {/* Prioritize Static Content Pages */}
          {activeTab === 'landing' && !viewingScan ? (
            <LandingSection 
              onGetStarted={user ? () => setActiveTab('scanner') : () => setActiveTab('signin')} 
              onExploreMethodology={() => setActiveTab('methodology')}
            />
          ) : activeTab === 'signin' ? (
            <SignInPage onSignInSuccess={() => setActiveTab('scanner')} />
          ) : activeTab === 'story' ? (
            <StaticPage 
              title="Our Story" 
              subtitle="Why ATSify was built: to help great candidates stop getting filtered out before humans ever see them." 
              icon={<Sparkles className="w-8 h-8" />}
              content={
                <div className="space-y-16">
                  <div className="space-y-6">
                    <p className="text-xl text-white/80 leading-relaxed">
                      ATSify started with a simple frustration: talented applicants were spending hours perfecting resumes, only to get rejected by automated systems before a recruiter ever reviewed their experience. We built ATSify to make that invisible screening process easier to understand, easier to improve for, and less intimidating.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      <h3 className="text-3xl font-black text-white italic tracking-tighter">The Problem</h3>
                      <p className="text-white/40 leading-relaxed">
                        Job seekers are often told to “tailor your resume,” but they are rarely shown what that actually means. Applicant Tracking Systems can parse formatting differently, prioritize exact keywords, miss important sections, or rank candidates based on signals that are hard to see from the outside.
                      </p>
                      <p className="text-white/40 leading-relaxed">
                        ATSify focuses on exposing those hidden signals: formatting, keywords, sections, experience quality, education clarity, and ATS-specific behavior.
                      </p>
                    </div>
                    <div className="p-8 bg-white/[0.02] rounded-[3rem] border border-white/5 space-y-6">
                      <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h4 className="text-xl font-black text-white tracking-tight">The Turning Point</h4>
                      <p className="text-sm text-white/30 leading-relaxed italic">
                        "We realized the issue was not that candidates lacked skill. The issue was that resumes were being judged by systems with rules candidates could not see. ATSify was created to turn that black box into a clear, actionable report."
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white italic tracking-tight">What ATSify Does Differently</h3>
                    <p className="text-white/40 leading-relaxed">
                      ATSify does not just give one generic resume score. It simulates how different ATS platforms may evaluate the same resume, then breaks the result down into clear categories: formatting, keyword match, section completeness, experience strength, education clarity, and measurable impact.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {['Workday', 'Taleo', 'Greenhouse', 'Lever'].map(p => (
                         <div key={p} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{p} Simulation</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="p-12 bg-white/[0.01] rounded-[4rem] border border-white/5 text-center space-y-8">
                    <div className="max-w-2xl mx-auto space-y-6">
                      <h3 className="text-3xl font-black text-white tracking-tighter italic">Our Philosophy</h3>
                      <p className="text-white/40 leading-relaxed">
                        We believe resume tools should be honest, practical, and transparent. ATSify does not promise guaranteed interviews. Instead, it helps users understand where their resume may fail, where it is already strong, and what changes are most likely to improve ATS compatibility.
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-black text-white italic tracking-tight">Built for Job Seekers</h3>
                      <p className="text-white/40 text-sm leading-relaxed">
                        ATSify is built for students, new grads, career switchers, and professionals who want a clearer path through the modern hiring process. Whether someone is applying for their first internship or their next full-time role, the goal is the same: make the resume easier for both machines and humans to understand.
                      </p>
                    </div>
                    <div className="p-10 bg-gradient-to-br from-[#6366f1]/10 to-transparent rounded-[3rem] border border-[#6366f1]/20 space-y-6 relative overflow-hidden">
                      <div className="absolute top-4 right-4 text-[#6366f1]/20"><Sparkles className="w-20 h-20" /></div>
                      <h4 className="text-lg font-black text-white">A Note from Rudra</h4>
                      <p className="text-xs text-white/50 leading-relaxed italic relative z-10">
                        "I built ATSify because I wanted job seekers to have a clearer way to understand why their resumes might not be getting through. The goal was not to replace recruiters or guarantee outcomes. The goal was to give applicants better feedback, better direction, and more control over how they present their experience."
                      </p>
                    </div>
                  </div>

                  <div className="text-center pt-8">
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em]">ATSify exists to make resume screening less mysterious — one resume at a time.</p>
                  </div>
                </div>
              }
            />
          ) : activeTab === 'methodology' ? (
            <StaticPage 
              title="Methodology" 
              subtitle="How ATSify evaluates resume compatibility across modern ATS platforms" 
              icon={<ShieldCheck className="w-8 h-8" />}
              content={
                <div className="space-y-16">
                  {/* Intro */}
                  <div className="space-y-4">
                    <p className="text-xl text-white/80 leading-relaxed">
                      ATSify analyzes resumes using a hybrid scoring methodology based on document parseability, keyword alignment, section completeness, experience quality, education clarity, and platform-specific ATS behavior.
                    </p>
                  </div>

                  {/* Analysis Pipeline */}
                  <div className="space-y-8">
                    <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tight">The Analysis Pipeline</h3>
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-4 py-10 px-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 overflow-x-auto">
                      {[
                        { step: "01", label: "Resume Input", sub: "PDF/DOCX/Text" },
                        { step: "02", label: "Text Extraction", sub: "OCR & Raw Parsing" },
                        { step: "03", label: "Structure Parsing", sub: "Signal Identification" },
                        { step: "04", label: "Platform Simulation", sub: "Behavioral Audits" },
                        { step: "05", label: "Score Breakdown", sub: "Weighted Metrics" },
                        { step: "06", label: "Actionable Report", sub: "Strategic Insights" }
                      ].map((item, idx, arr) => (
                        <React.Fragment key={item.step}>
                          <div className="flex flex-col items-center text-center gap-4 min-w-[140px] shrink-0">
                            <div className="w-12 h-12 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center text-[#6366f1] font-black text-sm relative z-10 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                              {item.step}
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-white font-bold text-sm tracking-tight leading-tight">{item.label}</p>
                              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest leading-none">{item.sub}</p>
                            </div>
                          </div>
                          {idx < arr.length - 1 && (
                            <div className="hidden md:block flex-1 h-[1px] bg-white/10 mt-6 min-w-[1.5rem]" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <p className="text-sm text-white/40 italic">Note: File uploads (PDF/DOCX) allow for layout-based parseability checks, while text input focuses strictly on content and keyword alignment.</p>
                  </div>

                  {/* Extracted Signals */}
                  <div className="space-y-8">
                    <h3 className="text-2xl md:text-4xl font-black text-white italic tracking-tight">What ATSify Extracts</h3>
                    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                      <div className="min-w-[600px] md:min-w-0 rounded-[2rem] border border-white/5 bg-white/[0.01] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Category</th>
                              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">What ATSify Checks</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm text-white/60">
                            <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-4 font-bold text-white whitespace-nowrap">Formatting</td>
                              <td className="px-8 py-4">Columns, tables, images, page/word counts, character encoding, and bullet consistency.</td>
                            </tr>
                            <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-4 font-bold text-white whitespace-nowrap">Sections</td>
                              <td className="px-8 py-4">Presence of Contact, Experience, Education, Skills, and Projects sections.</td>
                            </tr>
                            <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-4 font-bold text-white whitespace-nowrap">Keywords</td>
                              <td className="px-8 py-4">Exact, fuzzy, and semantic matches against Job Description requirements.</td>
                            </tr>
                            <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-4 font-bold text-white whitespace-nowrap">Experience</td>
                              <td className="px-8 py-4">Action verbs, quantified achievements (%, $, #), and technical relevancy.</td>
                            </tr>
                            <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-4 font-bold text-white whitespace-nowrap">Education</td>
                              <td className="px-8 py-4">Degrees, institutions, GPA, honors, and alignment with JD requirements.</td>
                            </tr>
                            <tr className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-8 py-4 font-bold text-white whitespace-nowrap">Platform Quirks</td>
                              <td className="px-8 py-4">ATS-specific parsing limits, keyword boolean constraints, and truncation risks.</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Scoring Signals Detail */}
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white italic tracking-tight">Scoring Signals</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {[
                        { 
                          title: "Formatting & Parseability", 
                          icon: <FileText className="w-5 h-5 text-cyan-400" />,
                          text: "ATSify checks whether the resume can be reliably parsed. Multi-column layouts, complex tables, and images are penalized as they often lead to scrambled text in legacy systems."
                        },
                        { 
                          title: "Keyword Alignment", 
                          icon: <Search className="w-5 h-5 text-[#6366f1]" />,
                          text: "We use different strategies per profile: exact matching for legacy systems like Taleo, and semantic/fuzzy matching for modern platforms like Greenhouse."
                        },
                        { 
                          title: "Experience Quality", 
                          icon: <Zap className="w-5 h-5 text-amber-400" />,
                          text: "The engine rewards bullets starting with action verbs and quantifiable results (e.g., 'Increased efficiency by 40%'). General descriptions are deprioritized."
                        },
                        { 
                          title: "Education Clarity", 
                          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
                          text: "Verification of degrees, majors, and dates. Scoring ensures the data is in the expected order for high-speed automated parsers."
                        }
                      ].map(signal => (
                        <div key={signal.title} className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg border border-white/10">{signal.icon}</div>
                            <h4 className="text-lg font-black text-white tracking-tight">{signal.title}</h4>
                          </div>
                          <p className="text-white/40 text-sm leading-relaxed">{signal.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Platform Profiles */}
                  <div className="space-y-8">
                    <h3 className="text-2xl font-black text-white italic tracking-tight">Platform-Specific ATS Profiles</h3>
                    <div className="grid lg:grid-cols-3 gap-6">
                      {[
                        { 
                          name: "Workday", 
                          features: ["Strict Parser", "Exact Matching", "Clean Layout Required"],
                          desc: "Weights formatting at 25% and keywords at 30%. Penalizes non-standard headers and resumes exceeding 2 pages."
                        },
                        { 
                          name: "Taleo (Legacy)", 
                          features: ["Boolean Filtering", "Rigid Parsing", "Section Sensitive"],
                          desc: "Legacy Oracle system emphasizing keyword density (35%) and standard contact/experience/skills sections."
                        },
                        { 
                          name: "Greenhouse", 
                          features: ["Semantic Matching", "Modern Analysis", "Flexible Parsing"],
                          desc: "Prioritizes experience relevance and quantification over strict layout rules. Rewards high-relevance projects."
                        }
                      ].map(platform => (
                        <div key={platform.name} className="p-8 bg-[#0c0c11] rounded-[2.5rem] border border-white/5 space-y-6">
                          <div className="text-white font-black text-2xl tracking-tighter italic">{platform.name}</div>
                          <div className="flex flex-wrap gap-2">
                             {platform.features.map(f => (
                               <span key={f} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[8px] font-black uppercase tracking-widest text-white/30">{f}</span>
                             ))}
                          </div>
                          <p className="text-white/40 text-xs leading-relaxed">{platform.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scoring Formula */}
                  <div className="p-12 bg-gradient-to-br from-[#6366f1]/10 via-transparent to-cyan-400/5 rounded-[3rem] border border-white/10 space-y-8 text-center">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-white tracking-tight italic">Weighted Scoring Formula</h3>
                      <p className="text-white/40 max-w-xl mx-auto text-sm">
                        Each platform score is calculated by applying custom weights to the parsed resume signals. Our global baseline ensures a rounded evaluation.
                      </p>
                    </div>
                    
                    <div className="py-6 px-6 md:px-10 bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/5 inline-flex flex-col md:flex-row items-center gap-2 md:gap-4 text-xs md:text-sm font-mono text-[#6366f1]">
                       <span className="text-white">Overall Score =</span>
                       <span className="text-white/40">Σ(Signal <span className="text-white/20">×</span> Weight)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                      {[
                        { label: "Formatting", weight: "15%" },
                        { label: "Keywords", weight: "25%" },
                        { label: "Sections", weight: "15%" },
                        { label: "Experience", weight: "20%" },
                        { label: "Education", weight: "10%" },
                        { label: "Quantification", weight: "15%" }
                      ].map(w => (
                        <div key={w.label} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                           <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/30 mb-1 leading-none">{w.label}</p>
                           <p className="text-base md:text-lg font-black text-white">{w.weight}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI + Deterministic */}
                  <div className="p-10 bg-white/[0.02] rounded-[3rem] border border-white/5 space-y-6">
                    <h4 className="text-xl font-bold text-white">AI + Deterministic Hybrid Engine</h4>
                    <p className="text-white/40 text-sm leading-relaxed">
                      ATSify combines <strong>deterministic scoring rules</strong> (for consistent baseline accuracy) with <strong>AI-assisted analysis</strong> powered by Gemini. The AI layer handles semantic pattern matching and generates platform-specific optimization tips. If the AI service is offline, our deterministic engine ensures results remain high-fidelity and immediate.
                    </p>
                  </div>

                  {/* Score Table */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-white tracking-tight">Score Interpretation</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                       <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                          <p className="text-emerald-400 font-bold mb-2">80–100</p>
                          <p className="text-xs text-emerald-400/60 uppercase font-black tracking-widest">Highly Optimized</p>
                       </div>
                       <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                          <p className="text-amber-500 font-bold mb-2">60–79</p>
                          <p className="text-xs text-amber-500/60 uppercase font-black tracking-widest">Solid (Needs Tweaks)</p>
                       </div>
                       <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
                          <p className="text-red-500 font-bold mb-2">Below 60</p>
                          <p className="text-xs text-red-500/60 uppercase font-black tracking-widest">Parsing Issues Likely</p>
                       </div>
                    </div>
                  </div>

                  {/* Limitations and Privacy */}
                  <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Limitations</h4>
                      <p className="text-xs text-white/40 leading-relaxed italic">
                        ATSify does not guarantee interview selection or exact replication of proprietary ATS algorithms. Real ATS behavior varies by employer configuration, recruiter settings, and custom knockout questions.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Privacy Note</h4>
                      <p className="text-xs text-white/40 leading-relaxed italic">
                        Your privacy is built-in. Resume parsing is designed with high data integrity. Text extraction and scoring are handled securely; you can also paste plain text to bypass file-based analysis.
                      </p>
                    </div>
                  </div>
                </div>
              }
            />
          ) : activeTab === 'privacy' ? (
            <StaticPage 
              title="Privacy Policy" 
              subtitle="Your data, your control. Privacy is part of how ATSify is designed." 
              icon={<ShieldCheck className="w-8 h-8" />}
              content={
                <div className="space-y-12 text-white/60">
                  <div className="p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 space-y-4">
                    <p className="text-sm leading-relaxed">
                      At ATSify, privacy is not an afterthought. It is part of how the product is designed. Resumes contain deeply personal information: your work history, education, contact details, skills, and career goals. We treat that information with care and only use it to provide resume analysis, ATS compatibility scoring, and saved insights when you choose to use those features.
                    </p>
                  </div>

                  <div className="space-y-8">
                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest text-glow-sm">1. Information We Collect</h3>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-white font-bold mb-2">Resume and Career Information</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-white/40 ml-4">
                            <li>Resume text, Work experience, and Education history</li>
                            <li>Skills, Projects, and Certifications</li>
                            <li>Contact information included in the document</li>
                            <li>Job description text you provide for matching</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-white font-bold mb-2">Account Information</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-white/40 ml-4">
                            <li>Name and Email address</li>
                            <li>Profile image from your sign-in provider</li>
                            <li>Unique authentication identifier</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">2. How We Use Your Information</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        We use your data to analyze formatting, extract sections, generate scores, and provide optimization tips. We do not use your resume data to sell advertising or provide personal information to recruiters without your consent.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">3. No Data Selling</h3>
                      <p className="text-sm text-[#10b981] font-bold leading-relaxed">
                        ATSify does not sell your personal information, resume data, job descriptions, or account information to third parties. Your resume is not a product.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">4. Processing & AI</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        Whenever possible, ATSify processes resumes directly in your browser. Some features require server-side processing and AI-assisted analysis via Gemini. When this happens, we only send the information strictly necessary for the task.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">5. Data Retention & Deletion</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        You stay in control. You can delete your analysis history or remove your account whenever you choose. We only keep data for as long as needed to provide the service and maintain security.
                      </p>
                    </section>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <p className="text-[10px] text-white/20 italic">For privacy questions or data deletion requests, contact: rudra.patel70@yahoo.com</p>
                  </div>
                </div>
              }
            />
          ) : activeTab === 'terms' ? (
            <StaticPage 
              title="Terms of Service" 
              subtitle="Clear and simple terms for using ATSify" 
              icon={<FileText className="w-8 h-8" />}
              content={
                <div className="space-y-12 text-white/60">
                  <div className="space-y-8">
                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest text-glow-sm">1. Service Overview</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        ATSify is a resume analysis and career optimization tool. We provide automated insights to help you understand how your resume may perform against Applicant Tracking Systems. ATSify is for informational guidance and is not a hiring agency or job placement platform.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">2. No Guarantee of Results</h3>
                      <p className="text-sm text-amber-400/80 font-bold leading-relaxed">
                        ATSify simulates common ATS patterns but cannot guarantee interviews, job offers, or exact replication of proprietary employer systems. Hiring decisions depend on many external factors outside our control.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">3. Your Responsibility</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        You are responsible for the content you upload. You must have the right to use it, and it must not be illegal or harmful. Resume suggestions are guidance—use your own professional judgment before applying them.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">4. Acceptable Use</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        You agree not to misuse ATSify, attempt to hack the system, scrape data, or use bots to disrupt the service. We reserve the right to restrict access for users who violate these terms.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">5. Disclaimer & Liability</h3>
                      <p className="text-sm text-white/40 leading-relaxed italic">
                        ATSify is provided "as is" without warranties of any kind. We are not liable for lost job opportunities or rejected applications resulting from your use of the service.
                      </p>
                    </section>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <p className="text-[10px] text-white/20">Last updated: May 3rd, 2026. Contact: rudra.patel70@yahoo.com</p>
                  </div>
                </div>
              }
            />
          ) : activeTab === 'contact' ? (
            <StaticPage 
              title="Contact Us" 
              subtitle="Get in touch with the team" 
              icon={<Linkedin className="w-8 h-8" />}
              content={
                <div className="space-y-8">
                  <p>Have questions, feedback, or a partnership inquiry? We'd love to hear from you.</p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <a href="mailto:rudra.patel70@yahoo.com" className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:border-[#6366f1]/40 transition-all group">
                      <p className="text-xs font-black uppercase tracking-widest text-[#6366f1] mb-2">Email Support</p>
                      <p className="text-white font-bold text-lg">rudra.patel70@yahoo.com</p>
                    </a>
                    <a href="https://www.linkedin.com/in/rudrap9" target="_blank" rel="noreferrer" className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:border-[#6366f1]/40 transition-all group">
                      <p className="text-xs font-black uppercase tracking-widest text-[#6366f1] mb-2">Connect</p>
                      <p className="text-white font-bold text-lg">LinkedIn Profile</p>
                    </a>
                  </div>
                </div>
              }
            />
          ) : (
            /* Protected Content Area */
            !user ? (
              <LandingSection 
                onGetStarted={() => setActiveTab('signin')} 
                onExploreMethodology={() => setActiveTab('methodology')}
              />
            ) : viewingScan ? (
              <ResultsSection scan={viewingScan} user={user} onBack={() => { setViewingScan(null); setActiveTab('scanner'); }} />
            ) : activeTab === 'scanner' ? (
              <ScannerSection onResults={(results, resumeText, jd, metadata) => {
                const scan = {
                  resumeText,
                  jobDescription: jd,
                  results,
                  metadata
                };
                saveScan(scan).then(saved => {
                  if (saved) setViewingScan({
                    ...saved,
                    createdAt: Date.now()
                  });
                });
              }} />
            ) : activeTab === 'history' ? (
              <HistorySection items={history} onView={setViewingScan} onDelete={deleteScan} />
            ) : (
              <LandingSection 
                onGetStarted={() => setActiveTab('scanner')} 
                onExploreMethodology={() => setActiveTab('methodology')}
              />
            )
          )}
        </main>

        <Footer onTabChange={(tab) => {
          setActiveTab(tab as any);
          setViewingScan(null);
        }} />
      </div>
    </div>
  );
}

// --- Sub-sections ---

function LandingSection({ onGetStarted, onExploreMethodology }: { onGetStarted: () => void, onExploreMethodology: () => void }) {
  const [typedTitle, setTypedTitle] = useState('');
  
  const phrases = [
    "Analyze your resume",
    "Optimize for ATS",
    "Get instant feedback",
    "Crack the Interview",
    "Tailor for any job"
  ];
  
  useEffect(() => {
    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    const type = () => {
      const currentPhrase = phrases[phraseIdx];
      
      if (isDeleting) {
        setTypedTitle(currentPhrase.slice(0, charIdx - 1));
        charIdx--;
        typingSpeed = 50;
      } else {
        setTypedTitle(currentPhrase.slice(0, charIdx + 1));
        charIdx++;
        typingSpeed = 100;
      }

      if (!isDeleting && charIdx === currentPhrase.length) {
        isDeleting = true;
        typingSpeed = 2000; // Pause at end
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        typingSpeed = 500; // Pause before next
      }

      setTimeout(type, typingSpeed);
    };

    const timeout = setTimeout(type, typingSpeed);
    return () => clearTimeout(timeout);
  }, []);

  const companies = [
    "Workday", "Taleo", "iCIMS", "Greenhouse", "Lever", 
    "SuccessFactors", "Jobvite", "SmartRecruiters", "BambooHR"
  ];

  return (
    <div className="space-y-40 py-10 relative overflow-hidden w-full max-w-[1800px] mx-auto">
      {/* Glossy Background Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
          x: [0, 50, 0],
          y: [0, -30, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 left-1/4 w-[280px] sm:w-[600px] h-[280px] sm:h-[600px] bg-cyan-500/10 blur-[80px] sm:blur-[120px] rounded-full -z-10" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.05, 0.15, 0.05],
          x: [0, -100, 0],
          y: [0, 60, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/4 right-1/4 w-[350px] sm:w-[800px] h-[350px] sm:h-[800px] bg-[#6366f1]/10 blur-[100px] sm:blur-[150px] rounded-full -z-10" 
      />

      <section className="text-center space-y-16 relative py-10 sm:py-20 min-h-[60vh] sm:min-h-[70vh] flex flex-col justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-8 sm:gap-10"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 text-amber-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md"
          >
            <div className="w-1.5 h-1.5 sm:w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Proprietary ATS Analysis Engine v4.0 Active
          </motion.div>
          
          <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
            <h1 className="text-[clamp(2.5rem,8vw,8.5rem)] font-black tracking-tighter text-white leading-[0.95] sm:leading-[0.85] text-glow break-words whitespace-normal px-2">
              Beat the ATS <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-[#6366f1] to-purple-400">
                Before It Beats You
              </span>
            </h1>
            
            {/* stabilized typing container to prevent jumping */}
            <div className="h-8 sm:h-10 flex items-center justify-center">
              <span className="text-sm sm:text-xl md:text-2xl font-mono text-cyan-400 tracking-widest uppercase font-bold">
                {typedTitle}<span className="animate-pulse inline-block w-1.5 sm:w-2 h-4 sm:h-6 bg-cyan-400 ml-1 align-middle"></span>
              </span>
            </div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-xl md:text-2xl text-white/40 max-w-3xl mx-auto font-medium leading-relaxed"
            >
              The industry's first enterprise-grade simulation environment. 
              Get high-fidelity feedback calibrated against the world's most aggressive filtering algorithms.
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 pt-6 w-full sm:w-auto px-4 sm:px-0"
          >
            <button
              onClick={onGetStarted}
              className="group relative bg-white text-[#050507] px-8 sm:px-14 py-4 sm:py-6 rounded-2xl font-black text-xs sm:text-sm tracking-widest uppercase transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] overflow-hidden hover:shadow-[0_0_50px_rgba(99,102,241,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#6366f1]/20 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <span className="relative flex items-center justify-center gap-3">
                Initialize Scan <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
            </button>
            <button
              onClick={onExploreMethodology}
              className="px-8 sm:px-14 py-4 sm:py-6 rounded-2xl font-black text-xs sm:text-sm tracking-widest uppercase text-white transition-all border border-white/10 hover:bg-white/5 hover:border-white/20 backdrop-blur-sm"
            >
              Protocol Details
            </button>
          </motion.div>
        </motion.div>

        {/* Company Marquee */}
        <div className="mt-24 w-full overflow-hidden relative py-10 bg-white/[0.01] border-y border-white/[0.03]">
          <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-[#050507] via-[#050507]/80 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#050507] via-[#050507]/80 to-transparent z-10" />
          
          <div className="flex whitespace-nowrap gap-12">
            <motion.div 
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="flex items-center gap-16 pr-16"
            >
              {[...companies, ...companies, ...companies].map((name, idx) => (
                <div key={idx} className="flex items-center gap-4 group cursor-default">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-sm text-white/40 group-hover:text-white group-hover:bg-[#6366f1]/20 transition-all duration-500 border border-white/5 group-hover:border-[#6366f1]/30">
                    {name[0]}
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-white/20 group-hover:text-white transition-all duration-500 uppercase italic">
                    {name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        id="how-it-works" 
        className="space-y-32 px-4 max-w-[1800px] mx-auto"
      >
        <div className="text-center space-y-8 px-4">
          <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter italic leading-tight">Strategic Analysis <span className="text-white/50">in 3 Steps</span></h2>
          <p className="text-white/40 font-medium text-base sm:text-lg md:text-2xl max-w-3xl mx-auto">Sophisticated AI intelligence. Simplified execution for the next-generation candidate.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12 px-4 sm:px-0">
          {[
            { step: '01', title: 'Upload Resume', desc: 'Securely upload your candidate file. Processing is performed locally to ensure data sovereignity and total privacy.', icon: Upload, color: 'text-cyan-400' },
            { step: '02', title: 'Platform Scan', desc: 'Simultaneous analysis against major platform architectures including Workday, Taleo, and Greenhouse scoring vectors.', icon: Search, color: 'text-[#6366f1]' },
            { step: '03', title: 'Get Scores', desc: 'Receive high-fidelity reports with itemized feedback on keywords, achievements, and impact statements.', icon: BarChart3, color: 'text-purple-400' }
          ].map((item, idx) => (
            <motion.div 
              key={item.step} 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="glass p-8 sm:p-10 lg:p-14 rounded-[2.5rem] sm:rounded-[3.5rem] space-y-6 sm:space-y-8 relative group border border-white/5 hover:border-[#6366f1]/20 transition-all bg-white/[0.01]"
            >
              <div className="absolute top-6 right-6 sm:top-10 sm:right-10 text-4xl sm:text-6xl md:text-8xl font-black text-white/30 group-hover:text-white/60 transition-colors italic">{item.step}</div>
              <div className={cn("w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/5 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-inner group-hover:scale-110 duration-700 transition-transform", item.color)}>
                <item.icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
              </div>
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight italic">{item.title}</h3>
                <p className="text-white/60 text-base sm:text-lg lg:text-xl font-medium leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center px-4 max-w-[1800px] mx-auto py-20">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-12"
        >
          <div className="space-y-6">
            <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter leading-tight">Optimization <span className="text-[#6366f1]">Reimagined.</span></h2>
            <p className="text-xl text-white/40 font-medium leading-relaxed">
              ATSify handles the technical parsing so you can focus on your career. We provide a transparent view into the silent gatekeepers of the hiring world.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Calibrated Vector Scores",
              "Semantic Keyword Sync",
              "Structure Recognition",
              "Profile Depth Analysis",
              "Action Verb Intensity",
              "Platform Quirk Detection"
            ].map((benefit, idx) => (
              <motion.div 
                key={benefit} 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-white/80 text-sm font-bold uppercase tracking-widest shadow-xl"
              >
                <div className="w-5 h-5 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#10b981]" />
                </div>
                {benefit}
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative group mt-10 lg:mt-0"
        >
          <div className="absolute -inset-10 bg-gradient-to-tr from-cyan-500/20 via-[#6366f1]/20 to-purple-500/20 blur-[100px] rounded-[5rem] group-hover:opacity-100 opacity-50 transition-opacity" />
          <div className="glass p-12 rounded-[4rem] border border-white/10 relative overflow-hidden backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-12">
              <div className="flex gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500/50" />
                <div className="w-4 h-4 rounded-full bg-yellow-500/50" />
                <div className="w-4 h-4 rounded-full bg-green-500/50" />
              </div>
              <div className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">INTELLIGENCE_METRICS</div>
            </div>
            
            <div className="space-y-10">
              <div className="space-y-3">
                <div className="h-6 w-3/4 bg-white/10 rounded-full animate-pulse" />
                <div className="h-6 w-1/2 bg-white/5 rounded-full animate-pulse delay-75" />
              </div>
              
              <div className="relative h-48 w-full bg-white/[0.02] rounded-[3rem] border border-white/5 flex items-center justify-center group-hover:border-[#6366f1]/30 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#6366f1]/5" />
                <div className="flex flex-col items-center">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-8xl font-black text-white tracking-tighter"
                  >
                    92<span className="text-3xl text-cyan-400">%</span>
                  </motion.div>
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-2">PLATFORM_RELEVANCE</div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {[40, 70, 50, 90].map((h, i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-2xl flex items-end p-1">
                    <motion.div 
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className="w-full bg-[#6366f1]/40 rounded-xl"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center space-y-12 sm:space-y-16 py-20 sm:py-32 relative bg-white/[0.01] rounded-[3rem] sm:rounded-[5rem] border border-white/5 mx-4 overflow-hidden"
      >
        <div className="space-y-6 px-4">
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter leading-[1.1] sm:leading-[0.9]">Get More Interviews <span className="text-glow">Faster</span></h2>
          <p className="text-base sm:text-xl text-white/60 font-medium max-w-2xl mx-auto">Use AI-powered tools to analyze, optimize, and strengthen your resume.</p>
        </div>
        <button
          onClick={onGetStarted}
          className="group relative isolate overflow-hidden bg-[#050507] text-white px-10 sm:px-16 py-6 sm:py-8 rounded-[2rem] sm:rounded-[2.5rem] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm transition-all shadow-[0_40px_80px_rgba(0,0,0,0.6)] active:scale-95"
        >
          {/* The animated gradient border layer */}
          <div className="animated-border animated-border-glow absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          {/* Inner masking background */}
          <div className="absolute inset-[4.5px] rounded-[1.8rem] sm:rounded-[2.3rem] bg-[#050507] z-0" />

          {/* Hover highlight overlay */}
          <div className="absolute inset-[4px] rounded-[1.8rem] sm:rounded-[2.3rem] bg-gradient-to-r from-cyan-400/5 via-[#6366f1]/5 to-purple-400/5 opacity-10 transition-opacity group-hover:opacity-100 z-0" />

          <span className="relative z-10 transition-colors group-hover:text-cyan-300">
            Analyze My Resume
          </span>
        </button>
      </motion.section>
    </div>
  );
}

function ResultsSection({ scan, user, onBack }: { scan: SavedScan, user: User | null, onBack: () => void }) {
  const avgScore = scan.results.length > 0 
    ? Math.round(scan.results.reduce((acc, r) => acc + r.overallScore, 0) / scan.results.length)
    : 0;
  const systemsPassed = scan.results.filter(r => r.passesFilter).length;
  const weakestResult = scan.results.slice().sort((a, b) => a.overallScore - b.overallScore)[0] || scan.results[0];

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  const getStatusText = (score: number, passesFilter: boolean) => {
    if (passesFilter && score >= 80) return 'STRONG PASS';
    if (passesFilter) return 'PASSES FILTER';
    if (score >= 50) return 'AT RISK';
    return 'NEEDS WORK';
  };

  const [isExporting, setIsExporting] = useState(false);
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);

  const toggleSystem = (system: string) => {
    setExpandedSystem(expandedSystem === system ? null : system);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generatePDF(user, scan);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-32 max-w-[1800px] mx-auto">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <button 
          onClick={onBack} 
          className="group flex items-center gap-3 px-6 py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl transition-all"
        >
          <ChevronRight className="w-5 h-5 rotate-180 text-[#6366f1]" /> 
          <span className="text-xs font-black uppercase tracking-widest text-white/60 group-hover:text-white">Return to Dashboard</span>
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 px-8 py-4 bg-[#6366f1] hover:bg-[#6366f1]/90 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-[#6366f1]/20 transition-all active:scale-95 disabled:opacity-50",
              isExporting && "animate-pulse"
            )}
          >
            {isExporting ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Processing PDF...' : 'Download Full Report'}
          </button>
        </div>
      </div>

      <div id="report-content" className="space-y-12">
        {/* 1. HERO SUMMARY CARD */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-[#6366f1]/20 to-purple-500/20 blur-3xl opacity-50 rounded-[3rem]" />
          <div className="relative bg-[#0a0a0f]/80 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-8 md:p-12 shadow-2xl overflow-hidden flex flex-col lg:flex-row items-center gap-12">
            
            {/* Score Ring */}
            <div className="relative flex-shrink-0">
               <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-[12px] border-white/5 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
                  <span className="text-7xl md:text-8xl font-black tracking-tighter" style={{ color: getScoreColor(avgScore) }}>{avgScore}</span>
                  <span className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase mt-2">Overall Score</span>
                  
                  {/* Gauge Progress */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle 
                      cx="50%" cy="50%" r="46%" 
                      fill="none" 
                      stroke={getScoreColor(avgScore)} 
                      strokeWidth="12" 
                      strokeDasharray="300%" 
                      strokeDashoffset={`${300 * (1 - avgScore / 100)}%`}
                      strokeLinecap="round"
                      className="opacity-20 translate-x-[1px] translate-y-[1px]"
                    />
                    <circle 
                      cx="50%" cy="50%" r="46%" 
                      fill="none" 
                      stroke={getScoreColor(avgScore)} 
                      strokeWidth="6" 
                      strokeDasharray="300%" 
                      strokeDashoffset={`${300 * (1 - avgScore / 100)}%`}
                      strokeLinecap="round"
                    />
                  </svg>
               </div>
            </div>

            {/* Content info */}
            <div className="flex-1 space-y-6 text-center lg:text-left w-full">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <span className="px-4 py-1.5 bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> Intelligence Report v4.0
                  </span>
                  <span className={cn(
                    "px-4 py-1.5 border rounded-full text-[10px] font-black uppercase tracking-widest",
                    avgScore >= 80 ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20" : 
                    avgScore >= 60 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                    "bg-red-500/10 text-red-500 border-red-500/20"
                  )}>
                    {avgScore >= 80 ? 'High Performance' : avgScore >= 60 ? 'Satisfactory' : 'Needs Optimization'}
                  </span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight italic">
                  {avgScore >= 80 
                    ? "Your resume is engineered for success." 
                    : avgScore >= 60 
                    ? "Ready for application, but could be stronger." 
                    : "Significant bottlenecks detected in your profile."}
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Systems Passed", value: `${systemsPassed}/${scan.results.length}`, icon: ShieldCheck, color: "text-[#6366f1]" },
                  { label: "Keywords Found", value: scan.results[0].breakdown.keywordMatch.matched.length, icon: Search, color: "text-cyan-400" },
                  { label: "Detected Skills", value: scan.metadata.skills.length, icon: Zap, color: "text-amber-400" },
                  { label: "Word Count", value: scan.metadata.wordCount, icon: FileText, color: "text-white/40" },
                ].map(stat => (
                  <div key={stat.label} className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-[1.5rem] flex flex-col gap-1 items-center lg:items-start group/stat hover:bg-white/[0.06] transition-all">
                    <stat.icon className={cn("w-5 h-5 mb-1", stat.color)} />
                    <span className="text-lg font-black text-white">{stat.value}</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2. PLATFORM GRIDS */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-4">
              <span className="h-px w-8 bg-white/10" /> Simulated ATS Performance <span className="h-px w-8 bg-white/10" />
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {scan.results.map(r => (
              <div key={r.system} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
                <div 
                  onClick={() => toggleSystem(r.system)}
                  className={cn(
                    "relative h-full bg-[#0c0c11]/60 backdrop-blur-xl border border-white/[0.08] hover:border-white/20 p-8 rounded-[2.5rem] transition-all flex flex-col gap-8 shadow-xl cursor-pointer",
                    expandedSystem === r.system && "border-[#6366f1]/40 bg-[#0c0c11]/90"
                  )}
                >
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-2xl font-black text-white tracking-tight">{r.system}</h4>
                        {r.passesFilter && <CheckCircle2 className="w-5 h-5 text-[#10b981]" />}
                      </div>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">{r.vendor} SYSTEMS</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black tracking-tight" style={{ color: getScoreColor(r.overallScore) }}>{r.overallScore}</span>
                      <span className="text-[8px] font-black text-white/20 uppercase">RANK</span>
                    </div>
                  </div>

                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-transparent to-white/20 animate-shine w-full" />
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${r.overallScore}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full rounded-full" 
                      style={{ backgroundColor: getScoreColor(r.overallScore) }} 
                    />
                  </div>

                  <div className="space-y-4">
                    {[
                      { l: 'Formatting', s: r.breakdown.formatting.score },
                      { l: 'Keywords', s: r.breakdown.keywordMatch.score },
                      { l: 'Sections', s: r.breakdown.sections.score },
                      { l: 'Experience', s: r.breakdown.experience.score },
                      { l: 'Education', s: r.breakdown.education.score }
                    ].map(bar => (
                      <div key={bar.l} className="space-y-1.5 focus-within:ring-0">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                          <span className="text-white/30">{bar.l}</span>
                          <span style={{ color: getScoreColor(bar.s) }}>{bar.s}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden relative">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${bar.s}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className="absolute top-0 left-0 h-full rounded-full transition-all" 
                              style={{ backgroundColor: getScoreColor(bar.s) }} 
                           />
                        </div>
                      </div>
                    ))}
                  </div>

                  <AnimatePresence>
                    {expandedSystem === r.system && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-6 overflow-hidden pt-4 border-t border-white/[0.05]"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Keyword Depth</span>
                            <div className="flex gap-1">
                              <span className="text-[10px] font-black text-[#10b981]">{r.breakdown.keywordMatch.matched.length} Matched</span>
                              <span className="text-[10px] font-black text-red-500">{r.breakdown.keywordMatch.missing.length} Missing</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                              {r.breakdown.keywordMatch.matched.slice(0, 15).map(kw => (
                                <span key={kw} className="px-2 py-1 bg-[#10b981]/5 border border-[#10b981]/20 rounded-md text-[9px] font-bold text-[#10b981] uppercase">
                                  {kw}
                                </span>
                              ))}
                            </div>
                            {r.breakdown.keywordMatch.missing.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {r.breakdown.keywordMatch.missing.slice(0, 10).map(kw => (
                                  <span key={kw} className="px-2 py-1 bg-red-500/5 border border-red-500/20 rounded-md text-[9px] font-bold text-red-500 uppercase">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Optimization Strategy</span>
                          <div className="space-y-2">
                             {r.suggestions.slice(0, 2).map((s, i) => (
                               <div key={i} className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                                  <p className="text-[10px] font-bold text-white/80 leading-tight">{s.summary}</p>
                               </div>
                             ))}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <p className="text-[9px] text-white/40 italic leading-relaxed">
                            {r.breakdown.formatting.issues[0] || "Parsing architecture confirmed safe for this vendor's engine."}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/[0.05]">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                       {expandedSystem === r.system ? 'Collapse Analysis' : 'Expand Details'}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform", expandedSystem === r.system && "rotate-180 text-[#6366f1]")} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. DETAILED BREAKDOWN PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
          
          {/* Priority Insights */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white flex items-center gap-3 italic">
                <AlertCircle className="w-6 h-6 text-[#ef4444]" />
                Primary Deficiencies
              </h3>
            </div>
            
            <div className="space-y-4">
              {[
                { t: 'Keyword Coverage', d: `Missing vital skills in ${weakestResult.system} profile`, s: weakestResult.breakdown.keywordMatch.score, icon: Search, details: "Your resume lacks the specific semantic phrasing required by modern ATS parsers to reach the human review stage." },
                { t: 'Experience Depth', d: `Quantifiable metrics: ${weakestResult.breakdown.experience.quantifiedBullets}`, s: weakestResult.breakdown.experience.score, icon: BarChart3, details: "The system detected low levels of quantified impact. ATS algorithms favor data-driven bullet points over generic descriptions." },
                { t: 'Parsing Fidelity', d: `Structural integrity in ${weakestResult.system}`, s: weakestResult.breakdown.formatting.score, icon: FileText, details: "Layout complexity score. High complexity increases the risk of data being misallocated into the wrong database fields." }
              ].map((item, idx) => (
                <div 
                  key={item.t}
                  className="bg-[#0c0c11]/80 border border-white/[0.05] p-6 rounded-[2rem] space-y-4 hover:border-white/20 transition-all cursor-default group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6 text-white/20 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-black text-white tracking-tight">{item.t}</h4>
                        <span className="text-sm font-black italic" style={{ color: getScoreColor(item.s) }}>{item.s}%</span>
                      </div>
                      <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{item.d}</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed pl-[4.25rem]">
                    {item.details}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Visualization */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-3 italic">
              <Sparkles className="w-6 h-6 text-[#6366f1]" />
              Skill Heatmap
            </h3>

            <div className="bg-[#0c0c11]/40 border border-white/[0.05] rounded-[2.5rem] p-8 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Contextual Keywords</span>
                  <span className="text-[10px] font-black text-white/40">{scan.results[0].breakdown.keywordMatch.matched.length + scan.results[0].breakdown.keywordMatch.missing.length} Total</span>
                </div>
                
                <div className="flex flex-wrap gap-2.5">
                   {scan.results[0].breakdown.keywordMatch.matched.map(kw => (
                     <div key={kw} className="group relative">
                        <div className="absolute -inset-1 bg-[#10b981]/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative px-4 py-2 bg-[#10b981]/5 border border-[#10b981]/20 rounded-xl text-[11px] font-bold text-[#10b981] uppercase tracking-wide">
                          {kw}
                        </div>
                     </div>
                   ))}
                   {scan.results[0].breakdown.keywordMatch.missing.map(kw => (
                     <div key={kw} className="group relative">
                        <div className="absolute -inset-1 bg-red-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative px-4 py-2 bg-red-500/5 border border-red-500/20 rounded-xl text-[11px] font-bold text-red-500/60 uppercase tracking-wide">
                          {kw}
                        </div>
                     </div>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/[0.05]">
                 <div className="space-y-4">
                   <h5 className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                     <Clock className="w-3.5 h-3.5" /> Temporal Consistency
                   </h5>
                   <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[1.5rem] flex items-center justify-between">
                      <span className="text-xs font-bold text-white/60">Gap Analysis</span>
                      <span className="text-xs font-black text-[#10b981] uppercase tracking-widest">Optimized</span>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <h5 className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                     <Building2 className="w-3.5 h-3.5" /> Industry Relevance
                   </h5>
                   <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[1.5rem] flex items-center justify-between">
                      <span className="text-xs font-bold text-white/60">Cluster Match</span>
                      <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">High Affinity</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. OPTIMIZATION PROTOCOL */}
        <section className="space-y-6 pt-8">
           <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black text-white tracking-tight">Optimization Protocol</h3>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scan.results[0].suggestions.slice(0, 6).map((s, idx) => (
                <div key={idx} className="relative group">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="relative bg-[#0c0c11]/80 border border-white/[0.08] hover:border-[#6366f1]/30 p-8 rounded-[2rem] transition-all space-y-4">
                      
                      <div className="flex justify-between items-start">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all",
                          s.impact === 'critical' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                          s.impact === 'high' ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                          "bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20"
                        )}>
                          {idx + 1}
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                          s.impact === 'critical' ? "text-red-500 border-red-500/20 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" :
                          s.impact === 'high' ? "text-orange-500 border-orange-500/20 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]" :
                          "text-[#6366f1] border-[#6366f1]/20 bg-[#6366f1]/5"
                        )}>{s.impact} Impact</span>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-lg font-black text-white leading-tight italic">{s.summary}</h4>
                        <ul className="space-y-2">
                          {s.details.slice(0, 2).map((detail, dIdx) => (
                            <li key={dIdx} className="text-xs text-white/40 leading-relaxed flex gap-2">
                              <span className="text-[#6366f1]">•</span> {detail}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 flex items-center gap-2">
                        <div className="flex -space-x-2">
                           {s.platforms.map(p => (
                             <div key={p} className="w-5 h-5 rounded-full bg-white/10 border border-black flex items-center justify-center text-[6px] font-black text-white/40 uppercase" title={p}>
                               {p[0]}
                             </div>
                           ))}
                        </div>
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Platform Specific</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </div>
    </div>
  );
}

function HistorySection({ items, onView, onDelete }: {
  items: SavedScan[],
  onView: (s: SavedScan) => void,
  onDelete: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-40 space-y-8 animate-fade-in">
        <div className="inline-flex p-10 bg-white/[0.02] rounded-[3rem] border border-white/[0.05] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <HistoryIcon className="w-16 h-16 text-white/10 group-hover:text-white/20 transition-all" />
        </div>
        <div className="space-y-3">
          <p className="text-2xl font-black text-white italic tracking-tight">Archives Offline</p>
          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em]">No previous analysis encrypted in database</p>
        </div>
        <button 
           onClick={() => window.location.reload()}
           className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          Refresh Feed
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-black text-white italic tracking-tighter">Analysis Logs</h2>
          <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.4em] mt-2">Historical performance benchmarks</p>
        </div>
        <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-white/40 uppercase tracking-[0.2em] backdrop-blur-md">
           {items.length} Intelligence Reports
        </div>
      </div>

      <div className="grid gap-6">
        {items.map((item, idx) => {
          const avgScore = Math.round(item.results.reduce((acc, r) => acc + r.overallScore, 0) / (item.results.length || 1));
          const getScoreColor = (score: number) => {
            if (score >= 80) return 'text-[#10b981]';
            if (score >= 60) return 'text-amber-500';
            return 'text-red-500';
          };

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#6366f1]/20 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
              <div className="relative bg-[#0c0c11]/60 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
                <div className="flex items-center gap-8 w-full md:w-auto">
                  <div className={cn(
                    "w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center font-black text-3xl bg-white/[0.03] border border-white/10 relative overflow-hidden group-hover:scale-105 transition-transform", 
                    getScoreColor(avgScore)
                  )}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent" />
                    {avgScore}
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">RANK</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-white font-black text-2xl tracking-tight italic">
                        Report {item.id.substring(0, 4).toUpperCase()}
                      </h3>
                      {item.jobDescription && (
                        <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-cyan-500/20">
                          JD_ALIGNED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-white/30 text-[10px] font-black uppercase tracking-widest">
                       <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {formatDate(item.createdAt)}</span>
                       <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> {item.metadata.wordCount} Words</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <button
                    onClick={() => onView(item)}
                    className="flex-1 md:flex-none px-10 py-4 rounded-xl bg-white/[0.04] text-white/60 font-black text-[10px] uppercase tracking-widest hover:bg-[#6366f1] hover:text-white transition-all border border-white/5 active:scale-95"
                  >
                    Launch Analysis
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-4 rounded-xl bg-red-500/5 text-red-500/20 hover:bg-red-500 hover:text-white transition-all border border-red-500/10 active:scale-95 group/del"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
