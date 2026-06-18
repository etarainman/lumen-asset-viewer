
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

  // Buffering states for deliberate saving
  const [bufferDef, setBufferDef] = useState<BuildingDefinition | null>(null);
  const [bufferRack, setBufferRack] = useState<RackDefinition | null>(null);
  const [bufferEq, setBufferEq] = useState<EquipmentDefinition | null>(null);

  const handleAddBuildingDef = () => {
    const newDef: BuildingDefinition = {
      id: `DEF-B-${Date.now()}`,
      name: 'New Building',
      width: 24,
      depth: 12,
      height: 10,
      color: '#c2b280',
      roofColor: '#ffffff',
      svgPath: 'M -12,-6 L 12,-6 L 12,6 L -12,6 Z'
    };
    setBufferDef(newDef);
  };

  const handleApplyBuildingDef = () => {
    if (!bufferDef) return;
    // Calculate SVG path based on new dimensions (centered)
    const hw = bufferDef.width / 2;
    const hd = bufferDef.depth / 2;
    const newPath = `M -${hw},-${hd} L ${hw},-${hd} L ${hw},${hd} L -${hw},${hd} Z`;

    const updatedDef = { ...bufferDef, svgPath: newPath };

    setBuildingDefs(prev => {
      const exists = prev.find(d => d.id === updatedDef.id);
      if (exists) return prev.map(d => d.id === updatedDef.id ? updatedDef : d);
      return [...prev, updatedDef];
    });
    setBufferDef(updatedDef);
  };

  const handleAddRackDef = () => {
    const totalU = 42;
    const hFt = (totalU * 1.75 + 4) / 12;
    const newRack: RackDefinition = { id: `DEF-R-${Date.now()}`, name: 'New Rack', totalU, width: 2.0, depth: 3.0, height: hFt, color: '#1e293b' };
    setBufferRack(newRack);
  };

  const handleApplyRackDef = () => {
    if (!bufferRack) return;
    setRackDefs(prev => {
      const exists = prev.find(r => r.id === bufferRack.id);
      if (exists) return prev.map(r => r.id === bufferRack.id ? bufferRack : r);
      return [...prev, bufferRack];
    });
  };

  const handleAddEqDef = () => {
    const newEq: EquipmentDefinition = { id: `DEF-E-${Date.now()}`, name: 'New Equipment', heightU: 1, depth: 2.5, powerWatts: 500, color: '#3b82f6', category: 'SERVER' };
    setBufferEq(newEq);
  };

  const handleApplyEqDef = () => {
    if (!bufferEq) return;
    setEquipmentDefs(prev => {
      const exists = prev.find(e => e.id === bufferEq.id);
      if (exists) return prev.map(e => e.id === bufferEq.id ? bufferEq : e);
      return [...prev, bufferEq];
    });
  };

  const inputClasses = "w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner";
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
              <button key={tab} onClick={() => {
                setActiveTab(tab);
                // setBufferDef(null); setBufferRack(null); setBufferEq(null); 
              }} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-100'}`}>
                {tab}
              </button>
            ))}
          </div>
          {isDirty && (
            <button onClick={onSave} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 animate-pulse">
              <Save size={14} /> Commit Workspace
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
                <button key={def.id} onClick={() => setBufferDef(def)} className={`w-full p-4 rounded-2xl border text-left transition-all ${bufferDef?.id === def.id ? 'bg-white border-blue-500 shadow-xl ring-1 ring-blue-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}>
                  <span className={`text-[11px] font-black uppercase block ${bufferDef?.id === def.id ? 'text-slate-950' : 'text-slate-600'}`}>{def.name}</span>
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
                <button key={def.id} onClick={() => setBufferRack(def)} className={`w-full p-4 rounded-2xl border text-left transition-all ${bufferRack?.id === def.id ? 'bg-white border-blue-500 shadow-lg ring-1 ring-blue-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-black uppercase ${bufferRack?.id === def.id ? 'text-slate-950' : 'text-slate-600'}`}>{def.name}</span>
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
                <button key={def.id} onClick={() => setBufferEq(def)} className={`w-full p-4 rounded-2xl border text-left transition-all ${bufferEq?.id === def.id ? 'bg-white border-emerald-500 shadow-lg ring-1 ring-emerald-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-black uppercase ${bufferEq?.id === def.id ? 'text-slate-950' : 'text-slate-600'}`}>{def.name}</span>
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
          {activeTab === 'RACKS' && bufferRack ? (
            <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Rack Registry</h2>
                  <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Model & Dimension Configuration</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleApplyRackDef} className="bg-emerald-600 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all">Apply Changes</button>
                  <button onClick={() => setRackDefs(prev => prev.filter(r => r.id !== bufferRack.id))} className="text-red-600 text-[10px] font-black uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100">Purge</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className={labelClasses}>Model Name</label>
                    <input type="text" value={bufferRack.name} onChange={e => setBufferRack({ ...bufferRack, name: e.target.value })} className={inputClasses} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Width (Inches)</label>
                      <input type="number" value={Math.round((bufferRack.width || 0) * 12)} onChange={e => setBufferRack({ ...bufferRack, width: (parseFloat(e.target.value) || 0) / 12 })} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Depth (Inches)</label>
                      <input type="number" value={Math.round((bufferRack.depth || 0) * 12)} onChange={e => setBufferRack({ ...bufferRack, depth: (parseFloat(e.target.value) || 0) / 12 })} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Height (Total U)</label>
                      <input type="number" value={bufferRack.totalU} onChange={e => {
                        const u = parseInt(e.target.value) || 0;
                        // Derive height in feet: (U * 1.75" + 4" padding) / 12
                        const hFt = (u * 1.75 + 4) / 12;
                        setBufferRack({ ...bufferRack, totalU: u, height: hFt });
                      }} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Color Standard</label>
                      <input type="color" value={bufferRack.color} onChange={e => setBufferRack({ ...bufferRack, color: e.target.value })} className="w-full h-14 rounded-2xl cursor-pointer p-1 bg-slate-50 border border-slate-200 shadow-inner" />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-950 rounded-[40px] p-8 flex flex-col items-center justify-center text-slate-700 shadow-2xl">
                  <Server size={80} className="mb-4 text-blue-500/40" />
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block">Mechanical Stats</span>
                    <span className="text-[9px] font-bold text-slate-500 block">{(bufferRack.width * 12).toFixed(1)}"W x {(bufferRack.depth * 12).toFixed(1)}"D</span>
                    <span className="text-[9px] font-bold text-slate-500 block">{bufferRack.totalU}U ({bufferRack.height.toFixed(2)}ft)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'EQUIPMENT' && bufferEq ? (
            <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Hardware Catalog</h2>
                  <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Dimension & Power Specifications</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleApplyEqDef} className="bg-emerald-600 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all">Apply Changes</button>
                  <button onClick={() => setEquipmentDefs(prev => prev.filter(e => e.id !== bufferEq.id))} className="text-red-600 text-[10px] font-black uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100">Purge</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className={labelClasses}>Hardware Name</label>
                    <input type="text" value={bufferEq.name} onChange={e => setBufferEq({ ...bufferEq, name: e.target.value })} className={inputClasses} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Form Factor (U)</label>
                      <input type="number" value={bufferEq.heightU} onChange={e => setBufferEq({ ...bufferEq, heightU: parseInt(e.target.value) || 0 })} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Power Draw (W)</label>
                      <input type="number" value={bufferEq.powerWatts} onChange={e => setBufferEq({ ...bufferEq, powerWatts: parseInt(e.target.value) || 0 })} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Chassis Depth (Inches)</label>
                      <input type="number" value={Math.round((bufferEq.depth || 0) * 12)} onChange={e => setBufferEq({ ...bufferEq, depth: (parseFloat(e.target.value) || 0) / 12 })} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Category</label>
                      <select
                        value={bufferEq.category}
                        onChange={e => setBufferEq({ ...bufferEq, category: e.target.value as any })}
                        className={inputClasses}
                      >
                        <option value="SERVER">SERVER</option>
                        <option value="NETWORK">NETWORK</option>
                        <option value="STORAGE">STORAGE</option>
                        <option value="PATCH_PANEL">PATCH_PANEL</option>
                        <option value="UPS">UPS</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-950 rounded-[40px] p-8 flex flex-col items-center justify-center shadow-2xl">
                  <HardDrive size={80} className="mb-4 text-emerald-500/40" />
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-800 block">Form Factor Stats</span>
                    <span className="text-[9px] font-bold text-emerald-700 block">{bufferEq.heightU}U Chassis</span>
                    <span className="text-[9px] font-bold text-emerald-700 block">Depth: {(bufferEq.depth * 12).toFixed(1)}"</span>
                    <span className="text-[9px] font-bold text-emerald-700 block">{bufferEq.powerWatts} Watts Draw</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'BUILDINGS' && bufferDef ? (
            <div className="max-w-6xl space-y-12 animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Asset Architecture Builder</h2>
                  <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">3D Geometry & Blueprint Definition</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleApplyBuildingDef} className="bg-emerald-600 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all">Apply Changes</button>
                  <button onClick={() => setBuildingDefs(prev => prev.filter(d => d.id !== bufferDef.id))} className="text-red-600 text-[10px] font-black uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100">Purge</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <label className={labelClasses}>Architectural Name</label>
                    <input type="text" value={bufferDef.name} onChange={e => setBufferDef({ ...bufferDef, name: e.target.value })} className={inputClasses} />
                  </div>
                  <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-200 shadow-inner">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-6">Geometry Control (Feet)</span>
                    <div className="grid grid-cols-2 gap-8 text-slate-900">
                      <div>
                        <label className={labelClasses}>Width (Feet)</label>
                        <input type="number" value={bufferDef.width} onChange={e => setBufferDef({ ...bufferDef, width: parseFloat(e.target.value) || 0 })} className={inputClasses} />
                      </div>
                      <div>
                        <label className={labelClasses}>Depth (Feet)</label>
                        <input type="number" value={bufferDef.depth} onChange={e => setBufferDef({ ...bufferDef, depth: parseFloat(e.target.value) || 0 })} className={inputClasses} />
                      </div>
                      <div>
                        <label className={labelClasses}>Height (Feet)</label>
                        <input type="number" value={bufferDef.height} onChange={e => setBufferDef({ ...bufferDef, height: parseFloat(e.target.value) || 0 })} className={inputClasses} />
                      </div>
                      <div>
                        <label className={labelClasses}>Instance Color</label>
                        <input type="color" value={bufferDef.color} onChange={e => setBufferDef({ ...bufferDef, color: e.target.value })} className="w-full h-14 rounded-2xl cursor-pointer p-1 bg-white border border-slate-200" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-[500px] rounded-[48px] overflow-hidden border border-slate-100 shadow-2xl relative bg-slate-900">
                  <div className="absolute top-6 left-6 z-10 bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                    <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest">Real-time 3D Preview</span>
                  </div>
                  <DefinitionPreview3D definition={bufferDef} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 opacity-50">
              <BoxSelect size={64} className="stroke-[1.5px] text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Select a registry item to manage</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
