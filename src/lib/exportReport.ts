/**
 * PDF Report Generator
 * Builds a clean formal one-page A4 report using jsPDF directly.
 * Adapted for React from the provided template.
 */
import jsPDF from 'jspdf';
import { User } from 'firebase/auth';
import { classifyScore } from './classification';

interface ATSResult {
  system: string;
  vendor: string;
  overallScore: number;
  passesFilter: boolean;
  breakdown: {
    formatting: { score: number; issues: string[] };
    keywordMatch: { score: number; matched: string[]; missing: string[] };
    sections: { score: number; missing: string[] };
    experience: { score: number; actionVerbCount: number; quantifiedBullets: number };
    education: { score: number; notes: string[] };
  };
  engineUsed: string;
  suggestions: {
    summary: string;
    details: string[];
    platforms: string[];
    impact: string;
  }[];
}

interface SavedScan {
  id: string;
  resumeText: string;
  jobDescription?: string;
  results: ATSResult[];
  metadata: any;
  createdAt: any;
}

// palette
const P = {
  navy: '#0f172a',
  dark: '#1e293b',
  mid: '#475569',
  light: '#94a3b8',
  faint: '#cbd5e1',
  rule: '#e2e8f0',
  bg: '#f8fafc',
  headerBg: '#eef2f7',
  rowAlt: '#fafbfd',
  accent: '#0ea5e9',
  green: '#16a34a',
  yellow: '#ca8a04',
  orange: '#ea580c',
  red: '#dc2626'
};

function sc(s: number) {
  if (s >= 80) return P.green;
  if (s >= 60) return P.yellow;
  if (s >= 40) return P.orange;
  return P.red;
}

function getKeywordStats(results: ATSResult[]) {
  const matchedCounts = new Map<string, number>();
  const missingCounts = new Map<string, number>();
  for (const r of results) {
    for (const kw of r.breakdown.keywordMatch.matched) {
      matchedCounts.set(kw, (matchedCounts.get(kw) ?? 0) + 1);
    }
    for (const kw of r.breakdown.keywordMatch.missing) {
      missingCounts.set(kw, (missingCounts.get(kw) ?? 0) + 1);
    }
  }
  // sort by frequency
  const matched = [...matchedCounts.entries()].sort((a, b) => b[1] - a[1]).map(([kw]) => kw);
  const missing = [...missingCounts.entries()].sort((a, b) => b[1] - a[1]).map(([kw]) => kw);
  return { matched, missing, totalMatched: matched.length, totalMissing: missing.length };
}

function getTopSuggestions(results: ATSResult[], max: number) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of results) {
    for (const s of r.suggestions) {
      if (!seen.has(s.summary)) {
        seen.add(s.summary);
        out.push(s);
      }
    }
  }
  return out.slice(0, max);
}

export async function generatePDF(user: User | null, scan: SavedScan) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const ML = 18;
  const MR = 18;
  const CW = W - ML - MR;
  let y = 0;

  doc.setCharSpace(0);

  const results = scan.results;
  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + r.overallScore, 0) / results.length)
    : 0;
  const passCount = results.filter(r => r.passesFilter).length;
  
  const userName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Anonymous';
  const grade = classifyScore(avgScore);
  const kwStats = getKeywordStats(results);
  const suggestions = getTopSuggestions(results, 5);

  // ---- helpers ----
  function hex(h: string): [number, number, number] {
    const v = h.replace('#', '');
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }
  function tc(h: string) {
    doc.setTextColor(...hex(h));
  }
  function fc(h: string) {
    doc.setFillColor(...hex(h));
  }
  function dc(h: string) {
    doc.setDrawColor(...hex(h));
  }
  function rect(x: number, ry: number, w: number, rh: number, c: string) {
    fc(c);
    doc.rect(x, ry, w, rh, 'F');
  }
  function hline(x1: number, ly: number, x2: number, y2: number, c: string, lw = 0.3) {
    dc(c);
    doc.setLineWidth(lw);
    doc.line(x1, ly, x2, y2);
  }
  function wrappedText(text: string, x: number, ty: number, maxW: number, lineH: number): number {
    const lines: string[] = doc.splitTextToSize(text, maxW);
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], x, ty + i * lineH);
    }
    return lines.length;
  }

  // TOP ACCENT BARS
  rect(0, 0, W, 1.8, P.navy);
  rect(0, 1.8, W, 0.6, P.accent);
  y = 12;

  // HEADER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  tc(P.navy);
  doc.text('ATS Compatibility Report', ML, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  tc(P.light);
  const modeText = scan.jobDescription ? 'TARGETED ANALYSIS' : 'GENERAL READINESS';
  doc.text(modeText, W - MR, y - 4, { align: 'right' });

  y += 4;
  hline(ML, y, W - MR, y, P.rule, 0.4);
  y += 8;

  // META ROW
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  tc(P.light);
  doc.text('PREPARED FOR', ML, y);
  doc.text('DATE OF ANALYSIS', W / 2 - 12, y);
  doc.text('OVERALL SCORE', W - MR - 28, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  tc(P.navy);
  const nameDisplay = userName.length > 35 ? userName.slice(0, 34) + '...' : userName;
  doc.text(nameDisplay, ML, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  tc(P.dark);
  const dateStr = new Date(scan.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(dateStr, W / 2 - 12, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  tc(sc(avgScore));
  const scoreStr = String(avgScore);
  doc.text(scoreStr, W - MR - 28, y + 1);
  const scoreW = doc.getTextWidth(scoreStr);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  tc(P.light);
  doc.text('/100', W - MR - 28 + scoreW + 1, y + 1);

  y += 10;

  // EXECUTIVE SUMMARY
  const summaryBoxH = 26;
  rect(ML, y, CW, summaryBoxH, P.bg);
  rect(ML, y, 1.4, summaryBoxH, P.navy);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  tc(P.navy);
  doc.text('EXECUTIVE SUMMARY', ML + 6, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  tc(P.mid);
  const summaryText =
    `Your resume was analyzed against ${results.length} major ATS platforms. ` +
    `${passCount} of ${results.length} systems returned a passing score. ` +
    `The average compatibility rating across all platforms is ${avgScore}/100, classified as ${grade.label}. ` +
    (passCount < results.length
      ? 'Targeted improvements to keyword optimization and formatting could significantly improve results on underperforming platforms.'
      : 'Your resume demonstrates strong cross-platform compatibility.');
  wrappedText(summaryText, ML + 6, y + 10.5, CW - 14, 4.5);

  y += summaryBoxH + 8;

  // 1. PLATFORM COMPATIBILITY SCORES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  tc(P.navy);
  doc.text('1.  Platform Compatibility Scores', ML, y);
  y += 6;

  const cols = [
    { label: 'PLATFORM', x: ML, w: 30, left: true },
    { label: 'OVERALL', x: ML + 30, w: 16 },
    { label: 'FORMAT', x: ML + 46, w: 17 },
    { label: 'KEYWORDS', x: ML + 63, w: 19 },
    { label: 'SECTIONS', x: ML + 82, w: 18 },
    { label: 'EXPERIENCE', x: ML + 100, w: 21 },
    { label: 'EDUCATION', x: ML + 121, w: 19 },
    { label: 'KW FOUND', x: ML + 140, w: 18 },
    { label: 'STATUS', x: ML + 158, w: 16 }
  ];

  const thH = 7;
  rect(ML, y, CW, thH, P.headerBg);
  hline(ML, y + thH, W - MR, y + thH, P.faint, 0.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  tc(P.mid);
  for (const col of cols) {
    if ('left' in col && col.left) {
      doc.text(col.label, col.x + 2.5, y + 4.5);
    } else {
      doc.text(col.label, col.x + col.w / 2, y + 4.5, { align: 'center' });
    }
  }
  y += thH;

  const rowH = 8;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const ry = y + i * rowH;
    if (i % 2 === 1) rect(ML, ry, CW, rowH, P.rowAlt);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    tc(P.navy);
    doc.text(r.system, cols[0].x + 2.5, ry + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    tc(sc(r.overallScore));
    doc.text(String(r.overallScore), cols[1].x + cols[1].w / 2, ry + 5.2, { align: 'center' });

    const dims = [
      r.breakdown.formatting.score,
      r.breakdown.keywordMatch.score,
      r.breakdown.sections.score,
      r.breakdown.experience.score,
      r.breakdown.education.score
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    for (let d = 0; d < dims.length; d++) {
      tc(P.mid);
      doc.text(String(dims[d]), cols[d + 2].x + cols[d + 2].w / 2, ry + 5.2, { align: 'center' });
    }

    tc(P.mid);
    doc.setFontSize(7);
    const matchedKwCount = r.breakdown.keywordMatch.matched.length;
    const totalKwCount = matchedKwCount + r.breakdown.keywordMatch.missing.length;
    doc.text(`${matchedKwCount}/${totalKwCount}`, cols[7].x + cols[7].w / 2, ry + 5.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const statusLabel = r.overallScore >= 60 ? 'PASS' : r.overallScore >= 40 ? 'MARGINAL' : 'FAIL';
    tc(sc(r.overallScore));
    doc.text(statusLabel, cols[8].x + cols[8].w / 2, ry + 5.2, { align: 'center' });
  }

  y += results.length * rowH;
  hline(ML, y, W - MR, y, P.faint, 0.3);
  y += 10;

  // 2. RECOMMENDATIONS
  let sectionNum = 2;
  if (suggestions.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    tc(P.navy);
    doc.text(`${sectionNum}.  Recommendations for Improvement`, ML, y);
    y += 6;

    const recThH = 7;
    rect(ML, y, CW, recThH, P.headerBg);
    hline(ML, y + recThH, W - MR, y + recThH, P.faint, 0.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    tc(P.mid);
    doc.text('#', ML + 5, y + 4.5, { align: 'center' });
    doc.text('RECOMMENDATION', ML + 14, y + 4.5);
    doc.text('PRIORITY', W - MR - 12, y + 4.5, { align: 'center' });
    y += recThH;

    const maxRecs = Math.min(suggestions.length, 5);
    const recRowH = 8;
    for (let i = 0; i < maxRecs; i++) {
      const s = suggestions[i];
      const ry = y + i * recRowH;
      if (i % 2 === 1) rect(ML, ry, CW, recRowH, P.rowAlt);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      tc(P.light);
      doc.text(String(i + 1), ML + 5, ry + 5.2, { align: 'center' });

      tc(P.dark);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      let txt = s.summary;
      if (txt.length > 110) txt = txt.slice(0, 107) + '...';
      doc.text(txt, ML + 14, ry + 5.2, { maxWidth: CW - 42 });

      const impact = s.impact.toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      const impactColor = impact === 'CRITICAL' ? P.red : impact === 'HIGH' ? P.orange : impact === 'MEDIUM' ? P.yellow : P.green;
      tc(impactColor);
      doc.text(impact, W - MR - 12, ry + 5.2, { align: 'center' });
    }

    y += maxRecs * recRowH;
    hline(ML, y, W - MR, y, P.faint, 0.3);
    y += 10;
    sectionNum++;
  }

  // 3. KEYWORD COVERAGE
  if (kwStats.totalMatched > 0 || kwStats.totalMissing > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    tc(P.navy);
    doc.text(`${sectionNum}.  Keyword Coverage`, ML, y);
    y += 6;

    const colW = (CW - 6) / 2;
    const boxH = 32;

    rect(ML, y, colW, boxH, '#f0fdf4');
    rect(ML, y, 1.2, boxH, P.green);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    tc(P.green);
    doc.text(`MATCHED (${kwStats.totalMatched})`, ML + 5, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    tc(P.mid);
    const matchedList = kwStats.matched.slice(0, 15).join(', ');
    const matchedTruncated = kwStats.matched.length > 15 ? matchedList + ` +${kwStats.matched.length - 15} more` : matchedList;
    wrappedText(matchedTruncated || 'None detected', ML + 5, y + 10, colW - 8, 3.8);

    const rightX = ML + colW + 6;
    const missingColor = kwStats.totalMissing > 0 ? P.red : P.green;
    rect(rightX, y, colW, boxH, kwStats.totalMissing > 0 ? '#fef2f2' : '#f0fdf4');
    rect(rightX, y, 1.2, boxH, missingColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    tc(missingColor);
    doc.text(`MISSING (${kwStats.totalMissing})`, rightX + 5, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    tc(P.mid);
    const missingList = kwStats.missing.slice(0, 15).join(', ');
    const missingTruncated = kwStats.missing.length > 15 ? missingList + ` +${kwStats.missing.length - 15} more` : missingList;
    wrappedText(missingTruncated || 'None detected', rightX + 5, y + 10, colW - 8, 3.8);

    y += boxH + 10;
  }

  // 4. METHODOLOGY
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  tc(P.navy);
  doc.text(`${sectionNum}.  Methodology`, ML, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  tc(P.mid);
  const methText =
    'Each platform score is a weighted composite of dimensions including formatting compliance, keyword density, section structure, and experience relevance. Scores are generated using AI-assisted heuristics calibrated against enterprise ATS standards. A score of 60+ indicates high probability of passing initial automated screens.';
  wrappedText(methText, ML, y, CW, 4.5);

  // FOOTER
  const footerY = H - 11;
  hline(ML, footerY - 3, W - MR, footerY - 3, P.rule, 0.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  tc(P.light);
  wrappedText('This report is provided for informational purposes only. ATSify is an independent analysis tool.', ML, footerY, 70, 2.8);

  const attrText = 'ATSify Intelligence Dashboard';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  tc(P.accent);
  const attrW = doc.getTextWidth(attrText);
  doc.text(attrText, W / 2 - attrW / 2, footerY + 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  tc(P.dark);
  doc.text('atsify-scanner.vercel.app', W - MR, footerY, { align: 'right' });
  
  const footerDate = new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  tc(P.light);
  doc.text(footerDate, W - MR, footerY + 3.5, { align: 'right' });

  rect(0, H - 2.4, W, 0.6, P.accent);
  rect(0, H - 1.8, W, 1.8, P.navy);

  const fileDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/ /g, '_');
  doc.save(`${userName}_ATS_Report_${fileDate}.pdf`);
}
