
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Settings, Save, Palette, Eye, Edit3, PenTool, ChevronRight, Home, Layout, Box, Layers,
  Type, List, Maximize, Map, SlidersHorizontal, ChevronUp, ChevronDown, Check, X, Plus, Cloud, Loader2
} from 'lucide-react';
import Viewer3D, { Viewer3DHandle } from './components/Viewer3D';
import SitePlanner2D from './components/SitePlanner2D';
import SiteMapView from './components/SiteMapView';
import EditBuildingCard from './components/EditBuildingCard';
import EditRackCard from './components/EditRackCard';
import EditPropertyCard from './components/EditPropertyCard';
import AdminPanel from './components/AdminPanel';
import ColorSettings from './components/ColorSettings';
import OmniSearch from './components/OmniSearch';
import InventoryPanel from './components/InventoryPanel';
import { INITIAL_BUILDING_DEFS, INITIAL_VENDORS, INITIAL_OWNERS, INITIAL_STATUSES, INITIAL_SITES, INITIAL_RACK_DEFS, INITIAL_EQUIPMENT_DEFS } from './constants';
import { AppMode, Building, ViewLevel, Status4D, ColorMode, ActionLog, BuildingDefinition, VendorDefinition, OwnerDefinition, StatusDefinition, SiteDefinition, SupabaseConfig, Rack, RackDefinition, EquipmentDefinition, Equipment } from './types';
import { initSupabase, saveToCloud, loadFromCloud } from './services/supabaseService';

const LOGO_URL = "https://ik.imagekit.io/gae3bdoli/ambiflo_full_white_clearance-256.png";
const WORKSPACE_KEY = 'AMBIFLO_WORKSPACE_STABLE_V1';

const PROVISIONED_CONFIG: SupabaseConfig = {
  url: 'https://kcuxcvegeyfymizkiodb.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXhjdmVnZXlmeW1pemtpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTk3MTcsImV4cCI6MjA4Mjk5NTcxN30.6Kym1Ww8McsWoZAoX3DBGuZ0q7MBXy6lNs0F5nwBQaY',
  workspaceId: 'LUMEN_BIM_PRODUCTION_V1'
};

const App: React.FC = () => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('MAP');
  const [activeSiteId, setActiveSiteId] = useState<string>('');
  const [mapFocusSiteId, setMapFocusSiteId] = useState<string | null>(null);
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('VIEW');
  const [colorMode, setColorMode] = useState<ColorMode>('STATUS');
  const [colorCodingEnabled, setColorCodingEnabled] = useState(true);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [shellOpacity, setShellOpacity] = useState(0.5);
  const [showLabels, setShowLabels] = useState(true);
  const [showInventory, setShowInventory] = useState(false);
  const [visibleStatuses, setVisibleStatuses] = useState<Status4D[]>(Object.values(Status4D));
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const [cloudConfig, setCloudConfig] = useState<SupabaseConfig>(PROVISIONED_CONFIG);
  const [cloudStatus, setCloudStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'SYNCED' | 'ERROR'>('DISCONNECTED');
  const [isDirty, setIsDirty] = useState(false);

  const [sites, setSites] = useState<SiteDefinition[]>([]);
  const [buildingDefs, setBuildingDefs] = useState<BuildingDefinition[]>([]);
  const [rackDefs, setRackDefs] = useState<RackDefinition[]>([]);
  const [equipmentDefs, setEquipmentDefs] = useState<EquipmentDefinition[]>([]);
  const [vendors, setVendors] = useState<VendorDefinition[]>([]);
  const [owners, setOwners] = useState<OwnerDefinition[]>([]);
  const [statuses, setStatuses] = useState<StatusDefinition[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [history, setHistory] = useState<ActionLog[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      let localSaved = localStorage.getItem(WORKSPACE_KEY);
      let initialData = localSaved ? JSON.parse(localSaved) : null;

      if (cloudConfig.url && cloudConfig.anonKey) {
        setCloudStatus('CONNECTING');
        initSupabase(cloudConfig);
        try {
          const cloudData = await loadFromCloud();
          if (cloudData) {
            initialData = cloudData;
            setCloudStatus('SYNCED');
          } else { setCloudStatus('ERROR'); }
        } catch (e) { setCloudStatus('ERROR'); }
      }

      const MM_TO_FT = 1 / 304.8;
      const migrateValue = (v: number, threshold: number) => (v > threshold ? v * MM_TO_FT : v);

      if (initialData) {
        console.log('Hydrating from data...', {
          hasBuildings: !!initialData.buildings,
          rackDefCount: initialData.rackDefs?.length,
          buildingDefCount: initialData.buildingDefs?.length
        });

        if (initialData.sites) setSites(initialData.sites);

        if (initialData.buildingDefs) {
          let migrationCount = 0;
          const migratedDefs = initialData.buildingDefs.map((d: any) => {
            const newDef = {
              ...d,
              width: migrateValue(d.width, 100),
              depth: migrateValue(d.depth, 100),
              height: migrateValue(d.height, 100),
              svgPath: (d.width > 100 && d.svgPath)
                ? d.svgPath.replace(/(-?\d+\.?\d*)/g, (match: string) => (parseFloat(match) * MM_TO_FT).toFixed(2))
                : d.svgPath
            };
            if (newDef.width !== d.width || newDef.depth !== d.depth || newDef.height !== d.height) {
              migrationCount++;
            }
            return newDef;
          });
          if (migrationCount > 0) console.log(`Migrated ${migrationCount} building definitions.`);
          setBuildingDefs(migratedDefs);
        } else {
          setBuildingDefs(INITIAL_BUILDING_DEFS);
        }

        if (initialData.rackDefs) {
          let migrationCount = 0;
          const migratedDefs = initialData.rackDefs.map((d: any) => {
            const newDef = {
              ...d,
              width: migrateValue(d.width, 20),
              depth: migrateValue(d.depth, 20),
              height: migrateValue(d.height, 20),
              totalU: d.totalU || 42
            };
            if (newDef.width !== d.width || newDef.depth !== d.depth || newDef.height !== d.height) {
              migrationCount++;
            }
            return newDef;
          });
          if (migrationCount > 0) console.log(`Migrated ${migrationCount} rack definitions.`);
          setRackDefs(migratedDefs);
        } else {
          setRackDefs(INITIAL_RACK_DEFS);
        }

        if (initialData.equipmentDefs) {
          let migrationCount = 0;
          const migratedDefs = initialData.equipmentDefs.map((d: any) => {
            const newDef = {
              ...d,
              depth: migrateValue(d.depth, 10),
            };
            if (newDef.depth !== d.depth) {
              migrationCount++;
            }
            return newDef;
          });
          if (migrationCount > 0) console.log(`Migrated ${migrationCount} equipment definitions.`);
          setEquipmentDefs(migratedDefs);
        } else {
          setEquipmentDefs(INITIAL_EQUIPMENT_DEFS);
        }

        if (initialData.vendors) setVendors(initialData.vendors);
        if (initialData.owners) setOwners(initialData.owners);
        if (initialData.statuses) setStatuses(initialData.statuses);

        if (initialData.buildings) {
          let buildingMigrationCount = 0;
          let rackMigrationCount = 0;
          const migratedBuildings = initialData.buildings.map((b: any) => {
            const newBuilding = {
              ...b,
              x: Math.abs(b.x) > 500 ? b.x * MM_TO_FT : b.x,
              z: Math.abs(b.z) > 500 ? b.z * MM_TO_FT : b.z,
              racks: (b.racks || []).map((r: any) => {
                const newRack = {
                  ...r,
                  definitionId: r.definitionId || 'RACK_42U', // Ensure definition exists
                  x: Math.abs(r.x) > 100 ? r.x * MM_TO_FT : r.x,
                  y: Math.abs(r.y) > 100 ? r.y * MM_TO_FT : r.y,
                };
                if (newRack.x !== r.x || newRack.y !== r.y) {
                  rackMigrationCount++;
                }
                return newRack;
              })
            };
            if (newBuilding.x !== b.x || newBuilding.z !== b.z) {
              buildingMigrationCount++;
            }
            return newBuilding;
          });
          if (buildingMigrationCount > 0) console.log(`Migrated ${buildingMigrationCount} building coordinates.`);
          if (rackMigrationCount > 0) console.log(`Migrated ${rackMigrationCount} rack coordinates.`);
          setBuildings(migratedBuildings);
        }
        if (initialData.history) setHistory(initialData.history);
        if (initialData.activeSiteId) setActiveSiteId(initialData.activeSiteId);
      } else {
        setSites(INITIAL_SITES);
        setBuildingDefs(INITIAL_BUILDING_DEFS);
        setRackDefs(INITIAL_RACK_DEFS);
        setEquipmentDefs(INITIAL_EQUIPMENT_DEFS);
        setVendors(INITIAL_VENDORS);
        setOwners(INITIAL_OWNERS);
        setStatuses(INITIAL_STATUSES);
        setActiveSiteId(INITIAL_SITES[0].id);
      }
      setHasInitialized(true);
    };
    hydrate();
  }, [cloudConfig]);

  const handleSaveToCloud = async () => {
    setCloudStatus('CONNECTING');
    const workspace = { sites, buildingDefs, rackDefs, equipmentDefs, vendors, owners, statuses, buildings, history, activeSiteId };
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
    const success = await saveToCloud(workspace);
    setCloudStatus(success ? 'SYNCED' : 'ERROR');
    if (success) setIsDirty(false);
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const viewerRef = useRef<Viewer3DHandle>(null);

  const activeSite = useMemo(() => sites.find(s => s.id === activeSiteId) || sites[0] || INITIAL_SITES[0], [sites, activeSiteId]);
  const siteBuildings = useMemo(() => buildings.filter(b => b.siteId === activeSiteId), [buildings, activeSiteId]);
  const activeBuilding = useMemo(() => buildings.find(b => b.id === activeBuildingId) || null, [buildings, activeBuildingId]);
  const selectedBuilding = useMemo(() => buildings.find(b => b.id === selectedBuildingId) || null, [buildings, selectedBuildingId]);

  const handleOpenSiteFromMap = (id: string) => {
    setActiveSiteId(id);
    setViewLevel('SITE');
    setSelectedBuildingId(null);
    setMapFocusSiteId(null);
  };

  const handleFocusSiteOnMap = (id: string) => {
    setViewLevel('MAP');
    setMapFocusSiteId(id);
  };

  const handleEnterBuilding = useCallback((id: string) => {
    setActiveBuildingId(id);
    setViewLevel('BUILDING');
    setSelectedBuildingId(id);
    if (appMode === 'ADMIN') setAppMode('VIEW');
  }, [appMode]);

  const handleUpdateBuilding = (id: string, up: Partial<Building>) => {
    setBuildings(prev => prev.map(b => b.id === id ? { ...b, ...up } : b));
    setIsDirty(true);
  };

  const handleDeleteBuilding = (id: string) => {
    setBuildings(prev => prev.filter(x => x.id !== id));
    setSelectedBuildingId(null);
    setIsDirty(true);
  };

  const handleAddBuildingAt = (x: number, y: number, defId: string) => {
    const newId = `B-${Date.now()}`;
    const newBuilding: Building = {
      id: newId, siteId: activeSiteId, name: 'New Unit', label: (siteBuildings.length + 1).toString().padStart(4, '0'), definitionId: defId, lat: 0, lng: 0, x, z: y, auditStatus: 0, status: appMode === 'EDIT' ? Status4D.RETAIN : Status4D.PROPOSED, ownerId: owners[0]?.id || 'OWN_LUMEN', racks: [], equipment: []
    };
    setBuildings([...buildings, newBuilding]);
    setSelectedBuildingId(newId);
    setIsDirty(true);
  };

  const handleAddRack = useCallback(() => {
    if (!activeBuildingId || !activeBuilding) return;

    // Create incremental TEMP-00X ID per instructions
    const rackCount = activeBuilding.racks.length + 1;
    const rackId = `TEMP-${rackCount.toString().padStart(3, '0')}`;

    // Use consistent 3-digit Granite standard padding
    const lineUp = "001";
    const bayNo = rackCount.toString().padStart(3, '0');
    const label = `${lineUp}.${bayNo}`;

    const newRack: Rack = {
      id: rackId,
      definitionId: 'RACK_42U',
      label: label, // Show 001.001 format
      lineUp,
      bayNo,
      floor: "001",
      suite: "000",
      location: `${activeSite.id}.001.${activeBuilding.label}.000.${lineUp}.${bayNo}`,
      x: activeBuilding.racks.length * 4 - 6,
      y: 0,
      status: appMode === 'EDIT' ? Status4D.RETAIN : Status4D.PROPOSED,
      ownerId: owners[0]?.id || 'OWN_LUMEN'
    };
    const newRacks = [...activeBuilding.racks, newRack];
    handleUpdateBuilding(activeBuildingId, { racks: newRacks });
    setSelectedRackId(rackId);
  }, [activeBuildingId, activeBuilding, owners, activeSite, appMode]);

  const handleAddEquipment = useCallback((rackId: string, defId: string, uPos: number) => {
    if (!activeBuildingId || !activeBuilding) return;
    const eqId = `E-${Date.now()}`;
    const newEq: Equipment = {
      id: eqId,
      definitionId: defId,
      name: `NEW ${defId}`,
      rackId: rackId,
      baseRMU: uPos,
      status: appMode === 'EDIT' ? Status4D.RETAIN : Status4D.PROPOSED,
      ownerId: owners[0]?.id || 'OWN_LUMEN',
      vendorId: vendors[0]?.id || 'V_CISCO'
    };
    const newEqs = [...activeBuilding.equipment, newEq];
    handleUpdateBuilding(activeBuildingId, { equipment: newEqs });
    setSelectedId(eqId);
  }, [activeBuildingId, activeBuilding, owners, vendors, appMode]);

  const toggleLayer = (status: Status4D) => {
    setVisibleStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleExportData = () => {
    const workspace = { sites, buildingDefs, rackDefs, equipmentDefs, vendors, owners, statuses, buildings, history, activeSiteId };
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ambiflo_backup.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectRack = useCallback((id: string | null) => {
    setSelectedRackId(id);
    if (id) setSelectedId(null);
  }, []);

  const handleSelectEquipment = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setSelectedRackId(null);
  }, []);

  // Handle rack ID updates (cascading to equipment)
  const handleUpdateRackId = (oldId: string, newId: string) => {
    if (!activeBuildingId || !activeBuilding) return;
    const newRacks = activeBuilding.racks.map(r => r.id === oldId ? { ...r, id: newId } : r);
    const newEqs = activeBuilding.equipment.map(e => e.rackId === oldId ? { ...e, rackId: newId } : e);
    handleUpdateBuilding(activeBuildingId, { racks: newRacks, equipment: newEqs });
    setSelectedRackId(newId);
  };

  if (!hasInitialized) return null;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {appMode !== 'ADMIN' && (
        <header className="h-16 glass-panel border-b border-white/5 flex items-center justify-between px-8 z-[100]">
          <div className="flex items-center gap-6 shrink-0">
            <button onClick={() => { setViewLevel('MAP'); setActiveBuildingId(null); setSelectedBuildingId(null); setAppMode('VIEW'); }} title="Return to Main Map" className="h-8 flex items-center hover:opacity-80 transition-opacity">
              <img src={LOGO_URL} alt="Ambiflo" className="h-full object-contain" />
            </button>
            {viewLevel !== 'MAP' && (
              <div className="hidden lg:flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 animate-in fade-in slide-in-from-left duration-500">
                <div className="flex items-center gap-2 text-slate-400 group cursor-pointer hover:text-white transition-colors" onClick={() => { setViewLevel('MAP'); setActiveBuildingId(null); }}>
                  <Home size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Global</span>
                </div>
                <ChevronRight size={10} className="text-slate-600" />
                <div className="flex items-center gap-2 text-slate-300 group cursor-pointer hover:text-white transition-colors" onClick={() => { setViewLevel('SITE'); setActiveBuildingId(null); }}>
                  <Layout size={12} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{activeSite.name}</span>
                </div>
                {viewLevel === 'BUILDING' && activeBuilding && (
                  <>
                    <ChevronRight size={10} className="text-slate-600" />
                    <div className="flex items-center gap-2 text-white">
                      <span className="px-2 py-0.5 bg-blue-600 rounded text-[9px] font-black uppercase">{activeBuilding.label.padStart(4, '0')}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {viewLevel === 'MAP' && (
            <div className="flex-1 max-w-sm mx-4">
              <OmniSearch sites={sites} onSelectSite={handleFocusSiteOnMap} />
            </div>
          )}
          {viewLevel !== 'MAP' && (
            <div className="flex items-center bg-slate-900/60 p-1 rounded-2xl border border-white/5">
              {[
                { id: 'VIEW', icon: Eye, label: 'View' },
                { id: 'EDIT', icon: Edit3, label: 'Edit' },
                { id: 'DESIGN', icon: PenTool, label: 'Design' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setAppMode(mode.id as AppMode)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${appMode === mode.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <mode.icon size={14} />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                onClick={handleSaveToCloud}
                disabled={cloudStatus === 'CONNECTING'}
                className={`px-6 py-2.5 rounded-xl border transition-all flex items-center gap-2 shadow-xl animate-pulse
                    ${cloudStatus === 'CONNECTING' ? 'bg-slate-800 border-white/10 text-slate-500' : 'bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500'}
                  `}
                title="Unsaved Changes Detected"
              >
                {cloudStatus === 'CONNECTING' ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {cloudStatus === 'CONNECTING' ? 'Syncing...' : 'Sync to Cloud'}
                </span>
              </button>
            )}
            {!isDirty && cloudStatus === 'SYNCED' && (
              <div className="px-6 py-2.5 rounded-xl bg-slate-900/60 text-emerald-500 border border-emerald-500/20 flex items-center gap-2">
                <Check size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Synced</span>
              </div>
            )}
            <button onClick={() => setShowInventory(!showInventory)} className={`px-6 py-2.5 rounded-xl border border-white/10 transition-all flex items-center gap-2 ${showInventory ? 'bg-blue-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white'}`}>
              <List size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Show Inventory</span>
            </button>
            <button onClick={() => { setViewLevel('MAP'); setActiveBuildingId(null); setSelectedBuildingId(null); }} className="px-6 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white flex items-center gap-2">
              <Map size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to map</span>
            </button>
            <button onClick={() => setAppMode('ADMIN')} className="p-2.5 rounded-xl border border-white/5 bg-slate-900/60 text-slate-500 hover:text-white transition-all">
              <Settings size={18} />
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 relative bg-slate-900 overflow-hidden">
        {appMode === 'ADMIN' && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8">
            <AdminPanel
              buildingDefs={buildingDefs}
              setBuildingDefs={(val) => { setBuildingDefs(val); setIsDirty(true); }}
              rackDefs={rackDefs}
              setRackDefs={(val) => { setRackDefs(val); setIsDirty(true); }}
              equipmentDefs={equipmentDefs}
              setEquipmentDefs={(val) => { setEquipmentDefs(val); setIsDirty(true); }}
              vendors={vendors} setVendors={setVendors}
              owners={owners} setOwners={setOwners}
              statuses={statuses} setStatuses={setStatuses}
              sites={sites} setSites={setSites}
              history={history}
              cloudConfig={cloudConfig}
              setCloudConfig={setCloudConfig}
              isDirty={isDirty}
              isSaving={cloudStatus === 'CONNECTING'}
              saveSuccess={cloudStatus === 'SYNCED'}
              onSave={handleSaveToCloud}
              onClose={() => setAppMode('VIEW')}
              onExportData={handleExportData}
              onImportData={(data) => { setSites(data.sites); setBuildings(data.buildings); setIsDirty(true); }}
            />
          </div>
        )}

        {viewLevel === 'MAP' ? <SiteMapView sites={sites} onOpenSite={handleOpenSiteFromMap} focusSiteId={mapFocusSiteId} /> :
          viewLevel === 'SITE' ? <SitePlanner2D buildings={siteBuildings} buildingDefs={buildingDefs} selectedBuildingId={selectedBuildingId} appMode={appMode} colorMode={colorMode} colorCodingEnabled={colorCodingEnabled} onSelectBuilding={setSelectedBuildingId} onUpdateBuilding={handleUpdateBuilding} onAddBuilding={handleAddBuildingAt} statuses={statuses} owners={owners} isDirty={isDirty} isSaving={cloudStatus === 'CONNECTING'} saveSuccess={cloudStatus === 'SYNCED'} onSave={handleSaveToCloud} onDeleteBuilding={handleDeleteBuilding} onEnterBuilding={handleEnterBuilding} showLabels={showLabels} /> :
            <Viewer3D
              ref={viewerRef}
              viewLevel={viewLevel}
              buildings={siteBuildings}
              buildingDefs={buildingDefs}
              activeBuildingId={activeBuildingId}
              selectedRackId={selectedRackId}
              selectedEquipmentId={selectedId}
              shellOpacity={shellOpacity}
              statuses={statuses}
              owners={owners}
              colorMode={colorMode}
              colorCodingEnabled={colorCodingEnabled}
              rackDefs={rackDefs}
              equipmentDefs={equipmentDefs}
              showLabels={showLabels}
              visibleStatuses={visibleStatuses}
              onSelectRack={handleSelectRack}
              onSelectEquipment={handleSelectEquipment}
            />}

        {viewLevel === 'BUILDING' && (
          <div className="absolute top-6 right-8 flex flex-col items-end gap-4 z-[200]">
            <div className="flex items-center bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-2xl">
              <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                {[
                  { id: '3D', label: '3D', icon: Box },
                  { id: 'PLAN', label: 'PLAN', icon: Layout },
                  { id: 'ELEVATION', label: 'Elevation', icon: Maximize }
                ].map(cam => (
                  <button
                    key={cam.id}
                    onClick={() => viewerRef.current?.setCameraPreset(cam.id as any)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                  >
                    <cam.icon size={14} /> {cam.label}
                  </button>
                ))}
              </div>

              {(appMode === 'EDIT' || appMode === 'DESIGN') && (
                <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                  <button
                    onClick={handleAddRack}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Plus size={14} /> Add Rack
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 px-4 border-r border-white/10 mr-2">
                <SlidersHorizontal size={14} className="text-slate-500" />
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={shellOpacity}
                  onChange={(e) => setShellOpacity(parseFloat(e.target.value))}
                  className="w-24 accent-blue-600 opacity-70 hover:opacity-100 transition-opacity"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`p-2.5 rounded-xl transition-all ${showLabels ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Toggle Labels"
                >
                  <Type size={20} />
                </button>
                <button
                  onClick={() => setShowColorSettings(!showColorSettings)}
                  className={`p-2.5 rounded-xl transition-all ${showColorSettings ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Asset Coloring"
                >
                  <Palette size={20} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowLayerMenu(!showLayerMenu)}
                    className={`p-2.5 rounded-xl transition-all ${showLayerMenu ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                    title="4D Layers"
                  >
                    <Layers size={20} />
                  </button>
                  {showLayerMenu && (
                    <div className="absolute top-full right-0 mt-3 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2 px-1">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">4D Status Filters</span>
                        <X size={14} className="cursor-pointer text-slate-500 hover:text-white" onClick={() => setShowLayerMenu(false)} />
                      </div>
                      <div className="space-y-1">
                        {statuses.map(s => (
                          <button
                            key={s.id}
                            onClick={() => toggleLayer(s.id as Status4D)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-all group"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="text-[10px] font-bold text-slate-400 group-hover:text-white uppercase whitespace-nowrap tracking-tight">{s.label}</span>
                            </div>
                            {visibleStatuses.includes(s.id as Status4D) && <Check size={14} className="text-blue-500 shrink-0 ml-2" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none z-[300]">
          {showColorSettings && (
            <div className="absolute top-20 right-8 w-72 pointer-events-auto z-[200]">
              <ColorSettings activeMode={colorMode} enabled={colorCodingEnabled} onToggleEnabled={setColorCodingEnabled} onModeChange={setColorMode} onClose={() => setShowColorSettings(false)} statuses={statuses} owners={owners} />
            </div>
          )}
          {selectedBuildingId !== null && viewLevel === 'SITE' && (
            <div className="pointer-events-auto">
              <EditBuildingCard building={selectedBuilding!} buildingDefs={buildingDefs} onUpdate={handleUpdateBuilding} onEnter={handleEnterBuilding} onClose={() => setSelectedBuildingId(null)} mode={appMode} onDelete={handleDeleteBuilding} statuses={statuses} owners={owners} />
            </div>
          )}
          {selectedRackId !== null && viewLevel === 'BUILDING' && activeBuilding && (
            <div className="pointer-events-auto">
              {(() => {
                const rack = activeBuilding.racks.find(r => r.id === selectedRackId);
                if (!rack) return null;
                return (
                  <EditRackCard rack={rack} rackDefs={rackDefs} equipmentDefs={equipmentDefs} owners={owners} statuses={statuses}
                    onUpdateId={(oldId, newId) => handleUpdateRackId(oldId, newId)}
                    onUpdate={(id, up) => { const newRacks = activeBuilding.racks.map(r => r.id === id ? { ...r, ...up } : r); handleUpdateBuilding(activeBuilding.id, { racks: newRacks }); }}
                    onMove={(dir) => {
                      const step = 0.5;
                      const rot = rack.rotation || 0;
                      let dx = 0;
                      let dy = 0;

                      if (dir === 'F') { // Forward (towards arrow)
                        dx = step * Math.sin(rot);
                        dy = step * Math.cos(rot);
                      } else if (dir === 'B') { // Backward
                        dx = -step * Math.sin(rot);
                        dy = -step * Math.cos(rot);
                      } else if (dir === 'L') { // Left
                        dx = step * Math.cos(rot);
                        dy = -step * Math.sin(rot);
                      } else if (dir === 'R') { // Right
                        dx = -step * Math.cos(rot);
                        dy = step * Math.sin(rot);
                      }

                      const newRacks = activeBuilding.racks.map(r =>
                        r.id === selectedRackId ? { ...r, x: r.x + dx, y: r.y + dy } : r
                      );
                      handleUpdateBuilding(activeBuilding.id, { racks: newRacks });
                    }}
                    onClose={() => setSelectedRackId(null)}
                    mode={appMode}
                    onDelete={(id) => { const newRacks = activeBuilding.racks.filter(r => r.id !== id); handleUpdateBuilding(activeBuilding.id, { racks: newRacks }); setSelectedRackId(null); }}
                    onAddHardware={(defId, uPos) => handleAddEquipment(rack.id, defId, uPos)} />
                );
              })()}
            </div>
          )}
          {selectedId !== null && viewLevel === 'BUILDING' && activeBuilding && (
            <div className="pointer-events-auto">
              {(() => {
                const eq = activeBuilding.equipment.find(e => e.id === selectedId);
                if (!eq) return null;
                return (
                  <EditPropertyCard item={eq} equipmentDefs={equipmentDefs} racks={activeBuilding.racks} vendors={vendors} owners={owners} statuses={statuses} onUpdate={(id, up) => { const newEq = activeBuilding.equipment.map(e => e.id === id ? { ...e, ...up } : e); handleUpdateBuilding(activeBuilding.id, { equipment: newEq }); }} onClose={() => setSelectedId(null)} mode={appMode} onDelete={(id) => { const newEq = activeBuilding.equipment.filter(e => e.id !== id); handleUpdateBuilding(activeBuilding.id, { equipment: newEq }); setSelectedId(null); }} />
                );
              })()}
            </div>
          )}
        </div>

        {showInventory && activeBuilding && (
          <InventoryPanel
            isOpen={showInventory}
            onToggle={() => setShowInventory(false)}
            height={400}
            equipment={activeBuilding.equipment}
            racks={activeBuilding.racks}
            proInventory={[]}
            onSelect={(type, id) => {
              if (type === 'RACK') setSelectedRackId(id);
              else setSelectedId(id);
            }}
            onLink={() => { }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
