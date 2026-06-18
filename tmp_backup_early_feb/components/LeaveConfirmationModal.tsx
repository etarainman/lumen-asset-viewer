
import React from 'react';
import { AlertTriangle, Save, X, ArrowRight } from 'lucide-react';

interface LeaveConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveAndExit: () => void;
    onDiscardAndExit: () => void;
}

const LeaveConfirmationModal: React.FC<LeaveConfirmationModalProps> = ({ isOpen, onClose, onSaveAndExit, onDiscardAndExit }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-amber-500/10 rounded-full">
                        <AlertTriangle size={24} className="text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Unsaved Changes</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            You have unsaved changes in your workspace. What would you like to do?
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onSaveAndExit}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        <Save size={14} />
                        Save & Continue
                    </button>

                    <button
                        onClick={onDiscardAndExit}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        <X size={14} />
                        Discard Changes & Leave
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeaveConfirmationModal;
