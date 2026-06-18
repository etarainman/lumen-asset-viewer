
import React, { useState } from 'react';
import { Status4D, ColorMode, Ownership, StatusDefinition, OwnerDefinition } from '../types';
import { X, Palette, ToggleLeft, ToggleRight } from 'lucide-react';

interface ColorSettingsProps {
  activeMode: ColorMode;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onModeChange: (mode: ColorMode) => void;
  onClose: () => void;
  statuses: StatusDefinition[];
  owners: OwnerDefinition[];
}

const ColorSettings: React.FC<ColorSettingsProps> = ({
  activeMode,
  enabled,
  onToggleEnabled,
  onModeChange,
  onClose,
  statuses,
  owners
}) => {
  const [currentTab, setCurrentTab] = useState<ColorMode>(activeMode === 'VENDOR' ? 'STATUS' : activeMode);

  const handleTabChange = (mode: ColorMode) => {
    setCurrentTab(mode);
    onModeChange(mode);
  };

  const renderLegend = () => {
    if (!enabled) {
      return (
        <div className="py-10 text-center space-y-3 opacity-60">
          <div className="flex justify-center">
            <Palette size={32} className="text-slate-300" />
          </div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed px-4">
            Color logic is currently disabled. Toggle to visualize BIM standards.
          </p>
        </div>
      );
    }

    switch (currentTab) {
      case 'STATUS':
        return (
          <div className="space-y-3 animate-in fade-in duration-300">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">4D Lifecycle Status</h4>
            {statuses.map((status) => (
              <div key={status.id} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: status.color }}></div>
                <span className="text-[11px] font-bold text-slate-600">{status.label}</span>
              </div>
            ))}
          </div>
        );
      case 'OWNER':
        return (
          <div className="space-y-3 animate-in fade-in duration-300">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Stakeholder</h4>
            {owners.map((owner) => (
              <div key={owner.id} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: owner.color }}></div>
                <span className="text-[11px] font-bold text-slate-600">{owner.name} Assets</span>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-white shadow-2xl rounded-[2rem] border border-slate-200 z-[110] animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col">
      <div className="bg-slate-950 px-6 py-5 text-white flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-3">
          <Palette size={18} className="text-blue-500" />
          <div className="flex flex-col">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em]">Color Engine</h3>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Visual Logic Controller</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full"><X size={18} /></button>
      </div>

      <div className="p-6 pb-2">
        <button
          onClick={() => onToggleEnabled(!enabled)}
          className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all border ${enabled ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Color Logic</span>
            <span className={`text-[8px] font-bold uppercase tracking-tight ${enabled ? 'text-blue-100' : 'text-slate-400'}`}>{enabled ? 'Active Visualization' : 'Standard Materials'}</span>
          </div>
          {enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
      </div>

      <div className={`flex border-b border-slate-100 p-2 mx-6 mt-2 mb-4 bg-slate-100/50 rounded-2xl transition-opacity duration-300 ${!enabled ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
        <button
          onClick={() => handleTabChange('STATUS')}
          className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl ${currentTab === 'STATUS' ? 'text-blue-600 bg-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
        >
          4D Status
        </button>
        <button
          onClick={() => handleTabChange('OWNER')}
          className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl ${currentTab === 'OWNER' ? 'text-blue-600 bg-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Stakeholder
        </button>
      </div>

      <div className="p-8 pt-2">
        {renderLegend()}
      </div>

      <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Standards: Lumen DC BIM v2.0</span>
      </div>
    </div>
  );
};

export default ColorSettings;
