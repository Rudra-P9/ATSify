import React from 'react';
import { Globe, ShieldCheck, Zap } from 'lucide-react';
import { signInWithGoogle } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface SignInPageProps {
  onSignInSuccess: () => void;
}

export default function SignInPage({ onSignInSuccess }: SignInPageProps) {
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    
    setIsSigningIn(true);
    setError(null);
    
    try {
      await signInWithGoogle();
      onSignInSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please enable popups for this site or try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore this as it is likely a concurrent request that was cancelled
      } else {
        setError(err.message || 'An error occurred during sign-in.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#6366f1]/10 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full -z-10 animate-pulse delay-700" />

      <div className="w-full max-w-md space-y-12 text-center">
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <img src="/assets/images/logo.jpeg" className="w-20 h-20 rounded-[2rem] object-cover shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-transform group-hover:scale-110 duration-500" alt="Logo" />
              <div className="absolute -inset-2 bg-[#6366f1]/20 rounded-[2.5rem] blur-xl -z-10 group-hover:bg-[#6366f1]/30 transition-all"></div>
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Sign in to get started</h1>
          <p className="text-white/40 font-medium">Access your personalized resume analysis and optimization tools.</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className={cn(
              "w-full flex items-center justify-center gap-4 bg-white text-black py-5 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed",
              !isSigningIn && "hover:scale-[1.02] active:scale-95"
            )}
          >
            {isSigningIn ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            )}
            {isSigningIn ? 'Connecting...' : 'Continue with Google'}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium"
            >
              {error}
            </motion.div>
          )}
        </div>

        <div className="pt-8 border-t border-white/5 space-y-6">
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-5 h-5 text-[#10b981]" />
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Encypted</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Global Scan</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="w-5 h-5 text-amber-400" />
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Instant</span>
            </div>
          </div>
          <p className="text-[10px] text-white/20 font-medium">
            By signing in, you agree to our <span className="text-white/40 underline cursor-pointer">Terms</span> and <span className="text-white/40 underline cursor-pointer">Privacy Policy</span>. 
            All parsing logic is performed securely.
          </p>
        </div>
      </div>
    </div>
  );
}
