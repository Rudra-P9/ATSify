/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, signInWithGoogle, db } from './lib/firebase';
import { parseFile } from './lib/parser';
import { analyzeResume, ATSResult } from './lib/gemini';
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
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface SavedScan {
  id: string;
  resumeText: string;
  jobDescription?: string;
  results: ATSResult[];
  createdAt: number;
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scanner' | 'history'>('scanner');
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [viewingScan, setViewingScan] = useState<SavedScan | null>(null);

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
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedScan[];
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
            <div className="nav-item opacity-20 pointer-events-none flex items-center gap-3 px-4 py-3 text-sm">
              <UserIcon className="w-4 h-4" /> Settings
            </div>
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
                  {viewingScan ? "Analysis Dashboard" : "Resume Intelligence"}
                </h1>
                <p className="text-xs text-white/30 px-2 uppercase tracking-widest font-bold">
                  {viewingScan ? "Individual Report" : "Select a document to begin"}
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
            <ScannerSection onResults={(results, resumeText, jd) => {
              const scan = {
                resumeText,
                jobDescription: jd,
                results,
                createdAt: Date.now()
              };
              saveScan(scan).then(saved => {
                if (saved) setViewingScan(saved);
              });
            }} />
          ) : (
            <HistorySection items={history} onView={setViewingScan} onDelete={deleteScan} />
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
    <div className="text-center space-y-12 py-20 animate-fade-in">
      <div className="space-y-6">
        <div className="inline-flex px-3 py-1 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#6366f1]/20 mx-auto">
          Next Gen Resume Intelligence
        </div>
        <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]">
          Land more <br />
          <span className="text-[#6366f1]">Interviews.</span>
        </h1>
        <p className="text-lg text-white/40 max-w-xl mx-auto font-medium leading-relaxed">
          Simulate the filtering algorithms of Workday, Greenhouse, and Taleo. 100% private, client-side analysis.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button 
          onClick={onGetStarted}
          className="bg-white text-black px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-white/5"
        >
          Analyze Resume <ArrowRight className="w-5 h-5" />
        </button>
        <button className="px-10 py-5 rounded-2xl font-bold text-white/60 hover:text-white transition-all border border-white/5 hover:bg-white/5">
          How it Works
        </button>
      </div>
    </div>
  );
}


function ScannerSection({ onResults }: { onResults: (results: ATSResult[], resume: string, jd: string) => void }) {
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
      const results = await analyzeResume(text, jobDescription);
      setProgress(90);
      setTimeout(() => {
        onResults(results, text, jobDescription);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Engine error. Please try again.");
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Document Analysis</h2>
          <p className="text-sm text-white/30 font-bold uppercase tracking-widest mt-1">Upload Source & Target</p>
        </div>
        <HelpCircle className="w-5 h-5 text-white/20 hover:text-white transition-all cursor-help" />
      </div>

      <div className="grid gap-10">
        <div 
          className={cn(
            "p-12 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-all group relative overflow-hidden",
            file ? "bg-[#6366f1]/5 border-[#6366f1]/40" : "bg-white/[0.02] border-white/10 hover:border-white/20"
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
          <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            {file ? <FileText className="w-8 h-8 text-[#6366f1]" /> : <Upload className="w-8 h-8 text-white/20" />}
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-white">{file ? file.name : "Select Resume File"}</p>
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Supports PDF & DOCX &bull; Max 10MB</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <label className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Target Job Description</label>
            <span className="text-[10px] text-white/20">Syncing keywords improves score</span>
          </div>
          <textarea 
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste text or requirements here..."
            className="w-full h-48 bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-sm text-white focus:ring-2 focus:ring-[#6366f1]/40 focus:outline-none transition-all resize-none font-medium placeholder:text-white/10"
          />
        </div>

        {error && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm font-bold">
            <AlertCircle className="w-5 h-5" /> {error}
          </motion.div>
        )}

        <button 
          onClick={handleScan}
          disabled={isScanning || !file}
          className={cn(
            "w-full py-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden",
            isScanning ? "bg-white/5 text-white/20" : "bg-[#6366f1] text-white shadow-xl shadow-[#6366f1]/20"
          )}
        >
          {isScanning ? (
            <div className="flex items-center justify-center gap-4 relative z-10">
              <div className="w-5 h-5 border-2 border-white/10 border-t-[#6366f1] rounded-full animate-spin" />
              Processing... {progress}%
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              Launch Analysis Engine <ChevronRight className="w-5 h-5" />
            </div>
          )}
          {isScanning && <div className="absolute inset-y-0 left-0 bg-[#6366f1]/20 transition-all duration-500" style={{ width: `${progress}%` }} />}
        </button>
      </div>
    </div>
  );
}

function ResultsSection({ scan, onBack }: { scan: SavedScan, onBack: () => void }) {
  const [selectedSystem, setSelectedSystem] = useState(scan.results[0].system);
  const currentResult = scan.results.find(r => r.system === selectedSystem) || scan.results[0];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#10b981]';
    if (score >= 60) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const getScoreBorder = (score: number) => {
    if (score >= 80) return 'border-[#10b981]';
    if (score >= 60) return 'border-[#f59e0b]';
    return 'border-[#ef4444]';
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/40 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
        </button>
        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Report ID: {scan.id.slice(0, 8)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scan.results.map(r => (
          <button
            key={r.system}
            onClick={() => setSelectedSystem(r.system)}
            className={cn(
              "glass p-6 rounded-2xl flex flex-col gap-6 text-left transition-all relative overflow-hidden",
              selectedSystem === r.system ? "border-[#6366f1]/50 bg-[#6366f1]/10" : "hover:border-white/10"
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-black text-white">{r.system}</h4>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{r.vendor}</p>
              </div>
              <div className={cn("w-10 h-10 border-2 rounded-full flex items-center justify-center text-xs font-black", getScoreBorder(r.overallScore), getScoreColor(r.overallScore))}>
                {r.overallScore}
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Formatting', score: r.breakdown.formatting.score },
                { label: 'Keywords', score: r.breakdown.keywordMatch.score },
              ].map(dim => (
                <div key={dim.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-white/30 uppercase">{dim.label}</span>
                    <span className="text-white/60">{dim.score}%</span>
                  </div>
                  <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#6366f1] rounded-full" style={{ width: `${dim.score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className={cn("text-[10px] font-black uppercase flex items-center gap-1.5", r.passesFilter ? "text-[#10b981]" : "text-[#ef4444]")}>
              {r.passesFilter ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {r.passesFilter ? "Passes Initial Filter" : "Risk of Rejection"}
            </div>
            
            {selectedSystem === r.system && <div className="absolute right-0 top-0 w-1 h-full bg-[#6366f1]" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Detail Panel */}
        <div className="glass p-8 rounded-3xl space-y-8">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">{currentResult.system} Insights</h3>
            <p className="text-xs text-white/30 font-bold uppercase tracking-widest">In-depth matching logic analysis</p>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Improvement Areas</h4>
            <div className="space-y-3">
              {currentResult.suggestions.map((s, i) => (
                <div key={i} className="pl-4 border-l-2 border-[#6366f1] text-sm text-white/70 py-1">
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Keywords Panel */}
        <div className="glass p-8 rounded-3xl space-y-8">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">Keyword Intelligence</h3>
            <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Matched vs. Missing Skills</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            {currentResult.breakdown.keywordMatch.matched.map(kw => (
              <span key={kw} className="px-3 py-1.5 bg-[#10b981]/5 text-[#10b981] text-[10px] font-black uppercase rounded-lg border border-[#10b981]/10">
                {kw}
              </span>
            ))}
            {currentResult.breakdown.keywordMatch.missing.map(kw => (
              <span key={kw} className="px-3 py-1.5 bg-[#ef4444]/5 text-[#ef4444] text-[10px] font-black uppercase rounded-lg border border-[#ef4444]/10">
                {kw}
              </span>
            ))}
          </div>

          <div className="pt-8 border-t border-white/5 space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Quantified Bullets</span>
                  <span className="text-sm font-bold text-white">{currentResult.breakdown.experience.quantifiedBullets} / {currentResult.breakdown.experience.totalBullets}</span>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Action Verbs Found</span>
                  <span className="text-sm font-bold text-white">{currentResult.breakdown.experience.actionVerbCount}</span>
               </div>
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
