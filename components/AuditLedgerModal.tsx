
import React from 'react';
import { X, Download, FileSpreadsheet, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Equipment, Rack } from '../types';

interface AuditLedgerModalProps {
  equipment: Equipment[];
  racks: Rack[];
  onUnlink: (type: 'EQUIPMENT' | 'RACK', id: string) => void;
  onExport: () => void;
  onClose: () => void;
}

const AuditLedgerModal: React.FC<AuditLedgerModalProps> = ({ equipment, racks, onUnlink, onExport, onClose }) => {
  const verifiedBim = equipment.filter(e => e.proInventoryId && e.isVerified);
  const verifiedRacks = racks.filter(r => r.proInventoryId && r.isVerified);

  const totalTransactions = verifiedBim.length + verifiedRacks.length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-[1100px] h-[750px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="font-bold text-xl tracking-tight">Audit Change Ledger</h2>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Pre-Export Transaction Review</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right mr-4">
                <span className="block text-[10px] font-black text-slate-500 uppercase">Pending Updates</span>
                <span className="text-xl font-black text-emerald-400">{totalTransactions}</span>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-8">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle className="text-blue-600 shrink-0" size={20} />
            <p className="text-sm text-blue-800 leading-relaxed">
              The following items have been <strong>Verified</strong> during this audit. Review the mapping below. Clicking "Download CSV" will generate the <strong>Instructions File</strong> for the PRO Database reconciliation team.
            </p>
          </div>

          <div className="flex-1 overflow-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">PRO ID</th>
                  <th className="px-4 py-3">BIM Asset ID</th>
                  <th className="px-4 py-3">Current Location</th>
                  <th className="px-4 py-3">Verified Pos</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifiedRacks.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[10px] font-bold text-blue-600 bg-blue-50/30">RACK</td>
                    <td className="px-4 py-4 font-mono font-bold text-slate-700">{r.proInventoryId}</td>
                    <td className="px-4 py-4 font-mono text-slate-400">{r.id}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{r.location}</td>
                    <td className="px-4 py-4 text-slate-400">Base</td>
                    <td className="px-4 py-4 text-right">
                       <button onClick={() => onUnlink('RACK', r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {verifiedBim.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4 text-[10px] font-bold text-emerald-600 bg-emerald-50/30">EQPT</td>
                    <td className="px-4 py-4 font-mono font-bold text-slate-700">{e.proInventoryId}</td>
                    <td className="px-4 py-4 font-mono text-slate-400">{e.id}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">
                      {racks.find(r => r.id === e.rackId)?.location || 'Unknown'}
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-500">U{e.uPosition}</td>
                    <td className="px-4 py-4 text-right">
                       <button onClick={() => onUnlink('EQUIPMENT', e.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {totalTransactions === 0 && (
                   <tr>
                     <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                           <CheckCircle2 size={48} />
                           <p className="font-bold">No verified links found yet.</p>
                        </div>
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Audit User</span>
                <span className="text-sm font-bold text-slate-700">DC_TECH_PRO_01</span>
             </div>
             <div className="w-px h-8 bg-slate-200" />
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Export Format</span>
                <span className="text-sm font-bold text-slate-700">Lumen Machine Readable CSV (v2.1)</span>
             </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all">Continue Audit</button>
            <button 
              onClick={onExport}
              disabled={totalTransactions === 0}
              className="px-8 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
            >
              Download Instructions File <Download size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLedgerModal;
