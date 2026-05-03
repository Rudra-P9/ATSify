import React from 'react';
import { 
  Github, 
  Linkedin, 
  Globe, 
  Coffee, 
  Twitter, 
  Instagram, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Footer({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const socialLinks = [
    { 
      icon: <Linkedin className="w-5 h-5 text-[#0a66c2]" />, 
      url: "https://www.linkedin.com/in/rudrap9", 
      label: "LinkedIn",
      hoverClass: "hover:border-[#0a66c2]/50 hover:bg-[#0a66c2]/10 shadow-[#0a66c2]/10" 
    },
    { 
      icon: <Globe className="w-5 h-5 text-cyan-400" />, 
      url: "https://rudrap9.vercel.app/", 
      label: "Website",
      hoverClass: "hover:border-cyan-400/50 hover:bg-cyan-400/10 shadow-cyan-400/10"
    },
    { 
      icon: <Github className="w-5 h-5 text-white/80" />, 
      url: "https://github.com/Rudra-P9/ATSify", 
      label: "Source Code",
      hoverClass: "hover:border-white/50 hover:bg-white/10 shadow-white/10"
    },
    { 
      icon: <Coffee className="w-5 h-5 text-[#FFDD00]" />, 
      url: "https://buymeacoffee.com/rudrap9", 
      label: "Buy me a coffee",
      hoverClass: "hover:border-[#FFDD00]/50 hover:bg-[#FFDD00]/10 shadow-[#FFDD00]/10"
    },
  ];

  const sections = [
    {
      title: "Services",
      links: [
        { label: "ATS Screener", tab: "scanner" },
        { label: "Cover Pilot", tab: "cover-pilot", status: "Coming Soon" },
        { label: "Resume Lab", tab: "resume-lab", status: "Coming Soon" }
      ]
    },
    {
      title: "About ATSify",
      links: [
        { label: "Our Story", tab: "story" },
        { label: "Methodology", tab: "methodology" },
        { label: "Privacy Policy", tab: "privacy" },
        { label: "Terms of Service", tab: "terms" },
        { label: "Contact Us", tab: "contact" }
      ]
    }
  ];

  return (
    <footer className="w-full bg-[#08080b] border-t border-white/[0.05] pt-20 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1800px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 mb-20 text-left">
        {/* Logo & Description */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative">
              <img src="/assets/images/logo.jpeg" className="w-12 h-12 rounded-2xl object-cover shadow-[0_0_20px_rgba(99,102,241,0.3)]" alt="Logo" />
              <div className="absolute -inset-1 bg-[#6366f1]/10 rounded-2xl blur-lg -z-10"></div>
            </div>
            <span className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-[#6366f1] to-purple-400">ATSify</span>
          </div>
          
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            ATSify is a modern intelligence engine designed to give job seekers an edge. 
            We simulate complex Applicant Tracking Systems to ensure your resume 
            never gets lost in the digital void.
          </p>
          
          <div className="flex gap-4">
            {socialLinks.map((link, idx) => (
              <a 
                key={idx}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center transition-all hover:shadow-lg",
                  link.hoverClass
                )}
                title={link.label}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Links Sections */}
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-6">
            <h4 className="text-white font-black uppercase tracking-[0.2em] text-xs pb-2 border-b border-white/[0.05] inline-block">
              {section.title}
            </h4>
            <ul className="space-y-4">
              {section.links.map((link, lIdx) => (
                <li key={lIdx}>
                  {link.status ? (
                    <div className="flex items-center gap-2 text-white/10 text-sm font-medium cursor-not-allowed group relative">
                      <span className="line-through decoration-white/20">{link.label}</span>
                      <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-[#6366f1] font-black uppercase tracking-widest">{link.status}</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        onTabChange?.(link.tab);
                      }}
                      className="text-white/50 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 group text-left"
                    >
                      <ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#6366f1]" />
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1800px] mx-auto pt-10 border-t border-white/[0.03] flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="text-white/40 text-[10px] font-black uppercase tracking-widest text-center lg:text-left">
          Copyright © 2026 ATSify &bull; All Rights Reserved
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2 text-white/50 text-[10px] font-black uppercase tracking-widest">
          <span>Designed with</span>
          <span className="text-red-500 animate-pulse text-xs">❤️</span>
          <span>and a lot of</span>
          <span className="text-yellow-600 text-xs">☕</span>
          <span>by Rudra</span>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <a href="https://github.com/Rudra-P9/ATSify/issues" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/5">
            <Github className="w-3 h-3" /> Report a Bug
          </a>
          <div className="flex items-center gap-4">
            <a href="#" className="text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Privacy</a>
            <a href="#" className="text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Terms</a>
            <a href="#" className="text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
