
import React, { useState } from 'react';
import { BuildingDefinition, VendorDefinition, OwnerDefinition, StatusDefinition, ActionLog, SiteDefinition, SupabaseConfig, RackDefinition, EquipmentDefinition } from '../types';
import { Database, Cloud, History, X, Plus, Trash2, Box, Save, Layout, Layers, BoxSelect, Server, HardDrive } from 'lucide-react';
import DefinitionPreview3D from './DefinitionPreview3D';

const LOGO_URL = "https://ik.imagekit.io/gae3bdoli/ambiflo_full_white_clearance-256.png";

interface AdminPanelProps {
  buildingDefs: BuildingDefinition[];
  setBuildingDefs: React.Dispatch<React.SetStateAction<BuildingDefinition[]>>;
  rackDefs: RackDefinition[];
  setRackDefs: React.Dispatch<React.SetStateAction<RackDefinition[]>>;
  equipmentDefs: EquipmentDefinition[];
  setEquipmentDefs: React.Dispatch<React.SetStateAction<EquipmentDefinition[]>>;
  vendors: VendorDefinition[];
  setVendors: React.Dispatch<React.SetStateAction<VendorDefinition[]>>;
  owners: OwnerDefinition[];
  setOwners: React.Dispatch<React.SetStateAction<OwnerDefinition[]>>;
  statuses: StatusDefinition[];
  setStatuses: React.Dispatch<React.SetStateAction<StatusDefinition[]>>;
  sites: SiteDefinition[];
  setSites: React.Dispatch<React.SetStateAction<SiteDefinition[]>>;
  history: ActionLog[];
  cloudConfig: SupabaseConfig;
  setCloudConfig: React.Dispatch<React.SetStateAction<SupabaseConfig>>;
  isDirty: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  onSave: () => void;
  onClose: () => void;
  onExportData: () => void;
  onImportData: (data: any) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  buildingDefs, setBuildingDefs, rackDefs, setRackDefs, equipmentDefs, setEquipmentDefs, sites, setSites, cloudConfig, setCloudConfig, onClose, history, isDirty, onSave
}) => {
  const [activeTab, setActiveTab] = useState<'SITES' | 'BUILDINGS' | 'RACKS' | 'EQUIPMENT' | 'CLOUD' | 'LOGS'>('SITES');
  const [editingDef, setEditingDef] = useState<BuildingDefinition | null>(null);
  const [editingRack, setEditingRack] = useState<RackDefinition | null>(null);
  const [editingEq, setEditingEq] = useState<EquipmentDefinition | null>(null);

  const handleAddBuildingDef = () => {
    const newDef: BuildingDefinition = { id: `DEF-B-${Date.now()}`, name: 'New Building', width: 2400, depth: 1200, height: 1100, color: '#c2b280', roofColor: '#ffffff', svgPath: 'M -1200,-600 L 1200,-600 L 1200,600 L -1200,600 Z' };
    setBuildingDefs([...buildingDefs, newDef]);
    setEditingDef(newDef);
  };

  const handleAddRackDef = () => {
    const newRack: RackDefinition = { id: `DEF-R-${Date.now()}`, name: 'New Rack', totalU: 42, width: 600, depth: 1070, height: 2000, color: '#1e293b' };
    setRackDefs([...rackDefs, newRack]);
    setEditingRack(newRack);
  };

  const handleAddEqDef = () => {
    const newEq: EquipmentDefinition = { id: `DEF-E-${Date.now()}`, name: 'New Equipment', heightU: 1, depth: 750, powerWatts: 500, color: '#3b82f6', category: 'SERVER' };
    setEquipmentDefs([...equipmentDefs, newEq]);
    setEditingEq(newEq);
  };

  const inputClasses = "w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all";
  const labelClasses = "block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest";

  return (
    <div className="bg-white w-full max-w-[90vw] h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500 text-slate-950">
      <div className="bg-slate-950 px-10 py-6 text-white flex justify-between items-center shrink-0 border-b border-white/5">
        <div className="flex items-center gap-6">
            <img src={LOGO_URL} alt="Ambiflo" className="h-8 object-contain" />
            <div className="w-px h-6 bg-white/10" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Global Registry</span>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex bg-slate-800 p-1 rounded-xl">
                {(['SITES', 'BUILDINGS', 'RACKS', 'EQUIPMENT', 'CLOUD', 'LOGS'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-100'}`}>
                        {tab}
                    </button>
                ))}
            </div>
            {isDirty && (
                <button onClick={onSave} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 animate-pulse">
                    <Save size={14} /> Commit Changes
                </button>
            )}
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-all border border-white/10">
                <X size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 overflow-y-auto">
          {activeTab === 'BUILDINGS' && (
            <div className="p-4 space-y-2">
              <button onClick={handleAddBuildingDef} className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest mb-4 shadow-xl hover:bg-blue-500 transition-colors">
                <Plus size={16} /> New Building Def
              </button>
              {buildingDefs.map(def => (
                <button key={def.id} onClick={() => setEditingDef(def)} className={`w-full p-4 rounded-2xl border text-left transition-all ${editingDef?.id === def.id ? 'bg-white border-blue-500 shadow-xl ring-1 ring-blue-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}>
                  <span className={`text-[11px] font-black uppercase block ${editingDef?.id === def.id ? 'text-slate-950' : 'text-slate-600'}`}>{def.name}</span>
                </button>
              ))}
            </div>
          )}
          {activeTab === 'RACKS' && (
            <div className="p-4 space-y-2">
              <button onClick={handleAddRackDef} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest mb-4 hover:bg-slate-800 transition-colors">
                <Plus size={16} /> New Rack Def
              </button>
              {rackDefs.map(def => (
                <button key={def.id} onClick={() => setEditingRack(def)} className={`w-full p-4 rounded-2xl border text-left transition-all ${editingRack?.id === def.id ? 'bg-white border-blue-500 shadow-lg ring-1 ring-blue-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-black uppercase ${editingRack?.id === def.id ? 'text-slate-950' : 'text-slate-600'}`}>{def.name}</span>
                    <span className="text-[9px] font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700">{def.totalU}U</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {activeTab === 'EQUIPMENT' && (
            <div className="p-4 space-y-2">
              <button onClick={handleAddEqDef} className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest mb-4 hover:bg-emerald-500 transition-colors">
                <Plus size={16} /> New Hardware Def
              </button>
              {equipmentDefs.map(def => (
                <button key={def.id} onClick={() => setEditingEq(def)} className={`w-full p-4 rounded-2xl border text-left transition-all ${editingEq?.id === def.id ? 'bg-white border-emerald-500 shadow-lg ring-1 ring-emerald-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-black uppercase ${editingEq?.id === def.id ? 'text-slate-950' : 'text-slate-600'}`}>{def.name}</span>
                    <span className="text-[9px] font-bold bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">{def.heightU}U</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {activeTab === 'SITES' && (
             <div className="p-4 space-y-2">
                {sites.map(s => (
                   <div key={s.id} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-1">
                      <span className="block text-[11px] font-black uppercase text-slate-950 tracking-tight">{s.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono tracking-widest">{s.id} • {s.customerId}</span>
                   </div>
                ))}
             </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white overflow-y-auto p-12">
          {activeTab === 'RACKS' && editingRack ? (
            <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
               <div className="flex justify-between items-start">
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Rack Definition Controller</h2>
                  <button onClick={() => setRackDefs(prev => prev.filter(r => r.id !== editingRack.id))} className="text-red-600 text-[10px] font-black uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100">Purge Definition</button>
               </div>
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Model Name</label>
                      <input type="text" value={editingRack.name} onChange={e => setRackDefs(prev => prev.map(r => r.id === editingRack.id ? { ...r, name: e.target.value } : r))} className={inputClasses} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Total Capacity (U)</label>
                        <input type="number" value={editingRack.totalU} onChange={e => setRackDefs(prev => prev.map(r => r.id === editingRack.id ? { ...r, totalU: parseInt(e.target.value) } : r))} className={inputClasses} />
                      </div>
                      <div>
                        <label className={labelClasses}>Color Standard</label>
                        <input type="color" value={editingRack.color} onChange={e => setRackDefs(prev => prev.map(r => r.id === editingRack.id ? { ...r, color: e.target.value } : r))} className="w-full h-14 rounded-2xl cursor-pointer p-1 bg-slate-50 border border-slate-200" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-950 rounded-[40px] p-8 flex flex-col items-center justify-center text-slate-700 shadow-2xl">
                    <Server size={80} className="mb-4 text-blue-500/40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">RMU Visualization Placeholder</span>
                  </div>
               </div>
            </div>
          ) : activeTab === 'EQUIPMENT' && editingEq ? (
            <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
               <div className="flex justify-between items-start">
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Hardware Template Controller</h2>
                  <button onClick={() => setEquipmentDefs(prev => prev.filter(e => e.id !== editingEq.id))} className="text-red-600 text-[10px] font-black uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100">Purge Template</button>
               </div>
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Hardware Name</label>
                      <input type="text" value={editingEq.name} onChange={e => setEquipmentDefs(prev => prev.map(eq => eq.id === editingEq.id ? { ...eq, name: e.target.value } : eq))} className={inputClasses} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Form Factor (U)</label>
                        <input type="number" value={editingEq.heightU} onChange={e => setEquipmentDefs(prev => prev.map(eq => eq.id === editingEq.id ? { ...eq, heightU: parseInt(e.target.value) } : eq))} className={inputClasses} />
                      </div>
                      <div>
                        <label className={labelClasses}>Power Draw (W)</label>
                        <input type="number" value={editingEq.powerWatts} onChange={e => setEquipmentDefs(prev => prev.map(eq => eq.id === editingEq.id ? { ...eq, powerWatts: parseInt(e.target.value) } : eq))} className={inputClasses} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-950 rounded-[40px] p-8 flex flex-col items-center justify-center shadow-2xl">
                    <HardDrive size={80} className="mb-4 text-emerald-500/40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-800">Hardware BIM Proxy</span>
                  </div>
               </div>
            </div>
          ) : activeTab === 'BUILDINGS' && editingDef ? (
             <div className="max-w-6xl space-y-12 animate-in fade-in slide-in-from-right-10 duration-500">
                <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Building Definition Controller</h2>
                <div className="grid grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div>
                        <label className={labelClasses}>Architectural Name</label>
                        <input type="text" value={editingDef.name} onChange={e => setBuildingDefs(prev => prev.map(d => d.id === editingDef.id ? { ...d, name: e.target.value } : d))} className={inputClasses} />
                      </div>
                      <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-200">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Instance Statistics</span>
                         <div className="grid grid-cols-2 gap-4 text-slate-900">
                            <div className="flex flex-col">
                               <span className="text-xs text-slate-500">Width</span>
                               <span className="text-sm font-bold">{editingDef.width / 100}ft</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-xs text-slate-500">Depth</span>
                               <span className="text-sm font-bold">{editingDef.depth / 100}ft</span>
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="h-[500px] rounded-[48px] overflow-hidden border border-slate-100 shadow-2xl">
                    <DefinitionPreview3D definition={editingDef} />
                   </div>
                </div>
             </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 opacity-50">
                <Layout size={64} className="stroke-[1.5px]" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Select a registry item to manage</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
