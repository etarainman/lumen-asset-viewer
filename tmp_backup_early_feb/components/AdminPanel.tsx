
import React, { useState } from 'react';
import { BuildingDefinition, VendorDefinition, OwnerDefinition, StatusDefinition, ActionLog, SiteDefinition, SupabaseConfig, RackDefinition, EquipmentDefinition } from '../types';
import { Database, Cloud, History, X, Plus, Trash2, Box, Save, Layout, Layers, BoxSelect, Server, HardDrive, FileText, Image as ImageIcon, Upload, Search, ArrowUpDown, Filter, Power, Edit3, MoreHorizontal } from 'lucide-react';
import DraggableModal from './DraggableModal';
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
  buildingDefs, setBuildingDefs, rackDefs, setRackDefs, equipmentDefs, setEquipmentDefs, vendors, setVendors, sites, setSites, cloudConfig, setCloudConfig, onClose, history, isDirty, onSave
}) => {
  const [activeTab, setActiveTab] = useState<'SITES' | 'BUILDINGS' | 'RACKS' | 'EQUIPMENT' | 'VENDORS' | 'CLOUD' | 'LOGS'>('SITES');

  // Buffering states for deliberate saving
  const [bufferDef, setBufferDef] = useState<BuildingDefinition | null>(null);
  const [bufferRack, setBufferRack] = useState<RackDefinition | null>(null);
  const [bufferEq, setBufferEq] = useState<EquipmentDefinition | null>(null);
  const [bufferVendor, setBufferVendor] = useState<VendorDefinition | null>(null);
  const [bufferSite, setBufferSite] = useState<SiteDefinition | null>(null);

  // Equipment List State
  const [eqSearch, setEqSearch] = useState('');
  const [eqSort, setEqSort] = useState<{ field: 'NAME' | 'MANU' | 'CAT' | 'RU' | 'DEPTH' | 'MEDIA', direction: 'asc' | 'desc' }>({ field: 'NAME', direction: 'asc' });

  const handleSort = (field: 'NAME' | 'MANU' | 'CAT' | 'RU' | 'DEPTH' | 'MEDIA') => {
    setEqSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredEqDefs = equipmentDefs.filter(d =>
    d.name.toLowerCase().includes(eqSearch.toLowerCase()) ||
    (d.manufacturer || 'Generic').toLowerCase().includes(eqSearch.toLowerCase()) ||
    d.category.toLowerCase().includes(eqSearch.toLowerCase())
  ).sort((a, b) => {
    const dir = eqSort.direction === 'asc' ? 1 : -1;
    switch (eqSort.field) {
      case 'NAME': return a.name.localeCompare(b.name) * dir;
      case 'MANU': return (a.manufacturer || '').localeCompare(b.manufacturer || '') * dir;
      case 'CAT': return a.category.localeCompare(b.category) * dir;
      case 'RU': return (a.heightU - b.heightU) * dir;
      case 'DEPTH': return ((a.depth || 0) - (b.depth || 0)) * dir;
      case 'MEDIA':
        const aMedia = (a.datasheetUrl ? 1 : 0) + (a.photoUrl ? 1 : 0);
        const bMedia = (b.datasheetUrl ? 1 : 0) + (b.photoUrl ? 1 : 0);
        return (aMedia - bMedia) * dir;
      default: return 0;
    }
  });

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
    const newEq: EquipmentDefinition = { id: `DEF-E-${Date.now()}`, name: 'New Equipment', heightU: 1, depth: 2.5, powerWatts: 500, color: '#3b82f6', category: 'SERVER', manufacturer: '' };
    setBufferEq(newEq);
  };

  const handleApplyEqDef = () => {
    if (!bufferEq) return;

    // Validation: Require specific Vendor and Model
    const isNewName = bufferEq.name.toLowerCase().includes('new equipment');
    const isGenericManu = !bufferEq.manufacturer || bufferEq.manufacturer.toLowerCase().includes('generic');

    if (isNewName || isGenericManu) {
      alert("CRITICAL: You must specify a specific Vendor and Model Name for this equipment definition. 'New Equipment' or 'Generic' is not permitted.");
      return;
    }

    setEquipmentDefs(prev => {
      const exists = prev.find(e => e.id === bufferEq.id);
      if (exists) return prev.map(e => e.id === bufferEq.id ? bufferEq : e);
      return [...prev, bufferEq];
    });
    setBufferEq(null);
  };

  const handleAddSite = () => {
    const newSite: SiteDefinition = {
      id: `NEW-SITE-${Date.now()}`,
      customerId: 'UNK',
      name: 'New Site',
      lat: 0,
      lng: 0,
      digitizedStatus: 'Not Digitized'
    };
    setBufferSite(newSite);
  };

  const handleApplySite = () => {
    if (!bufferSite) return;
    setSites(prev => {
      const exists = prev.find(s => s.id === bufferSite.id);
      if (exists) return prev.map(s => s.id === bufferSite.id ? bufferSite : s);
      return [...prev, bufferSite];
    });
  };

  const handleAddVendor = () => {
    const newVendor: VendorDefinition = { id: `V_${Date.now()}`, name: 'New Vendor', color: '#64748b' };
    setBufferVendor(newVendor);
  };

  const handleApplyVendor = () => {
    if (!bufferVendor) return;

    // Check for name change to cascade updates to Equipment Definitions
    const oldVendor = vendors.find(v => v.id === bufferVendor.id);
    if (oldVendor && oldVendor.name !== bufferVendor.name) {
      const oldName = oldVendor.name;
      const newName = bufferVendor.name;

      // Cascade update to all equipment using this manufacturer name
      setEquipmentDefs(prevEq => prevEq.map(d =>
        d.manufacturer === oldName ? { ...d, manufacturer: newName } : d
      ));
    }

    setVendors(prev => {
      const exists = prev.find(v => v.id === bufferVendor.id);
      if (exists) return prev.map(v => v.id === bufferVendor.id ? bufferVendor : v);
      return [...prev, bufferVendor];
    });
    setBufferVendor(null);
  };

  const inputClasses = "w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner";
  const labelClasses = "block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest";

  return (
    <div className="bg-white w-full max-w-[90vw] h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500 text-slate-950">
      <div className="bg-slate-950 px-10 py-6 text-white flex justify-between items-center shrink-0 border-b border-white/5">
        <div className="flex items-center gap-6">
          <img src={LOGO_URL} alt="Ambiflo" className="h-8 object-contain" />
          <div className="w-px h-6 bg-white/10" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Admin Area</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-800 p-1 rounded-xl">
            {(['SITES', 'BUILDINGS', 'RACKS', 'EQUIPMENT', 'VENDORS', 'CLOUD', 'LOGS'] as const).map(tab => (
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
        {/* Sidebar - Hidden for Equipment to allow full width table */}
        {activeTab !== 'EQUIPMENT' && (
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
            {activeTab === 'VENDORS' && (
              <div className="p-4 space-y-2">
                <button onClick={handleAddVendor} className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest mb-4 shadow-xl hover:bg-emerald-500 transition-colors">
                  <Plus size={16} /> New Vendor
                </button>
                {vendors.map(v => (
                  <button key={v.id} onClick={() => setBufferVendor(v)} className={`w-full p-4 rounded-2xl border text-left transition-all ${bufferVendor?.id === v.id ? 'bg-white border-emerald-500 shadow-xl ring-1 ring-emerald-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color }} />
                      <span className={`text-[11px] font-black uppercase block ${bufferVendor?.id === v.id ? 'text-slate-950' : 'text-slate-600'}`}>{v.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {activeTab === 'SITES' && (
              <div className="p-4 space-y-2">
                <button onClick={handleAddSite} className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest mb-4 shadow-xl hover:bg-indigo-500 transition-colors">
                  <Plus size={16} /> New Site
                </button>
                {sites.map(s => (
                  <button key={s.id} onClick={() => setBufferSite(s)} className={`w-full p-4 rounded-2xl border text-left transition-all ${bufferSite?.id === s.id ? 'bg-white border-indigo-500 shadow-xl ring-1 ring-indigo-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}>
                    <span className={`block text-[11px] font-black uppercase tracking-tight ${bufferSite?.id === s.id ? 'text-slate-950' : 'text-slate-900'}`}>{s.name}</span>
                    <span className="text-[9px] text-slate-500 font-mono tracking-widest">{s.id} • {s.customerId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 bg-white overflow-y-auto p-12">
          {activeTab === 'VENDORS' && !bufferVendor && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <BoxSelect size={64} strokeWidth={1} className="mb-4 opacity-20" />
              <span className="text-xs font-black uppercase tracking-widest">Select a Vendor to Edit</span>
            </div>
          )}
          {activeTab === 'VENDORS' && bufferVendor && (
            <div className="max-w-2xl space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Vendor</h2>
                  <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Vendor Registry</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleApplyVendor} className="bg-emerald-600 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all">Apply Changes</button>
                  <button onClick={() => { setVendors(prev => prev.filter(v => v.id !== bufferVendor.id)); setBufferVendor(null); }} className="text-red-600 text-[10px] font-black uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100">Delete</button>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className={labelClasses}>Vendor Name</label>
                  <input type="text" value={bufferVendor.name} onChange={e => setBufferVendor({ ...bufferVendor, name: e.target.value })} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Color Tag</label>
                  <input type="color" value={bufferVendor.color} onChange={e => setBufferVendor({ ...bufferVendor, color: e.target.value })} className="w-full h-14 rounded-2xl cursor-pointer p-1 bg-slate-50 border border-slate-200 shadow-inner" />
                </div>
              </div>
            </div>
          )}
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
                      <label className={labelClasses}>Height (Inches)</label>
                      <input type="number" value={parseFloat((bufferRack.height * 12).toFixed(2))} onChange={e => {
                        const inches = parseFloat(e.target.value) || 0;
                        setBufferRack({ ...bufferRack, height: inches / 12 });
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

          ) : activeTab === 'EQUIPMENT' ? (
            <div className="h-full flex flex-col animate-in fade-in duration-500">
              {/* Header & Controls */}
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-3">
                    <Server className="text-emerald-600" /> Equipment
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest">Equipment Definitions</p>
                </div>
                <div className="flex gap-3">
                  <div className="relative group">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                      type="text"
                      value={eqSearch}
                      onChange={e => setEqSearch(e.target.value)}
                      placeholder="Search Catalog..."
                      className="bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 w-64 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <button onClick={handleAddEqDef} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all">
                    <Plus size={16} /> Add Equipment
                  </button>
                </div>
              </div>

              {/* Full Width Table */}
              <div className="flex-1 overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-emerald-600 transition-colors" onClick={() => handleSort('MANU')}>Vendor <ArrowUpDown size={10} className={`inline ml-1 ${eqSort.field === 'MANU' ? 'text-emerald-600' : 'text-slate-300'}`} /></th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-emerald-600 transition-colors" onClick={() => handleSort('NAME')}>Model Name <ArrowUpDown size={10} className={`inline ml-1 ${eqSort.field === 'NAME' ? 'text-emerald-600' : 'text-slate-300'}`} /></th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-emerald-600 transition-colors" onClick={() => handleSort('CAT')}>Category <ArrowUpDown size={10} className={`inline ml-1 ${eqSort.field === 'CAT' ? 'text-emerald-600' : 'text-slate-300'}`} /></th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 hover:text-emerald-600 transition-colors" onClick={() => handleSort('RU')}>Form Factor <ArrowUpDown size={10} className={`inline ml-1 ${eqSort.field === 'RU' ? 'text-emerald-600' : 'text-slate-300'}`} /></th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 hover:text-emerald-600 transition-colors" onClick={() => handleSort('DEPTH')}>Depth <ArrowUpDown size={10} className={`inline ml-1 ${eqSort.field === 'DEPTH' ? 'text-emerald-600' : 'text-slate-300'}`} /></th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-emerald-600 transition-colors" onClick={() => handleSort('MEDIA')}>Media <ArrowUpDown size={10} className={`inline ml-1 ${eqSort.field === 'MEDIA' ? 'text-emerald-600' : 'text-slate-300'}`} /></th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEqDefs.map(def => (
                        <tr key={def.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-200/50 px-2 py-1 rounded-md">{def.manufacturer || 'Generic'}</span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{def.name}</span>
                              <span className="text-[9px] font-mono text-slate-400">{def.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{def.category}</span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="text-xs font-black text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-lg border border-emerald-200/50">{def.heightU} RU</span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="text-xs font-bold text-slate-600">{(def.depth * 12).toFixed(1)}"</span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-3">
                              {/* PDF Icon */}
                              <div onClick={() => def.datasheetUrl && window.open(def.datasheetUrl, '_blank')} className={`cursor-pointer transition-transform hover:scale-110 ${def.datasheetUrl ? 'text-blue-500' : 'text-slate-200 opacity-50 cursor-not-allowed'}`}>
                                <FileText size={16} />
                              </div>
                              {/* Photo Icon */}
                              <div onClick={() => def.photoUrl && window.open(def.photoUrl, '_blank')} className={`cursor-pointer transition-transform hover:scale-110 ${def.photoUrl ? 'text-purple-500' : 'text-slate-200 opacity-50 cursor-not-allowed'}`}>
                                <ImageIcon size={16} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setBufferEq(def)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"><Edit3 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredEqDefs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center gap-3">
                              <Search size={32} className="opacity-20" />
                              <span className="text-xs font-bold uppercase tracking-widest">No matching equipment found</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit/Add Modal */}
              {bufferEq && (
                <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6">
                  <DraggableModal onClose={() => setBufferEq(null)}>
                    <div className="w-[800px] flex flex-col max-h-[90vh]">
                      <div className="flex items-center justify-between p-5 border-b border-white/5 bg-slate-900 shrink-0">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                          {bufferEq.id.includes('NEW') ? <Plus className="text-emerald-500" /> : <Edit3 className="text-blue-500" />}
                          {bufferEq.id.includes('NEW') ? 'Add Equipment' : 'Edit Equipment'}
                        </h3>
                        <button onClick={() => setBufferEq(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                      </div>

                      <div className="p-6 bg-slate-950 space-y-6">
                        {/* Top Row: Identification & Specs */}
                        <div className="grid grid-cols-2 gap-8">
                          {/* Col 1: Core ID */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Core Identification</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Vendor</label>
                                <select
                                  value={bufferEq.manufacturer || ''}
                                  onChange={e => setBufferEq({ ...bufferEq, manufacturer: e.target.value })}
                                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/50 appearance-none uppercase"
                                >
                                  <option value="">Select Vendor...</option>
                                  {[...vendors].sort((a, b) => a.name.localeCompare(b.name)).map(v => (
                                    <option key={v.id} value={v.name}>{v.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Model Name</label>
                                <input
                                  type="text"
                                  value={bufferEq.name}
                                  onChange={e => setBufferEq({ ...bufferEq, name: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                                  <select
                                    value={bufferEq.category}
                                    onChange={e => setBufferEq({ ...bufferEq, category: e.target.value as any })}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500/50 appearance-none uppercase"
                                  >
                                    <option value="SERVER">SERVER</option>
                                    <option value="NETWORK">NETWORK</option>
                                    <option value="STORAGE">STORAGE</option>
                                    <option value="PATCH_PANEL">PATCH_PANEL</option>
                                    <option value="UPS">UPS</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Unique ID</label>
                                  <input
                                    type="text"
                                    value={bufferEq.id}
                                    disabled
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-slate-500 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Specs */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Physical Specifications</h4>
                            <div className="grid grid-cols-2 gap-4 h-full">
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[140px]">
                                <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 block">Rack Units (U)</label>
                                <div className="flex items-center gap-3">
                                  <button onClick={() => setBufferEq(prev => prev ? ({ ...prev, heightU: Math.max(1, prev.heightU - 1) }) : null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-all">-</button>
                                  <span className="text-4xl font-black text-white">{bufferEq.heightU}</span>
                                  <button onClick={() => setBufferEq(prev => prev ? ({ ...prev, heightU: prev.heightU + 1 }) : null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-all">+</button>
                                </div>
                              </div>
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[140px]">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Depth (Inches)</label>
                                <div className="flex items-baseline gap-1">
                                  <input
                                    type="number"
                                    value={Math.round((bufferEq.depth || 0) * 12)}
                                    onChange={e => setBufferEq({ ...bufferEq, depth: (parseFloat(e.target.value) || 0) / 12 })}
                                    className="w-20 bg-transparent text-4xl font-black text-white outline-none border-b border-white/10 focus:border-emerald-500/50 pb-1 text-center transition-all"
                                  />
                                  <span className="text-xs font-bold text-slate-500">in</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Media */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Digital Assets</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <label className={`flex items-center gap-4 p-4 rounded-xl border border-dashed transition-all cursor-pointer group ${bufferEq.datasheetUrl ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                {bufferEq.datasheetUrl ? <FileText size={18} className="text-emerald-500" /> : <Upload size={18} className="text-slate-500 group-hover:text-white transition-colors" />}
                              </div>
                              <div className="flex-1">
                                <span className={`block text-[10px] font-black uppercase tracking-widest ${bufferEq.datasheetUrl ? 'text-emerald-400' : 'text-slate-400'}`}>{bufferEq.datasheetUrl ? 'Datasheet Attached' : 'Upload Datasheet (PDF)'}</span>
                                {bufferEq.datasheetUrl && <button onClick={(e) => { e.preventDefault(); setBufferEq({ ...bufferEq, datasheetUrl: undefined }); }} className="text-[9px] text-red-400 hover:text-white underline mt-1">Remove File</button>}
                              </div>
                              <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => { if (ev.target?.result) setBufferEq({ ...bufferEq, datasheetUrl: ev.target.result as string }); };
                                  reader.readAsDataURL(file);
                                }
                              }} />
                            </label>

                            <label className={`flex items-center gap-4 p-4 rounded-xl border border-dashed transition-all cursor-pointer group ${bufferEq.photoUrl ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                {bufferEq.photoUrl ? <ImageIcon size={18} className="text-emerald-500" /> : <Upload size={18} className="text-slate-500 group-hover:text-white transition-colors" />}
                              </div>
                              <div className="flex-1">
                                <span className={`block text-[10px] font-black uppercase tracking-widest ${bufferEq.photoUrl ? 'text-emerald-400' : 'text-slate-400'}`}>{bufferEq.photoUrl ? 'Photo Attached' : 'Upload Equipment Photo'}</span>
                                {bufferEq.photoUrl && <button onClick={(e) => { e.preventDefault(); setBufferEq({ ...bufferEq, photoUrl: undefined }); }} className="text-[9px] text-red-400 hover:text-white underline mt-1">Remove Image</button>}
                              </div>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => { if (ev.target?.result) setBufferEq({ ...bufferEq, photoUrl: ev.target.result as string }); };
                                  reader.readAsDataURL(file);
                                }
                              }} />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 border-t border-white/5 bg-slate-900 shrink-0 flex justify-between items-center">
                        <button onClick={() => { setEquipmentDefs(prev => prev.filter(e => e.id !== bufferEq.id)); setBufferEq(null); }} className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors">
                          <Trash2 size={14} /> Delete Entry
                        </button>
                        <div className="flex gap-3">
                          <button onClick={() => setBufferEq(null)} className="px-6 py-2 rounded-xl text-slate-400 font-bold text-xs hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider">Cancel</button>
                          <button onClick={handleApplyEqDef} className="px-8 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
                            <Save size={14} /> Save Definition
                          </button>
                        </div>
                      </div>
                    </div>
                  </DraggableModal>
                </div>
              )}
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
          ) : activeTab === 'SITES' && bufferSite ? (
            <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Site Registry</h2>
                  <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Global Location Management</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleApplySite} className="bg-indigo-600 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">Apply Changes</button>
                  <button onClick={() => setSites(prev => prev.filter(s => s.id !== bufferSite.id))} className="text-red-600 text-[10px] font-black uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100">Purge</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className={labelClasses}>Site Name</label>
                    <input type="text" value={bufferSite.name} onChange={e => setBufferSite({ ...bufferSite, name: e.target.value })} className={inputClasses} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Ambiflo Site ID</label>
                      <input type="text" value={bufferSite.id} onChange={e => setBufferSite({ ...bufferSite, id: e.target.value })} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Customer ID (CLLI)</label>
                      <input type="text" value={bufferSite.customerId} onChange={e => setBufferSite({ ...bufferSite, customerId: e.target.value })} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Latitude</label>
                      <input type="number" value={bufferSite.lat} onChange={e => setBufferSite({ ...bufferSite, lat: parseFloat(e.target.value) || 0 })} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Longitude</label>
                      <input type="number" value={bufferSite.lng} onChange={e => setBufferSite({ ...bufferSite, lng: parseFloat(e.target.value) || 0 })} className={inputClasses} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClasses}>Digitization Status</label>
                      <select
                        value={bufferSite.digitizedStatus}
                        onChange={e => setBufferSite({ ...bufferSite, digitizedStatus: e.target.value as any })}
                        className={inputClasses}
                      >
                        <option value="Not Digitized">Not Digitized</option>
                        <option value="Digitized">Digitized</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-indigo-950 rounded-[40px] p-8 flex flex-col items-center justify-center shadow-2xl">
                  <Cloud size={80} className="mb-4 text-indigo-500/40" />
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 block">Site Registry</span>
                    <span className="text-[9px] font-bold text-indigo-300 block">{bufferSite.id} • {bufferSite.customerId}</span>
                    <span className="text-[9px] font-bold text-indigo-300/50 block">{bufferSite.lat.toFixed(4)}, {bufferSite.lng.toFixed(4)}</span>
                  </div>
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
