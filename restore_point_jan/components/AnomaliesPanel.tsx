import React from 'react';
import { Anomaly } from '../types';
import { AlertTriangle, ArrowRight, CheckCircle, Database, Box } from 'lucide-react';

interface AnomaliesPanelProps {
  anomalies: Anomaly[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string) => void;
}

const AnomaliesPanel: React.FC<AnomaliesPanelProps> = ({ anomalies, isOpen, onClose, onSubmit }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-4 w-96 bg-white shadow-2xl rounded-lg border border-slate-200 flex flex-col max-h-[calc(100vh-200px)] z-30 animate-in slide-in-from-right fade-in duration-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-900 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="font-semibold">Detected Anomalies ({anomalies.length})</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      
      <div className="bg-slate-50 p-2 text-xs text-slate-500 border-b border-slate-200">
        Comparing BIM Model vs ProInventory
      </div>

      <div className="overflow-y-auto p-4 space-y-4">
        {anomalies.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500" />
                <p>All records synced.</p>
            </div>
        ) : (
            anomalies.map((anomaly) => (
            <div key={anomaly.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-sm relative overflow-hidden">
                {/* Colored strip based on type */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    anomaly.type === 'BIM_ONLY' ? 'bg-amber-500' : 
                    anomaly.type === 'PRO_ONLY' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>

                <div className="ml-2">
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            {anomaly.type.replace('_', ' ')}
                        </span>
                    </div>
                    
                    <p className="text-slate-600 mb-2 leading-tight">
                        {anomaly.description}
                    </p>

                    {/* Context Details */}
                    <div className="bg-slate-50 p-2 rounded mb-3 text-xs font-mono text-slate-500 space-y-1">
                         {anomaly.itemBim && (
                            <div className="flex items-center gap-1">
                                <Box size={10} /> BIM: {anomaly.itemBim.name} ({anomaly.itemBim.rackId})
                            </div>
                         )}
                         {anomaly.itemPro && (
                            <div className="flex items-center gap-1">
                                <Database size={10} /> PRO: {anomaly.itemPro.name} ({anomaly.itemPro.rackId})
                            </div>
                         )}
                    </div>

                    <div className="mt-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
                        <select className="w-full text-xs border border-slate-300 rounded p-1 mb-2 bg-white">
                            <option>{anomaly.suggestedAction}</option>
                            <option>Ignore for now</option>
                        </select>
                        <button 
                            onClick={() => onSubmit(anomaly.id)}
                            className="w-full bg-slate-800 text-white text-xs py-1.5 rounded hover:bg-slate-700 flex items-center justify-center gap-1"
                        >
                            Resolve <ArrowRight size={10} />
                        </button>
                    </div>
                </div>
            </div>
            ))
        )}
      </div>
      
      {anomalies.length > 0 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-lg">
            <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 rounded text-sm transition-colors">
                Submit All Actions
            </button>
          </div>
      )}
    </div>
  );
};

export default AnomaliesPanel;