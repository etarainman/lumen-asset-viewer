
import React from 'react';
import { AlertTriangle, X, MapPin, Layers, ArrowRight } from 'lucide-react';

export interface Alert {
    id: string;
    severity: 'CRITICAL' | 'WARNING';
    message: string;
    sourceId: string;
    sourceType: 'RACK' | 'EQUIPMENT';
    location: string;
    details?: string;
    buildingId?: string;
    siteId?: string;
}

interface AlertsPanelProps {
    alerts: Alert[];
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'RACK' | 'EQUIPMENT', id: string) => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute top-20 right-8 w-96 bg-slate-900/95 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden z-[500] animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-red-500/10">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500 p-2 rounded-lg text-white shadow-lg shadow-red-500/20">
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Detected Issues</h3>
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{alerts.length} Active Breaches</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                    <X size={18} />
                </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
                {alerts.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center gap-3 text-slate-500">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
                            <AlertTriangle size={24} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">No Business Rule Breaches</span>
                        <span className="text-[10px] text-slate-600">Your facility data adheres to all validation logic.</span>
                    </div>
                ) : (
                    alerts.map(alert => (
                        <div
                            key={alert.id}
                            onClick={() => onSelect(alert.sourceType, alert.sourceId)}
                            className="bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-red-500/30 rounded-xl p-3 cursor-pointer group transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${alert.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-amber-400'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${alert.severity === 'CRITICAL' ? 'bg-red-900/30 text-red-400' : 'bg-amber-900/30 text-amber-400'}`}>
                                            {alert.severity}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-500">{alert.sourceType}</span>
                                    </div>

                                    <p className="text-xs font-bold text-slate-200 mb-1 leading-tight group-hover:text-blue-400 transition-colors">
                                        {alert.message}
                                    </p>

                                    {alert.details && (
                                        <p className="text-[10px] text-slate-400 mb-2 border-l-2 border-white/10 pl-2">
                                            {alert.details}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 bg-slate-900/50 p-1.5 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <MapPin size={10} />
                                            {alert.location}
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight size={14} className="text-slate-600 group-hover:text-blue-500 group-hover:-translate-x-1 transition-all self-center" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AlertsPanel;
