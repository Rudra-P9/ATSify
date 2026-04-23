/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { parseFile } from './lib/parser';
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
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
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
  const [activeTab, setActiveTab] = useState<'scanner' | 'history' | 'settings'>('scanner');
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [viewingScan, setViewingScan] = useState<SavedScan | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const saveScan = async (scan: Omit<SavedScan, 'id'>) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'scans'), {
        ...scan,
        userId: user.uid
      });
      const newScan = { ...scan, id: docRef.id };
      setHistory(prev => [newScan, ...prev]);
      return newScan;
    } catch (error) {
      console.error("Error saving scan:", error);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#050507]">
      {/* Sidebar for authenticated users */}
      {user && !loading && (
        <aside className="w-64 bg-[#0c0c0f] sidebar-border flex flex-col p-6 h-screen sticky top-0 hidden md:flex shrink-0">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-6 h-6 bg-[#6366f1] rounded shadow-[0_0_10px_rgba(99,102,241,0.3)]"></div>
            <span className="text-lg font-bold tracking-tighter text-white">ATS.SCREENER</span>
          </div>

          <nav className="space-y-1 flex-1">
            <button
              onClick={() => { setActiveTab('scanner'); setViewingScan(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                activeTab === 'scanner' && !viewingScan ? "bg-[#6366f1]/10 text-[#6366f1]" : "text-white/40 hover:text-white/70"
              )}
            >
              <Search className="w-4 h-4" />
              Scanner
            </button>
            <button
              onClick={() => { setActiveTab('history'); setViewingScan(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                activeTab === 'history' && !viewingScan ? "bg-[#6366f1]/10 text-[#6366f1]" : "text-white/40 hover:text-white/70"
              )}
            >
              <HistoryIcon className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => { setActiveTab('settings'); setViewingScan(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                activeTab === 'settings' && !viewingScan ? "bg-[#6366f1]/10 text-[#6366f1]" : "text-white/40 hover:text-white/70"
              )}
            >
              <UserIcon className="w-4 h-4" />
              Settings
            </button>
          </nav>

          <div className="mt-auto p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
            <div className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">Account Status</div>
            <p className="text-xs text-white/60">Tier: <strong className="text-[#6366f1]">Free</strong></p>
            <p className="text-xs text-white/60">Credits: <strong>Unlimited</strong></p>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="w-full px-8 py-6 flex items-center justify-between border-b border-white/[0.05] bg-[#050507]/80 backdrop-blur-sm sticky top-0 z-50">
          {user ? (
            <>
              <div>
                <h1 className="text-lg font-bold text-white px-2">
                  {activeTab === 'settings' ? "Profile Controls" : viewingScan ? "Analysis Dashboard" : "Resume Intelligence"}
                </h1>
                <p className="text-xs text-white/30 px-2 uppercase tracking-widest font-bold">
                  {activeTab === 'settings' ? "Manage your experience" : viewingScan ? "Individual Report" : "Select a document to begin"}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden lg:flex px-3 py-1.5 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full text-[10px] font-black text-[#10b981] leading-none mb-0 items-center gap-1.5 uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" /> 🛡️ Local Processing Only
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-white leading-none">{user.displayName || user.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-white/30 font-bold uppercase mt-1">Beta User</p>
                  </div>
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="w-9 h-9 rounded-full border border-white/10" alt="User" />
                  <button onClick={() => auth.signOut()} className="text-white/20 hover:text-white transition-all ml-2">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-between items-center max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-[#6366f1] rounded"></div>
                <span className="text-lg font-bold tracking-tighter text-white">ATS.SCREENER</span>
              </div>
              <button 
                onClick={signInWithGoogle}
                className="bg-[#6366f1] hover:bg-[#6366f1]/90 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#6366f1]/20 active:scale-95"
              >
                Get Started
              </button>
            </div>
          )}
        </header>

        <main className="w-full flex-1 px-8 py-10 max-w-7xl mx-auto">
          {!user ? (
            <LandingSection onGetStarted={signInWithGoogle} />
          ) : viewingScan ? (
            <ResultsSection scan={viewingScan} onBack={() => { setViewingScan(null); setActiveTab('scanner'); }} />
          ) : activeTab === 'scanner' ? (
            <ScannerSection onResults={(results, resumeText, jd, metadata) => {
              const scan = {
                resumeText,
                jobDescription: jd,
                results,
                metadata,
                createdAt: serverTimestamp()
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
            <SettingsSection user={user} />
          )}
        </main>

        <footer className="w-full py-10 px-8 text-white/20 text-[10px] uppercase font-bold tracking-widest border-t border-white/[0.03] text-center">
            &copy; 2026 ATS.SCREENER &bull; Private Browser-Native Engine
        </footer>
      </div>
    </div>
  );
}

// --- Sub-sections ---

function LandingSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="space-y-32 py-10 animate-fade-in relative">
      <section className="text-center space-y-8 relative py-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6366f1]/5 blur-[120px] rounded-full -z-10" />
        <div className="inline-flex px-3 py-1 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#6366f1]/20">
          Built for modern job seekers
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.85]">
          Beat the ATS <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-blue-400">Before It Beats You.</span>
        </h1>
        <p className="text-xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed">
          Get an instant ATS score and actionable feedback on your resume. Simulate the algorithms of Workday, Taleo, and Greenhouse in seconds.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <button 
            onClick={onGetStarted}
            className="bg-[#6366f1] text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#6366f1]/90 transition-all active:scale-95 shadow-xl shadow-[#6366f1]/20"
          >
            Upload Resume Now <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-5 rounded-2xl font-bold text-white transition-all border border-white/10 hover:bg-white/5"
          >
            Explore Methodology
          </button>
        </div>
        <div className="pt-10 flex items-center justify-center gap-2 text-white/20 text-[10px] font-black uppercase tracking-widest">
          <CheckCircle2 className="w-3.5 h-3.5" /> Used by 5,000+ job seekers worldwide
        </div>
      </section>

      <section id="how-it-works" className="space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-white tracking-tighter">Strategic Analysis in 3 Steps</h2>
          <p className="text-white/30 font-medium">Simple, fast, and completely private.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Upload Resume', desc: 'Securely upload your PDF or DOCX file. Processing is 100% local in your browser.', icon: Upload },
            { step: '02', title: 'Platform Scan', desc: 'We analyze your content against 6 proprietary platform weights and scoring vectors.', icon: Search },
            { step: '03', title: 'Get Scores', desc: 'Receive immediate feedback on formatting, keywords, and quantified achievements.', icon: BarChart3 }
          ].map(item => (
            <div key={item.step} className="glass p-10 rounded-[2.5rem] space-y-6 relative group border-white/5 hover:border-[#6366f1]/20 transition-all">
              <div className="absolute top-6 right-8 text-4xl font-black text-white/5 group-hover:text-[#6366f1]/10 transition-colors uppercase">{item.step}</div>
              <div className="w-14 h-14 bg-[#6366f1]/10 rounded-2xl flex items-center justify-center">
                <item.icon className="w-7 h-7 text-[#6366f1]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-white tracking-tighter">Optimization for the Results You Want.</h2>
            <p className="text-lg text-white/40 font-medium leading-relaxed">
              We don't just give you a score. We give you a roadmap to passing the initial screen every time.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "ATS Score (0–100)",
              "Keyword Density Tips",
              "Formatting Fixes",
              "Profile Depth Sync",
              "Quantification Signals",
              "Platform Quirk Detection"
            ].map(benefit => (
              <div key={benefit} className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white/70 text-sm font-medium">
                <Check className="w-4 h-4 text-[#10b981]" /> {benefit}
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-[#6366f1]/20 to-transparent blur-2xl rounded-[3rem]" />
          <div className="glass p-8 rounded-[3rem] border-white/10 relative overflow-hidden">
             <div className="flex items-center justify-between mb-8">
               <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-400" />
                  <div className="w-8 h-8 rounded-full bg-yellow-400" />
                  <div className="w-8 h-8 rounded-full bg-green-400" />
               </div>
               <div className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none">Intelligence.Report</div>
             </div>
             <div className="space-y-6">
                <div className="h-6 w-3/4 bg-white/10 rounded-xl" />
                <div className="h-24 w-full bg-[#6366f1]/10 rounded-[2rem] border border-[#6366f1]/20 flex items-center justify-center">
                   <div className="text-4xl font-black text-white">84%</div>
                </div>
                <div className="space-y-3">
                   <div className="h-2 w-full bg-white/5 rounded-full" />
                   <div className="h-2 w-2/3 bg-white/5 rounded-full" />
                </div>
             </div>
          </div>
        </div>
      </section>

      <section className="text-center space-y-10 py-20 relative">
         <div className="space-y-4">
            <h2 className="text-5xl font-black text-white tracking-tighter">Ready to land that interview?</h2>
            <p className="text-lg text-white/40 font-medium">Join thousands of job seekers who outsmarted the machines.</p>
         </div>
         <button 
           onClick={onGetStarted}
           className="bg-white text-black px-12 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm hover:scale-105 transition-all shadow-2xl shadow-white/5"
         >
           Upload Your Resume
         </button>
      </section>
    </div>
  );
}

function ScannerSection({ onResults }: { onResults: (results: ATSResult[], resume: string, jd: string, metadata: ResumeMetadata) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleScan = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setError('');
    setIsScanning(true);
    setProgress(5);

    try {
      setProgress(25);
      const text = await parseFile(file);
      setProgress(50);
      const response = await analyzeResume(text, jobDescription);
      setProgress(90);
      setTimeout(() => {
        onResults(response.results, text, jobDescription, response.metadata);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Engine error. Please try again.");
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
      <div className="space-y-4">
        <div className="inline-flex px-3 py-1 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#6366f1]/20">
          Document Intelligence Engine
        </div>
        <h2 className="text-5xl font-black text-white tracking-tighter">
          Scan Your Resume Against <br />
          <span className="text-[#6366f1]">Real ATS Systems</span>
        </h2>
        <p className="text-white/30 text-lg font-medium">
          Upload your resume and optionally paste a job description. Files are parsed client-side.
        </p>
      </div>

      {isScanning ? (
        <div className="glass p-16 rounded-[2.5rem] flex flex-col items-center justify-center space-y-10 border-[#6366f1]/20 shadow-2xl shadow-[#6366f1]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 bg-[#6366f1] transition-all duration-500" style={{ width: `${progress}%` }} />
          <div className="relative">
            <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center">
              <FileText className="w-10 h-10 text-[#6366f1] animate-pulse" />
            </div>
            <div className="absolute -inset-2 border border-[#6366f1]/20 rounded-full animate-spin-slow" />
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-black text-white">Analyzing across 6 ATS platforms</h3>
            <p className="text-[#6366f1] font-bold text-sm tracking-widest uppercase">
              {progress < 30 ? 'Extracting Text...' : progress < 60 ? 'Analyzing keywords...' : 'Simulating platform logic...'}
            </p>
          </div>
          <div className="flex gap-3">
            {['WORKDAY', 'TALEO', 'ICIMS', 'GREENHOUSE', 'LEVER', 'S.FACTORS'].map((platform, idx) => (
              <div 
                key={platform} 
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest border transition-all duration-500",
                  progress > (idx + 1) * 15 ? "bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]" : "bg-white/5 border-white/5 text-white/20"
                )}
              >
                {platform}
              </div>
            ))}
          </div>
          <div className="text-white/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-3 h-3" /> Processing internally
          </div>
        </div>
      ) : (
        <div className="grid gap-8">
          <div 
            className={cn(
              "p-12 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-all group relative overflow-hidden",
              file ? "bg-[#6366f1]/5 border-[#6366f1]/40" : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
            )}
            onClick={() => document.getElementById('resume-upload')?.click()}
          >
            <input 
              type="file" 
              id="resume-upload" 
              className="hidden" 
              accept=".pdf,.docx" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
            />
            {file ? (
               <div className="flex items-center gap-4 p-6 bg-white/[0.05] rounded-3xl border border-[#10b981]/20">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-[#10b981]" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-white">{file.name}</p>
                    <p className="text-white/20 text-xs font-bold uppercase tracking-widest">{(file.size / 1024).toFixed(0)} KB &bull; Verified</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-[#10b981] ml-4" />
               </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-white/20 group-hover:text-[#6366f1] transition-colors" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-bold text-white">Select Resume File</p>
                  <p className="text-white/30 text-sm font-bold uppercase tracking-widest">PDF & DOCX ONLY &bull; 100% PRIVATE</p>
                </div>
              </>
            )}
          </div>
          <div className="space-y-4">
            <textarea 
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste requirements to sync skills..."
              className="w-full h-40 bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-sm text-white focus:ring-2 focus:ring-[#6366f1]/40 focus:outline-none transition-all resize-none font-medium placeholder:text-white/10"
            />
          </div>
          {error && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold">
              <AlertCircle className="w-5 h-5" /> {error}
            </motion.div>
          )}
          <button 
            onClick={handleScan}
            disabled={isScanning || !file}
            className={cn(
              "w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden",
              "bg-[#6366f1] text-white shadow-2xl shadow-[#6366f1]/20 hover:brightness-110"
            )}
          >
            Launch System Simulation
          </button>
        </div>
      )}
    </div>
  );
}

function ResultsSection({ scan, onBack }: { scan: SavedScan, onBack: () => void }) {
  const avgScore = Math.round(scan.results.reduce((acc, r) => acc + r.overallScore, 0) / 6);
  const systemsPassed = scan.results.filter(r => r.passesFilter).length;
  const weakestResult = scan.results.slice().sort((a,b) => a.overallScore - b.overallScore)[0] || scan.results[0];
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  const getStatusText = (score: number) => {
    if (score >= 80) return 'LIKELY TO PASS';
    if (score >= 60) return 'MAY BE FILTERED';
    return 'NEEDS WORK';
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    setIsExporting(true);
    try {
      const imgData = await toPng(element, {
        backgroundColor: '#050507',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ATS_Screener_Report_${formatDate(scan.createdAt).replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-32">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/40 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Intelligence Dashboard
        </button>
        <button 
          onClick={handleExportPDF}
          disabled={isExporting}
          className={cn(
            "flex items-center gap-2 px-4 py-2 bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#6366f1] hover:bg-[#6366f1]/20 transition-all disabled:opacity-50",
            isExporting && "animate-pulse"
          )}
        >
          {isExporting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {isExporting ? 'Generating...' : 'Export PDF Report'}
        </button>
      </div>

      <div id="report-content" className="space-y-8">
         {/* 1. TOP SUMMARY HEADER */}
         <div className="w-full bg-gradient-to-br from-[#0c0c11] to-[#12121a] rounded-[2rem] border border-white/5 p-8 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-6 relative z-10">
               <div className="text-8xl font-black leading-none" style={{ color: getScoreColor(avgScore) }}>{avgScore}</div>
               <div className="space-y-1">
                 <div className="text-xl font-bold tracking-widest uppercase" style={{ color: getScoreColor(avgScore) }}>
                    {avgScore >= 80 ? 'Excellent' : avgScore >= 60 ? 'Good' : 'Weak'}
                 </div>
                 <div className="text-[10px] text-white/40 font-black tracking-widest uppercase">AVERAGE SCORE</div>
               </div>
            </div>
            
            <div className="flex-1 w-full bg-white/[0.02] p-4 rounded-2xl flex items-center justify-between gap-2 border border-white/[0.05]">
               {scan.results.map(r => (
                  <div key={r.system} className="flex-1 flex flex-col gap-1 items-center">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{r.system.substring(0,6)}</span>
                    <div className="w-full h-[6px] bg-white/10 rounded-full overflow-hidden flex items-end">
                      <div className="h-full rounded-full transition-all" style={{ width: `${r.overallScore}%`, backgroundColor: getScoreColor(r.overallScore) }} />
                    </div>
                  </div>
               ))}
            </div>

            <div className="flex flex-col items-end gap-3 relative z-10 shrink-0">
               <div className="text-xl font-black text-white px-2">{systemsPassed}/6 Systems Passed</div>
               <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white uppercase tracking-widest">
                  [ General Readiness ]
               </div>
            </div>
         </div>

         {/* 2. PLATFORM CARDS GRID */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {scan.results.map(r => (
             <div key={r.system} className="glass bg-[#08080b] p-6 rounded-[2rem] border border-white/5 hover:border-[#6366f1]/20 transition-all flex flex-col gap-6">
                <div className="flex justify-between items-start">
                   <div>
                     <h4 className="text-xl font-black text-white">{r.system}</h4>
                     <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">{r.vendor} INC.</p>
                   </div>
                   <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black border-2 border-white/5 relative">
                      <span style={{ color: getScoreColor(r.overallScore) }}>{r.overallScore}</span>
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/5" />
                        <circle cx="22" cy="22" r="20" fill="none" stroke={getScoreColor(r.overallScore)} strokeWidth="2" strokeDasharray={125} strokeDashoffset={125 * (1 - r.overallScore/100)} strokeLinecap="round" />
                      </svg>
                   </div>
                </div>
                
                <div className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg self-start border", 
                  r.overallScore >= 80 ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20" : 
                  r.overallScore >= 60 ? "bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20" : 
                  "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20"
                )}>
                   {getStatusText(r.overallScore)}
                </div>

                <div className="space-y-3">
                   {[
                     { l: 'Formatting', s: r.breakdown.formatting.score },
                     { l: 'Keywords', s: r.breakdown.keywordMatch.score },
                     { l: 'Sections', s: r.breakdown.sections.score },
                     { l: 'Experience', s: r.breakdown.experience.score },
                     { l: 'Education', s: r.breakdown.education.score }
                   ].map(bar => (
                     <div key={bar.l} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-white/40 uppercase w-20">{bar.l}</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full rounded-full" style={{ width: `${bar.s}%`, backgroundColor: getScoreColor(bar.s) }} />
                        </div>
                        <span className="text-[10px] font-black text-white/80 w-6 text-right">{bar.s}</span>
                     </div>
                   ))}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                   <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                     <span className="text-[#10b981]">{r.breakdown.keywordMatch.matched.length}</span> MATCHED
                   </div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                     <span className="text-[#ef4444]">{r.breakdown.keywordMatch.missing.length}</span> MISSING
                   </div>
                </div>
             </div>
           ))}
         </div>

         {/* 3 & 4. SIDE BY SIDE PANELS */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* 3. PRIORITY FOCUS AREAS (LEFT) */}
            <div className="lg:col-span-5 glass p-8 rounded-[2.5rem] border-white/5 space-y-6 flex flex-col">
               <div className="space-y-1">
                 <h3 className="text-xl font-black text-white flex items-center gap-2">
                   <AlertCircle className="w-5 h-5 text-[#ef4444]" /> Priority Focus Areas
                 </h3>
                 <div className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                   Filtered out by: <span className="bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded border border-[#ef4444]/30">{weakestResult.system}</span>
                 </div>
               </div>

               <div className="space-y-4 flex-1">
                 {[
                   { t: 'Keyword Coverage', d: `Missing: ${weakestResult.breakdown.keywordMatch.missing.slice(0, 3).join(', ') || 'N/A'}`, s: weakestResult.breakdown.keywordMatch.score, b: 60 },
                   { t: 'Experience Quality', d: `Action verbs: ${weakestResult.breakdown.experience.actionVerbCount} / Quantified: ${weakestResult.breakdown.experience.quantifiedBullets}`, s: weakestResult.breakdown.experience.score, b: 70 },
                   { t: 'Formatting & Parsing', d: `Issues: ${weakestResult.breakdown.formatting.issues[0] || 'Clean'}`, s: weakestResult.breakdown.formatting.score, b: 80 },
                   { t: 'Section Structure', d: `Missing: ${weakestResult.breakdown.sections.missing.join(', ') || 'None'}`, s: weakestResult.breakdown.sections.score, b: 100 },
                   { t: 'Education', d: `Check: ${weakestResult.breakdown.education.notes[0] || 'Valid'}`, s: weakestResult.breakdown.education.score, b: 50 },
                 ].map((focus, idx) => (
                   <div key={focus.t} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4 group hover:bg-white/[0.05] transition-all">
                      <div className="w-6 h-6 rounded-full bg-white/10 text-white/50 flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</div>
                      <div className="flex-1 overflow-hidden space-y-2">
                        <div className="flex justify-between text-xs font-bold text-white">
                           {focus.t} <span className="text-white/60">{focus.s}</span>
                        </div>
                        <p className="text-[10px] text-white/40 truncate uppercase tracking-widest font-bold">{focus.d}</p>
                        <div className="w-full h-1 bg-white/5 rounded-full relative overflow-hidden">
                           <div className="h-full rounded-full transition-all" style={{ width: `${focus.s}%`, backgroundColor: getScoreColor(focus.s) }} />
                           <div className="absolute top-0 bottom-0 w-0.5 bg-white/80" style={{ left: `${focus.b}%` }} title={`${weakestResult.system} baseline: ${focus.b}`} />
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* 4. RESUME OVERVIEW (RIGHT) */}
            <div className="lg:col-span-7 glass p-8 rounded-[2.5rem] border-white/5 space-y-8 flex flex-col">
               <h3 className="text-xl font-black text-white flex items-center gap-2">
                 <FileText className="w-5 h-5 text-[#6366f1]" /> Resume Overview
               </h3>
               
               <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: 'Words', v: scan.metadata.wordCount },
                    { l: 'Page', v: 1 },
                    { l: 'Sections', v: scan.metadata.sections.length },
                    { l: 'Skills', v: scan.metadata.skills.length },
                    { l: 'Positions', v: scan.metadata.positions },
                    { l: 'Education', v: scan.metadata.education.length }
                  ].map(stat => (
                    <div key={stat.l} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-center flex items-center justify-center gap-2">
                       <span className="text-xl font-black text-white">{stat.v}</span>
                       <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{stat.l}</span>
                    </div>
                  ))}
               </div>

               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Detected Sections</h4>
                  <div className="flex flex-wrap gap-2">
                    {scan.metadata.sections.map(s => (
                       <span key={s} className="px-3 py-1 bg-[#10b981]/10 text-[#10b981] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#10b981]/20">
                          {s}
                       </span>
                    ))}
                  </div>
               </div>

               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Extracted Skills</h4>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                    {scan.metadata.skills.map(skill => (
                       <span key={skill} className="px-3 py-1 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10">
                          {skill}
                       </span>
                    ))}
                  </div>
               </div>

               <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-1 space-y-2 text-sm text-white/60 font-medium bg-white/[0.01] p-4 rounded-2xl border border-white/5">
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Contact Info</h4>
                    <p className="flex items-center gap-2 truncate"><UserIcon className="w-4 h-4 text-white/30" /> Candidate</p>
                    {scan.metadata.contactInfo.email && <p className="flex items-center gap-2 truncate"><Globe className="w-4 h-4 text-white/30" /> {scan.metadata.contactInfo.email}</p>}
                    {scan.metadata.contactInfo.phone && <p className="flex items-center gap-2 truncate"><ShieldCheck className="w-4 h-4 text-white/30" /> {scan.metadata.contactInfo.phone}</p>}
                    {scan.metadata.contactInfo.linkedin && <p className="flex items-center gap-2 truncate"><Building2 className="w-4 h-4 text-white/30" /> {scan.metadata.contactInfo.linkedin}</p>}
                 </div>
                 <div className="flex-1 space-y-2 bg-white/[0.01] p-4 rounded-2xl border border-white/5 flex flex-col justify-end">
                    {Object.entries(scan.metadata.checkmarks).map(([k, v]) => (
                      <p key={k} className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
                         {v ? <CheckCircle2 className="w-4 h-4 text-[#10b981]" /> : <XCircle className="w-4 h-4 text-white/20" />}
                         {k.replace(/([A-Z])/g, ' $1')}
                      </p>
                    ))}
                 </div>
               </div>
            </div>
         </div>

         {/* 5. KEYWORD ANALYSIS */}
         <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-white/40" /> Keyword Analysis — <span className="text-[#6366f1]">{scan.results[0].breakdown.keywordMatch.score}% Match Rate</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#10b981] uppercase tracking-widest">Matched Keywords</h4>
                 <div className="flex flex-wrap gap-2">
                   {scan.results[0].breakdown.keywordMatch.matched.map(kw => (
                     <span key={kw} className="px-3 py-1.5 bg-[#10b981]/10 text-[#10b981] text-[10px] font-black uppercase tracking-widest rounded-lg border border-[#10b981]/20">
                       {kw}
                     </span>
                   ))}
                 </div>
               </div>
               <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#ef4444] uppercase tracking-widest">Missing Keywords</h4>
                 <div className="flex flex-wrap gap-2">
                   {scan.results[0].breakdown.keywordMatch.missing.map(kw => (
                     <span key={kw} className="px-3 py-1.5 bg-[#ef4444]/10 text-[#ef4444] text-[10px] font-black uppercase tracking-widest rounded-lg border border-[#ef4444]/20">
                       {kw}
                     </span>
                   ))}
                 </div>
               </div>
            </div>
         </div>

         {/* 6. OPTIMIZATION SUGGESTIONS */}
         <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" /> Optimization Suggestions
            </h3>
            <div className="space-y-4">
               {scan.results[0].suggestions.map((s, idx) => (
                 <div key={idx} className="bg-[#050507] p-5 rounded-2xl border border-white/5 flex gap-4 items-center">
                    <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0 text-white/50 text-xs font-black">
                       {idx + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                       <p className="text-sm font-bold text-white">{s.text}</p>
                       <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Platforms: {s.platforms.join(', ')}</p>
                    </div>
                    <div className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border",
                      s.priority === 'HIGH' ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20" :
                      s.priority === 'MEDIUM' ? "bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20" :
                      "bg-white/5 text-white/40 border-white/10"
                    )}>
                       {s.priority} PRIORITY
                    </div>
                 </div>
               ))}
            </div>
         </div>
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
      <div className="text-center py-32 space-y-6">
        <div className="inline-flex p-6 bg-white/[0.02] rounded-[2rem] border border-white/[0.05]">
          <HistoryIcon className="w-10 h-10 text-white/10" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-white">Archives Empty</p>
          <p className="text-sm text-white/20 font-bold uppercase tracking-widest">No previous analysis found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Scan Records</h2>
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-1">Archived performance metrics</p>
        </div>
        <div className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">{items.length} Reports</div>
      </div>

      <div className="grid gap-4">
        {items.map(item => {
          const avgScore = Math.round(item.results.reduce((acc, r) => acc + r.overallScore, 0) / 6);
          const getScoreColor = (score: number) => {
            if (score >= 80) return 'text-[#10b981]';
            if (score >= 60) return 'text-[#f59e0b]';
            return 'text-[#ef4444]';
          };

          return (
            <div 
              key={item.id}
              className="glass p-6 rounded-2xl flex items-center justify-between group hover:border-[#6366f1]/30 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl bg-white/[0.02] border border-white/5", getScoreColor(avgScore))}>
                  {avgScore}
                </div>
                <div>
                  <h3 className="text-white font-black text-lg flex items-center gap-3">
                    Analysis Report
                    {item.jobDescription && <span className="px-2.5 py-1 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase tracking-widest rounded-lg border border-[#6366f1]/10">JD Sync</span>}
                  </h3>
                  <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.2em] mt-1">{formatDate(item.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                   onClick={() => onView(item)}
                   className="px-6 py-3 rounded-xl bg-white/[0.03] text-white/40 font-bold text-xs uppercase tracking-widest hover:bg-[#6366f1] hover:text-white transition-all border border-white/5"
                >
                  View Details
                </button>
                <button 
                  onClick={() => onDelete(item.id)}
                  className="p-3 rounded-xl bg-red-500/5 text-red-500/20 hover:bg-red-500 hover:text-white transition-all border border-red-500/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsSection({ user }: { user: User | null }) {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
       <div className="space-y-4">
        <div className="inline-flex px-3 py-1 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#6366f1]/20">
          Personal Preferences
        </div>
        <h2 className="text-5xl font-black text-white tracking-tighter">Your Profile & <span className="text-[#6366f1]">Control Center</span></h2>
        <p className="text-white/30 text-lg font-medium">Manage your session, archives, and system preferences.</p>
      </div>

      <div className="grid gap-6">
         <div className="glass p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
               <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} className="w-20 h-20 rounded-[2rem] border border-white/10" alt="User" />
               <div>
                  <h3 className="text-xl font-bold text-white">{user?.displayName || user?.email?.split('@')[0]}</h3>
                  <p className="text-white/30 text-sm">{user?.email}</p>
                  <div className="flex gap-2 mt-3 justify-center md:justify-start">
                     <span className="px-2 py-0.5 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase rounded text-xs tracking-widest">Active Member</span>
                     <span className="px-2 py-0.5 bg-white/5 text-white/30 text-[10px] font-black uppercase rounded text-xs tracking-widest">Free Tier</span>
                  </div>
               </div>
            </div>
            <button onClick={() => auth.signOut()} className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all whitespace-nowrap">
               Sign Out
            </button>
         </div>

         <div className="grid md:grid-cols-2 gap-6">
            <div className="glass p-8 rounded-[2.5rem] space-y-4">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#6366f1]" />
               </div>
               <h4 className="text-lg font-bold text-white">Security & Privacy</h4>
               <p className="text-white/40 text-sm leading-relaxed">All processing is done locally. Your resumes are never stored on our cloud servers without your explicit permission.</p>
               <button className="text-[#6366f1] text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                  Read Privacy Manifesto <ArrowRight className="w-4 h-4" />
               </button>
            </div>

            <div className="glass p-8 rounded-[2.5rem] space-y-4">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-[#10b981]" />
               </div>
               <h4 className="text-lg font-bold text-white">Usage Analytics</h4>
               <p className="text-white/40 text-sm leading-relaxed">System data synchronized. Archives are stored in your private Firestore silo.</p>
               <button className="text-[#10b981] text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                  Upgrade to Pro <ArrowRight className="w-4 h-4" />
               </button>
            </div>
         </div>

         <div className="glass p-8 rounded-[2.5rem] space-y-6">
            <h4 className="text-lg font-black text-white px-2">System Preferences</h4>
            <div className="space-y-4">
               {[
                 { label: 'High Precision Analysis', value: true, desc: 'Uses advanced semantic matching for higher scores on Lever and Greenhouse.' },
                 { label: 'Automatic Archive', value: true, desc: 'Saves your scan results to the history automatically after scanning.' },
                 { label: 'Dark Mode (Always On)', value: true, desc: 'Forced nocturnal theme for reduced eye strain.' }
               ].map(pref => (
                 <div key={pref.label} className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                    <div>
                       <p className="font-bold text-white group-hover:text-[#6366f1] transition-colors">{pref.label}</p>
                       <p className="text-white/30 text-xs mt-1 leading-relaxed">{pref.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-[#6366f1] rounded-full p-1 relative flex items-center">
                       <div className="absolute right-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      <div className="p-10 bg-red-500/5 border border-red-500/10 rounded-[3rem] text-center space-y-4">
          <p className="text-red-500 font-bold uppercase tracking-widest text-[10px]">Danger Zone</p>
          <h4 className="text-xl font-black text-white">Wipe All Records</h4>
          <p className="text-white/40 text-sm max-w-sm mx-auto">This will irreversibly delete all your previous scans from our secure Firestore database.</p>
          <button className="px-8 py-4 bg-red-500 text-white rounded-2xl font-bold text-sm hover:scale-95 transition-all shadow-xl shadow-red-500/20">
             Delete Personal Data
          </button>
      </div>
    </div>
  );
}
