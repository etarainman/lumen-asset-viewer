
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { X, Bot, Sparkles, Loader2, ShieldCheck, AlertCircle, FileText } from 'lucide-react';

interface AuditReviewModalProps {
  summary: {
    verifiedCount: number;
    totalBim: number;
    completionRate: number;
    mismatchCount: number;
    orphanProCount: number;
    orphanBimCount: number;
    mismatchDetails: string[];
  };
  onClose: () => void;
  onResetKey?: () => void;
}

const AuditReviewModal: React.FC<AuditReviewModalProps> = ({ summary, onClose, onResetKey }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        // Create instance right before call as per guidelines
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
          You are a Data Center Asset Integrity Expert. Analyze this audit reconciliation state for a DC floor:
          - Total BIM Items: ${summary.totalBim}
          - Verified Links: ${summary.verifiedCount}
          - Completion: ${summary.completionRate.toFixed(1)}%
          - Location Mismatches Found: ${summary.mismatchCount}
          - Records missing from BIM: ${summary.orphanProCount}
          - Unlinked BIM items: ${summary.orphanBimCount}
          
          Provide a professional executive summary (max 200 words). 
          Structure it with:
          1. Overall Health Score (out of 10).
          2. Top Data Quality Concern.
          3. Recommendation for the PRO DB administrator.
          Use a professional, sharp, and helpful tone.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });

        setAiAnalysis(response.text || "Unable to generate analysis.");
      } catch (error) {
        console.error("AI Analysis failed", error);
        
        // Handle specific platform error for key reset
        if (error instanceof Error && error.message.includes("Requested entity was not found")) {
            if (onResetKey) onResetKey();
        }
        
        setAiAnalysis("Error connecting to Site AI. Please check your network or API key authorization.");
      } finally {
        setLoading(false);
      }
    };

    runAnalysis();
  }, [summary, onResetKey]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20 ring-1 ring-black/10">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><Bot size={20} /></div>
            <div>
              <h2 className="font-bold text-lg leading-tight">AI Audit Intelligence</h2>
              <p className="text-xs text-slate-400">Powered by Gemini 3 Flash</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="p-8 flex-1">
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Audit Score</span>
              <span className={`text-2xl font-black ${summary.completionRate > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {Math.round(summary.completionRate)}%
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mismatches</span>
              <span className={`text-2xl font-black ${summary.mismatchCount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {summary.mismatchCount}
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Verified</span>
              <span className="text-2xl font-black text-blue-600">
                {summary.verifiedCount}/{summary.totalBim}
              </span>
            </div>
          </div>

          <div className="relative bg-blue-50/50 rounded-2xl p-6 border border-blue-100 min-h-[200px]">
            <div className="absolute top-4 right-4 text-blue-300"><Sparkles size={20} /></div>
            <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
               <ShieldCheck size={14} /> Executive Summary
            </h3>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={32} className="text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-blue-600 animate-pulse">Analyzing reconciliation data...</span>
              </div>
            ) : (
              <div className="prose prose-slate prose-sm max-w-none">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                  "{aiAnalysis}"
                </p>
              </div>
            )}
          </div>

          {summary.mismatchCount > 0 && (
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-tight mb-1">Action Required</h4>
                <p className="text-[11px] text-amber-700 leading-tight">
                  {summary.mismatchCount} items have physical labels that conflict with their PRO records. These must be updated in the source database via the Instructions File.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">Dismiss</button>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
            Proceed to Ledger <FileText size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditReviewModal;
