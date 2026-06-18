
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Settings, Save, Palette, Eye, Edit3, PenTool, ChevronRight, Home, Layout, Box, Layers, AlignLeft,
  Type, List, Maximize, Maximize2, Map as MapIcon, SlidersHorizontal, ChevronUp, ChevronDown, Check, X, Plus, Cloud, Loader2, Hash, Grid, FileText, AlertCircle, Video
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
import AlertsPanel, { Alert } from './components/AlertsPanel';
import LeaveConfirmationModal from './components/LeaveConfirmationModal';
import { InventoryReconciliationModal } from './components/InventoryReconciliationModal';
import { INITIAL_BUILDING_DEFS, INITIAL_VENDORS, INITIAL_OWNERS, INITIAL_STATUSES, INITIAL_SITES, INITIAL_RACK_DEFS, INITIAL_EQUIPMENT_DEFS } from './constants';
import { AppMode, Building, ViewLevel, Status4D, ColorMode, ActionLog, BuildingDefinition, VendorDefinition, OwnerDefinition, StatusDefinition, SiteDefinition, SupabaseConfig, Rack, RackDefinition, EquipmentDefinition, Equipment, ProInventoryItem } from './types';
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
  const [showRackLabels, setShowRackLabels] = useState(true);
  const [showRMULabels, setShowRMULabels] = useState(false);
  const [showRoof, setShowRoof] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<'3D' | 'PLAN' | 'ELEVATION'>('3D');
  const [selectedLineup, setSelectedLineup] = useState('001');
  const [visibleStatuses, setVisibleStatuses] = useState<Status4D[]>(Object.values(Status4D));
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showLineUpMenu, setShowLineUpMenu] = useState(false);
  const [hiddenLineUps, setHiddenLineUps] = useState<Set<string>>(new Set());

  const [cloudConfig, setCloudConfig] = useState<SupabaseConfig>(PROVISIONED_CONFIG);
  const [cloudStatus, setCloudStatus] = useState<'IDLE' | 'CONNECTING' | 'SYNCED' | 'ERROR'>('IDLE');
  const [isDirty, setIsDirty] = useState(false);

  // New state for navigation interception
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const [sites, setSites] = useState<SiteDefinition[]>([]);
  const [buildingDefs, setBuildingDefs] = useState<BuildingDefinition[]>([]);
  const [rackDefs, setRackDefs] = useState<RackDefinition[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);



  const [equipmentDefs, setEquipmentDefs] = useState<EquipmentDefinition[]>([]);
  const [vendors, setVendors] = useState<VendorDefinition[]>([]);
  const [owners, setOwners] = useState<OwnerDefinition[]>(INITIAL_OWNERS);
  const [statuses, setStatuses] = useState<StatusDefinition[]>(INITIAL_STATUSES);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [history, setHistory] = useState<ActionLog[]>([]);
  const [proInventory, setProInventory] = useState<ProInventoryItem[]>([]);
  const [inventoryHeight, setInventoryHeight] = useState(400);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [showBuildingProperties, setShowBuildingProperties] = useState(false);
  const [showSuites, setShowSuites] = useState(true);
  const [showEqLabels, setShowEqLabels] = useState(true);
  const [showVirtualTours, setShowVirtualTours] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);



  // Helper to intercept navigation
  const navigateWithCheck = (action: () => void) => {
    if (isDirty) {
      setPendingNavigation(() => action);
      setShowLeaveModal(true);
    } else {
      action();
    }
  };

  // BeforeUnload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for some browsers
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
  // Force-standardize Stakeholder colors on mount to ensure Yellow/Pink standard
  useEffect(() => {
    setOwners(prev => {
      let changed = false;
      const updated = prev.map(o => {
        if ((o.id === 'OWN_LUMEN' || o.id === 'LUMEN') && o.color !== '#FFFF00') {
          changed = true;
          return { ...o, color: '#FFFF00' };
        }
        if ((o.id === 'OWN_CUSTOMER' || o.id === 'CUSTOMER') && o.color !== '#FF00FF') {
          changed = true;
          return { ...o, color: '#FF00FF' };
        }
        return o;
      });
      return changed ? updated : prev;
    });
  }, []);

  const loadWorkspace = useCallback(async () => {
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
          setTimeout(() => setCloudStatus('IDLE'), 2000);
        } else {
          // Not an error - just means the cloud record doesn't exist yet
          setCloudStatus('IDLE');
        }
      } catch (e) {
        console.error('Initial cloud load failed:', e);
        // On startup, we don't want to alarm the user with a bright red Error badge
        // if they just have a bad connection or the project has changed.
        setCloudStatus('DISCONNECTED');
      }
    } else {
      setCloudStatus('DISCONNECTED');
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

        // Merge new System Defaults that might be missing from saved data
        const existingIds = new Set(migratedDefs.map((d: any) => d.id));
        INITIAL_EQUIPMENT_DEFS.forEach(def => {
          if (!existingIds.has(def.id)) {
            migratedDefs.push(def);
          }
        });

        setEquipmentDefs(migratedDefs);
      } else {
        setEquipmentDefs(INITIAL_EQUIPMENT_DEFS);
      }

      if (initialData.vendors) setVendors(initialData.vendors);
      if (initialData.owners && initialData.owners.length > 0) {
        // Enforce latest brand standards on load (Yellow/Pink)
        const standardized = initialData.owners.map(o => {
          if (o.id === 'OWN_LUMEN' || o.id === 'LUMEN') return { ...o, color: '#FFFF00', name: 'Lumen' };
          if (o.id === 'OWN_CUSTOMER' || o.id === 'CUSTOMER') return { ...o, color: '#FF00FF', name: 'Customer' };
          return o;
        });
        setOwners(standardized);
      }
      if (initialData.statuses && initialData.statuses.length > 0) setStatuses(initialData.statuses);

      if (initialData.buildings && Array.isArray(initialData.buildings)) {
        try {
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

                // Initial Reconciliation of Suite/Location
                const suites = b.suites || [];
                const siteId = b.siteId || (initialData.sites?.[0]?.id || 'UNK');

                let detectedSuiteName = "";
                const foundSuite = suites.find((s: any) =>
                  newRack.x >= (s.x - s.width / 2) && newRack.x <= (s.x + s.width / 2) &&
                  newRack.y >= (s.y - s.depth / 2) && newRack.y <= (s.y + s.depth / 2)
                );
                if (foundSuite) detectedSuiteName = foundSuite.name;

                newRack.suite = detectedSuiteName;
                newRack.location = `${siteId}.${newRack.floor || '001'}.${b.label}.${detectedSuiteName}.${newRack.lineUp}.${newRack.bayNo}`;

                if (newRack.x !== r.x || newRack.y !== r.y) {
                  rackMigrationCount++;
                }
                return newRack;
              })
            };

            // Enforce 4-digit label format if numeric
            if (newBuilding.label && /^\d+$/.test(newBuilding.label)) {
              newBuilding.label = newBuilding.label.padStart(4, '0');
            }
            if (newBuilding.x !== b.x || newBuilding.z !== b.z) {
              buildingMigrationCount++;
            }
            return newBuilding;
          });
          if (buildingMigrationCount > 0) console.log(`Migrated ${buildingMigrationCount} building coordinates.`);
          if (rackMigrationCount > 0) console.log(`Migrated ${rackMigrationCount} rack coordinates.`);
          setBuildings(migratedBuildings);
        } catch (e) {
          console.error("CRITICAL: Failed to migrate buildings data. Resetting to empty.", e);
          setBuildings([]);
        }
      }
      if (initialData.history) setHistory(initialData.history);
      if (initialData.activeSiteId) setActiveSiteId(initialData.activeSiteId);
      if (initialData.proInventory) setProInventory(initialData.proInventory);
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
  }, [cloudConfig]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleSaveToCloud = async () => {
    try {
      setCloudStatus('CONNECTING');
      const workspace = { sites, buildingDefs, rackDefs, equipmentDefs, vendors, owners, statuses, buildings, history, activeSiteId, proInventory };

      const json = JSON.stringify(workspace);
      const sizeMB = json.length / (1024 * 1024);
      console.log(`[Sync] Preparing to save workspace (${sizeMB.toFixed(2)} MB)...`);

      if (sizeMB > 10) {
        if (!confirm(`Warning: Your project data is very large (${sizeMB.toFixed(2)} MB). This is likely due to high-resolution floor plan images. Save may be slow or fail. Continue?`)) {
          setCloudStatus('IDLE');
          return;
        }
      }

      // 1. Try LocalStorage first (might throw if too large, but we want to catch it)
      try {
        localStorage.setItem(WORKSPACE_KEY, json);
      } catch (lsErr) {
        console.warn('LocalStorage save failed (likely size limit), continuing to cloud...', lsErr);
      }

      // 2. Cloud Save with Timeout (15 seconds)
      const savePromise = saveToCloud(workspace);
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Cloud save timed out after 15s')), 15000)
      );

      const success = await Promise.race([savePromise, timeoutPromise]) as boolean;

      if (success) {
        setCloudStatus('SYNCED');
        // Slight delay before clearing dirty flag to ensure no concurrent updates override it
        setTimeout(() => setIsDirty(false), 100);
        console.log('[Sync] Cloud save successful.');
        alert("Success: Your project data has been synchronized and saved to the cloud.");
        // Make the "success" state sticky for 3 seconds
        setTimeout(() => {
          setCloudStatus(prev => prev === 'SYNCED' ? 'IDLE' : prev);
        }, 3000);
      } else {
        setCloudStatus('ERROR');
        alert("Error: Could not save to cloud. Please check your internet connection or cloud settings (URL/Key).");
      }
    } catch (err) {
      console.error('Save operation failed or timed out:', err);
      setCloudStatus('ERROR');
      if (err instanceof Error && err.message.includes('timed out')) {
        alert("Cloud save is taking too long. Your changes are saved locally (if possible), but may not be synced to the cloud yet.");
      } else {
        alert("Error: A critical problem occurred while saving. Check your console for details.");
      }
    }
  };

  const handleSaveAndExit = async () => {
    await handleSaveToCloud();
    setShowLeaveModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleDiscardAndExit = async () => {
    await loadWorkspace(); // Revert to saved state
    setIsDirty(false);
    setShowLeaveModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };


  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const viewerRef = useRef<Viewer3DHandle>(null);

  const activeSite = useMemo(() => sites.find(s => s.id === activeSiteId) || sites[0] || INITIAL_SITES[0], [sites, activeSiteId]);
  const siteBuildings = useMemo(() => buildings.filter(b => b.siteId === activeSiteId), [buildings, activeSiteId]);
  const activeBuilding = useMemo(() => buildings.find(b => b.id === activeBuildingId) || null, [buildings, activeBuildingId]);
  const selectedBuilding = useMemo(() => buildings.find(b => b.id === selectedBuildingId) || null, [buildings, selectedBuildingId]);

  // Business Rule Validation Logic
  const validationResult = useMemo(() => {
    try {
      const list: Alert[] = [];
      const clashingIds = new Set<string>();

      // 1. Check for Duplicate Addresses
      buildings.forEach(b => {
        const racksByLoc = new Map<string, Rack[]>();

        // ... (existing logic for duplicates) ...
        (b.racks || []).forEach(r => {
          const s = r.suite || 'UNK';
          const l = r.lineUp || 'UNK';
          const bay = r.bayNo || 'UNK';
          const key = `${s}:${l}.${bay}`;
          if (!racksByLoc.has(key)) racksByLoc.set(key, []);
          racksByLoc.get(key)?.push(r);
        });

        racksByLoc.forEach((racksInLoc, key) => {
          if (racksInLoc.length > 1) {
            // ... add duplicate alerts ...
            racksInLoc.forEach(r => {
              list.push({ id: `DUP-${r.id}`, severity: 'CRITICAL', message: 'Duplicate Rack Address', details: `Multiple racks claim position ${key} in ${b.label}.`, sourceId: r.id, sourceType: 'RACK', buildingId: b.id, siteId: b.siteId, location: `${b.label} / ${key}` });
            });
          }
        });

        // 2. Check for Stakeholder Mismatches
        // ... (existing logic) ...
        (b.equipment || []).forEach(e => {
          const parentRack = (b.racks || []).find(r => r.id === e.rackId);
          if (parentRack && e.ownerId && parentRack.ownerId && e.ownerId !== parentRack.ownerId) {
            const eqOwnerName = owners.find(o => o.id === e.ownerId)?.name || 'Unknown';
            const rackOwnerName = owners.find(o => o.id === parentRack.ownerId)?.name || 'Unknown';
            list.push({ id: `OWNER-MISMATCH-${e.id}`, severity: 'WARNING', message: 'Stakeholder Mismatch', details: `Equipment belongs to ${eqOwnerName} but is installed in a ${rackOwnerName} rack.`, sourceId: e.id, sourceType: 'EQUIPMENT', location: `${b.label} / ${parentRack.label}`, buildingId: b.id, siteId: b.siteId });
          }
        });

        // 3. Check for Equipment Overlaps (NEW)
        b.racks.forEach(rack => {
          const rackEq = b.equipment.filter(e => e.rackId === rack.id);
          const occupiedSlots: { id: string; start: number; end: number; name: string }[] = [];
          rackEq.forEach(eq => {
            const def = equipmentDefs.find(d => d.id === eq.definitionId);
            const heightU = def?.heightU || 1;
            const start = eq.baseRMU;
            const end = start + heightU - 1;
            occupiedSlots.push({ id: eq.id, start, end, name: eq.name });
          });

          for (let i = 0; i < occupiedSlots.length; i++) {
            for (let j = i + 1; j < occupiedSlots.length; j++) {
              const slotA = occupiedSlots[i];
              const slotB = occupiedSlots[j];
              if (Math.max(slotA.start, slotB.start) <= Math.min(slotA.end, slotB.end)) {
                clashingIds.add(slotA.id);
                clashingIds.add(slotB.id);
                list.push({
                  id: `clash-${slotA.id}-${slotB.id}`,
                  severity: 'CRITICAL',
                  message: 'Equipment Overlap Detected',
                  details: `Collision between '${slotA.name}' and '${slotB.name}' in Rack ${rack.label}`,
                  sourceId: slotA.id,
                  sourceType: 'EQUIPMENT',
                  location: `Rack ${rack.label} (U${Math.max(slotA.start, slotB.start)})`,
                  buildingId: b.id,
                  siteId: b.siteId
                });
              }
            }
          }
        });


        // 4. Check for Unconfigured Equipment (Missing Vendor/Model)
        (b.equipment || []).forEach(e => {
          const def = equipmentDefs.find(d => d.id === e.definitionId);
          const isUnconfigured = !def || def.name.toLowerCase().includes('new equipment') || !def.manufacturer || def.manufacturer.toLowerCase().includes('generic');

          if (isUnconfigured) {
            const parentRack = (b.racks || []).find(r => r.id === e.rackId);
            list.push({
              id: `UNCONFIGURED-EQ-${e.id}`,
              severity: 'WARNING',
              message: 'Unconfigured Equipment',
              details: `Equipment '${e.name}' has no specific Vendor or Model definition.`,
              sourceId: e.id,
              sourceType: 'EQUIPMENT',
              location: `${b.label} / ${parentRack?.label || 'Unknown Rack'}`,
              buildingId: b.id,
              siteId: b.siteId
            });
          }
        });

      });
      return { alerts: list, clashingIds };
    } catch (e) {
      console.error("Validation failed", e);
      return { alerts: [], clashingIds: new Set<string>() };
    }
  }, [buildings, owners, equipmentDefs]);

  const alerts = validationResult.alerts;
  const clashingEquipmentIds = validationResult.clashingIds;

  const handleOpenSiteFromMap = (id: string) => {
    navigateWithCheck(() => {
      setActiveSiteId(id);
      setViewLevel('SITE');
      setSelectedBuildingId(null);
      setMapFocusSiteId(null);
    });
  };

  const handleFocusSiteOnMap = (id: string) => {
    navigateWithCheck(() => {
      setViewLevel('MAP');
      setMapFocusSiteId(id);
    });
  };

  const handleReturnToMap = () => {
    navigateWithCheck(() => {
      setViewLevel('MAP');
      setActiveBuildingId(null);
      setSelectedBuildingId(null);
      setAppMode('VIEW');
      setShowInventory(false);
      setSelectedRackId(null);
      setSelectedId(null);
      setShowBuildingProperties(false);
    });
  };

  const handleGoToGlobal = () => {
    navigateWithCheck(() => {
      setViewLevel('MAP');
      setActiveBuildingId(null);
      setShowInventory(false);
      setSelectedRackId(null);
      setSelectedId(null);
      setShowBuildingProperties(false);
    });
  };

  const handleGoToSite = () => {
    navigateWithCheck(() => {
      setViewLevel('SITE');
      setActiveBuildingId(null);
      setShowInventory(false);
      setSelectedRackId(null);
      setSelectedId(null);
      setShowBuildingProperties(false);
    });
  };

  const handleEnterBuilding = useCallback((id: string) => {
    setActiveBuildingId(id);
    setViewLevel('BUILDING');
    setSelectedBuildingId(id);
    if (appMode === 'ADMIN') setAppMode('VIEW');
  }, [appMode]);

  const handleUpdateBuilding = (id: string, up: Partial<Building>) => {
    setBuildings(prev => prev.map(b => {
      if (b.id !== id) return b;

      let updatedBuilding = { ...b, ...up };

      // Auto-Reconcile Racks if racks or suites changed
      if (up.racks || up.suites) {
        const suites = updatedBuilding.suites || [];
        const site = sites.find(s => s.id === b.siteId) || sites[0]; // best effort

        const reconciledRacks = updatedBuilding.racks.map(r => {
          // 1. Detect Suite
          let detectedSuiteName = "";
          const foundSuite = suites.find(s =>
            r.x >= (s.x - s.width / 2) && r.x <= (s.x + s.width / 2) &&
            r.y >= (s.y - s.depth / 2) && r.y <= (s.y + s.depth / 2)
          );
          if (foundSuite) detectedSuiteName = foundSuite.name;

          // 2. Update Location String
          // Format: Site.Floor.Building.Suite.LineUp.BayNo
          const floor = r.floor || '001';
          const newLocation = `${site?.id || 'UNK'}.${floor}.${b.label}.${detectedSuiteName}.${r.lineUp}.${r.bayNo}`;
          const newLabel = `${r.lineUp}.${r.bayNo}`;

          // Update if changed
          if (r.suite !== detectedSuiteName || r.location !== newLocation || r.label !== newLabel) {
            return { ...r, suite: detectedSuiteName, location: newLocation, label: newLabel };
          }
          return r;
        });

        updatedBuilding.racks = reconciledRacks;
      }

      return updatedBuilding;
    }));
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
      id: newId, siteId: activeSiteId, name: 'New Unit', label: (siteBuildings.length + 1).toString().padStart(4, '0'), definitionId: defId, lat: 0, lng: 0, x, z: y, auditStatus: 0, status: appMode === 'EDIT' ? Status4D.RETAIN : Status4D.PROPOSED, ownerId: owners[0]?.id || 'OWN_LUMEN', racks: [], equipment: [], suites: []
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
      suite: "",
      location: `${activeSite.id}.001.${activeBuilding.label}..${lineUp}.${bayNo}`,
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

    // Resolve clean name at creation
    const def = equipmentDefs.find(d => d.id === defId);
    let cleanName = `NEW ${defId}`;
    if (def) {
      const vendor = def.manufacturer || '';
      const modelName = def.name || '';
      if (vendor && modelName.startsWith(vendor)) {
        cleanName = `NEW ${modelName}`.trim();
      } else {
        cleanName = `NEW ${vendor} ${modelName}`.trim();
      }
    }

    const newEq: Equipment = {
      id: eqId,
      definitionId: defId,
      name: cleanName,
      rackId: rackId,
      baseRMU: uPos,
      status: appMode === 'EDIT' ? Status4D.RETAIN : Status4D.PROPOSED,
      ownerId: owners[0]?.id || 'OWN_LUMEN',
      vendorId: vendors[0]?.id || 'V_CISCO'
    };
    const newEqs = [...activeBuilding.equipment, newEq];
    handleUpdateBuilding(activeBuildingId, { equipment: newEqs });
    setSelectedId(eqId);
  }, [activeBuildingId, activeBuilding, owners, vendors, appMode, equipmentDefs]);

  const handleToggleFloorPlan = () => {
    if (!activeBuildingId) return;
    const b = buildings.find(x => x.id === activeBuildingId);
    if (!b || !b.activeFloorPlanId) return;
    const plan = b.floorPlans?.find(p => p.id === b.activeFloorPlanId);
    if (plan) {
      const newPlans = b.floorPlans!.map(p => p.id === plan.id ? { ...p, visible: !plan.visible } : p);
      handleUpdateBuilding(activeBuildingId, { floorPlans: newPlans });
    }
  };

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

  const handleImportProInventory = (items: ProInventoryItem[]) => {
    setProInventory(items);
    setIsDirty(true);
    // Immediately persist CSV data to local storage so it survives page refreshes
    try {
      const existing = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '{}');
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ ...existing, proInventory: items }));
    } catch (e) {
      console.warn('[CSV] Failed to auto-save proInventory to localStorage:', e);
    }
  };


  const handleLinkInventory = (bimId: string, proId: string, type: 'EQUIPMENT' | 'RACK') => {
    // Find PRO Item
    const proItem = proInventory.find(p => p.id === proId);

    // Find building containing the BIM ID
    const targetBuilding = buildings.find(b =>
      type === 'RACK'
        ? b.racks.some(r => r.id === bimId)
        : b.equipment.some(e => e.id === bimId)
    );

    if (!targetBuilding) return;

    if (type === 'RACK') {
      const newRackId = proItem?.id || bimId;
      const newRacks = targetBuilding.racks.map(r => r.id === bimId ? {
        ...r,
        id: newRackId,
        proInventoryId: proId,
        isVerified: true
      } : r);

      // Cascade ID update to equipment if Rack ID changed
      let newEqs = targetBuilding.equipment;
      if (newRackId !== bimId) {
        newEqs = targetBuilding.equipment.map(e => e.rackId === bimId ? { ...e, rackId: newRackId } : e);
      }

      handleUpdateBuilding(targetBuilding.id, { racks: newRacks, equipment: newEqs });
    } else {
      const newEqId = proItem?.id || bimId;
      const newName = proItem?.name;
      const newEq = targetBuilding.equipment.map(e => e.id === bimId ? {
        ...e,
        id: newEqId,
        name: newName || e.name,
        proInventoryId: proId,
        isVerified: true
      } : e);
      handleUpdateBuilding(targetBuilding.id, { equipment: newEq });
    }
    setIsDirty(true);
  };

  if (!hasInitialized) return null;

  const filteredAlerts = (Array.isArray(alerts) ? alerts : []).filter(a => {
    switch (viewLevel) {
      case 'BUILDING':
        // Ensure strictly comparing against the current building, handling potential type mismatches
        return String(a.buildingId) === String(activeBuildingId);
      case 'SITE':
        // Ensure strictly comparing against the current site
        return String(a.siteId) === String(activeSiteId);
      default:
        return true;
    }
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {appMode !== 'ADMIN' && (
        <header className="h-16 glass-panel border-b border-white/5 flex items-center justify-between px-8 z-[100]">
          <div className="flex items-center gap-6 shrink-0">
            <button onClick={handleReturnToMap} title="Return to Main Map" className="h-8 flex items-center hover:opacity-80 transition-opacity">
              <img src={LOGO_URL} alt="Ambiflo" className="h-full object-contain" />
            </button>
            {viewLevel !== 'MAP' && (
              <div className="hidden lg:flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 animate-in fade-in slide-in-from-left duration-500">
                <div className="flex items-center gap-2 text-slate-400 group cursor-pointer hover:text-white transition-colors" onClick={handleGoToGlobal}>
                  <Home size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Home</span>
                </div>
                <ChevronRight size={10} className="text-slate-600" />
                <div className="flex items-center gap-2 text-slate-300 group cursor-pointer hover:text-white transition-colors" onClick={handleGoToSite}>
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
            {/* Save / Sync Status Indicator */}
            {(isDirty || (cloudStatus !== 'IDLE' && cloudStatus !== 'DISCONNECTED')) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToCloud}
                  disabled={cloudStatus === 'CONNECTING'}
                  className={`px-6 py-2.5 rounded-xl border transition-all flex items-center gap-2 shadow-xl
                      ${cloudStatus === 'CONNECTING' ? 'bg-slate-800 border-white/10 text-slate-500 animate-pulse' :
                      cloudStatus === 'SYNCED' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' :
                        cloudStatus === 'ERROR' ? 'bg-red-600 border-red-400 text-white animate-bounce' :
                          cloudStatus === 'DISCONNECTED' ? 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:border-white/30' :
                            'bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500'}
                    `}
                  title={cloudStatus === 'ERROR' ? 'Sync Failed - Click to Retry' : cloudStatus === 'DISCONNECTED' ? 'Cloud Offline - Click to Connect' : 'Save Changes'}
                >
                  {cloudStatus === 'CONNECTING' ? <Loader2 size={18} className="animate-spin" /> :
                    cloudStatus === 'SYNCED' ? <Check size={18} /> :
                      cloudStatus === 'ERROR' ? <AlertCircle size={18} /> :
                        cloudStatus === 'DISCONNECTED' ? <Cloud size={18} /> :
                          <Save size={18} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {cloudStatus === 'CONNECTING' ? 'Saving...' :
                      cloudStatus === 'SYNCED' ? 'Synced' :
                        cloudStatus === 'ERROR' ? 'Sync Error' :
                          cloudStatus === 'DISCONNECTED' ? 'Offline' :
                            'Save'}
                  </span>
                </button>
                {cloudStatus === 'ERROR' && (
                  <button
                    onClick={() => setCloudStatus('IDLE')}
                    className="p-2.5 bg-slate-900 border border-white/10 text-slate-500 hover:text-white rounded-xl transition-all"
                    title="Dismiss Error"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            {viewLevel === 'BUILDING' && (
              <button onClick={() => setShowInventory(!showInventory)} className={`px-6 py-2.5 rounded-xl border border-white/10 transition-all flex items-center gap-2 ${showInventory ? 'bg-blue-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white'}`}>
                <List size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Show Inventory</span>
              </button>
            )}
            {viewLevel === 'BUILDING' && filteredAlerts && filteredAlerts.length > 0 && (
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`relative px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${showAlerts ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-red-500/50 hover:text-red-400'}`}
              >
                <div className="relative">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse">
                    <span className="text-[10px] font-black text-white">{filteredAlerts.length}</span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Issues</span>
              </button>
            )}
            <button onClick={handleReturnToMap} className="px-6 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white flex items-center gap-2">
              <MapIcon size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to map</span>
            </button>
            <button onClick={() => setAppMode('ADMIN')} className="p-2.5 rounded-xl border border-white/5 bg-slate-900/60 text-slate-500 hover:text-white transition-all">
              <Settings size={18} />
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 relative bg-slate-900 overflow-hidden">
        <AlertsPanel
          alerts={filteredAlerts}
          isOpen={showAlerts}
          onClose={() => setShowAlerts(false)}
          onSelect={(type, id) => {
            // Logic to jump to the item
            const b = buildings.find(b => type === 'RACK' ? (b.racks || []).some(r => r.id === id) : (b.equipment || []).some(e => e.id === id));
            if (b) {
              if (activeBuildingId !== b.id) {
                // Ensure we navigate to the site first if needed (though usually we are in the site)
                if (activeSiteId !== b.siteId) {
                  setActiveSiteId(b.siteId);
                }
                setActiveBuildingId(b.id);
                setViewLevel('BUILDING');
                setAppMode('VIEW'); // Switch to view to ensure we see it
              }
              // Slight delay to allow render
              setTimeout(() => {
                if (type === 'RACK') {
                  handleSelectRack(id);
                } else {
                  handleSelectEquipment(id);
                }
              }, 100);
            }
          }}
        />
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
              saveError={cloudStatus === 'ERROR'}
              onSave={handleSaveToCloud}
              onClose={() => setAppMode('VIEW')}
              onExportData={handleExportData}
              onImportData={(data) => { setSites(data.sites); setBuildings(data.buildings); setIsDirty(true); }}
            />
          </div>
        )}

        {viewLevel === 'MAP' ? <SiteMapView sites={sites} onOpenSite={handleOpenSiteFromMap} focusSiteId={mapFocusSiteId} /> :
          viewLevel === 'SITE' ? <SitePlanner2D buildings={siteBuildings} buildingDefs={buildingDefs} selectedBuildingId={selectedBuildingId} appMode={appMode} colorMode={colorMode} colorCodingEnabled={colorCodingEnabled} onSelectBuilding={setSelectedBuildingId} onUpdateBuilding={handleUpdateBuilding} onAddBuilding={handleAddBuildingAt} statuses={statuses} owners={owners} isDirty={isDirty} isSaving={cloudStatus === 'CONNECTING'} saveSuccess={cloudStatus === 'SYNCED'} onSave={handleSaveToCloud} onDeleteBuilding={handleDeleteBuilding} onEnterBuilding={handleEnterBuilding} showLabels={showRackLabels} visibleStatuses={visibleStatuses} alerts={alerts || []} /> :
            <Viewer3D
              clashingIds={clashingEquipmentIds}
              hiddenLineUps={hiddenLineUps}
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
              showRackLabels={showRackLabels}
              showEqLabels={showEqLabels}
              showRMULabels={showRMULabels}
              showRoof={showRoof}
              showGrid={showGrid}
              showSuites={showSuites}
              showVirtualTours={showVirtualTours}
              visibleStatuses={visibleStatuses}
              focusTrigger={focusTrigger}
              onSelectRack={handleSelectRack}
              onSelectEquipment={handleSelectEquipment}
            />}

        {(viewLevel === 'BUILDING' || viewLevel === 'SITE') && (
          <div className="absolute top-6 right-8 flex flex-col items-end gap-4 z-[200]">
            <div className="flex items-center bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-2xl">
              <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                {viewLevel === 'BUILDING' && [
                  { id: '3D', label: '3D', icon: Box },
                  { id: 'PLAN', label: 'PLAN', icon: Layout },
                  { id: 'ELEVATION', label: 'Elevation', icon: Maximize }
                ].map(cam => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      setCurrentPreset(cam.id as any);
                      viewerRef.current?.setCameraPreset(cam.id as any, selectedLineup);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPreset === cam.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <cam.icon size={14} /> {cam.label}
                  </button>
                ))}
              </div>

              {viewLevel === 'BUILDING' && currentPreset === 'ELEVATION' && activeBuildingId && (
                <div className="flex items-center gap-2 px-4 border-r border-white/10 mr-2">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Lineup:</div>
                  <select
                    value={selectedLineup}
                    onChange={(e) => {
                      const newLineup = e.target.value;
                      setSelectedLineup(newLineup);
                      viewerRef.current?.setCameraPreset('ELEVATION', newLineup);
                    }}
                    className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/10 outline-none focus:border-blue-500 uppercase"
                  >
                    {Array.from(new Set(siteBuildings.find(b => b.id === activeBuildingId)?.racks.map(r => r.lineUp) || ['001'])).sort().map(lineup => (
                      <option key={lineup} value={lineup}>{lineup}</option>
                    ))}
                  </select>
                </div>
              )}

              {(appMode === 'EDIT' || appMode === 'DESIGN') && viewLevel === 'BUILDING' && (
                <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                  <button
                    onClick={handleAddRack}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Plus size={14} /> Add Rack
                  </button>
                </div>
              )}

              {viewLevel === 'BUILDING' && (
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
              )}

              <div className="flex items-center gap-1">
                {viewLevel === 'BUILDING' && (
                  <button
                    onClick={() => setShowBuildingProperties(!showBuildingProperties)}
                    className={`p-2.5 rounded-xl transition-all ${showBuildingProperties ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Building Layout & Suites"
                  >
                    <Layout size={20} />
                  </button>
                )}
                {viewLevel === 'BUILDING' && (
                  <>
                    <div className="w-px h-6 bg-slate-700 mx-1" />
                    <button
                      onClick={() => setShowSuites(!showSuites)}
                      className={`p-2.5 rounded-xl transition-all ${showSuites ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Toggle Suites/Zones"
                    >
                      <Maximize2 size={20} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowRackLabels(!showRackLabels)}
                  className={`p-2.5 rounded-xl transition-all ${showRackLabels ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Toggle Labels"
                >
                  <Type size={20} />
                </button>
                {viewLevel === 'BUILDING' && (
                  <>
                    <button
                      onClick={() => setShowRMULabels(!showRMULabels)}
                      className={`p-2.5 rounded-xl transition-all ${showRMULabels ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Toggle RMU Labels"
                    >
                      <Hash size={20} />
                    </button>
                    <button
                      onClick={() => setShowEqLabels(!showEqLabels)}
                      className={`p-2.5 rounded-xl transition-all ${showEqLabels ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Toggle Equipment Labels"
                    >
                      <Box size={20} />
                    </button>
                    <button
                      onClick={() => setShowRoof(!showRoof)}
                      className={`p-2.5 rounded-xl transition-all ${showRoof ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Toggle Roof"
                    >
                      <ChevronUp size={20} />
                    </button>
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`p-2.5 rounded-xl transition-all ${showGrid ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Toggle Grid"
                    >
                      <Grid size={20} />
                    </button>
                    <button
                      onClick={() => setShowVirtualTours(!showVirtualTours)}
                      className={`p-2.5 rounded-xl transition-all ${showVirtualTours ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Toggle 360 Virtual Tours"
                    >
                      <Video size={20} />
                    </button>
                    <button
                      onClick={handleToggleFloorPlan}
                      className={`p-2.5 rounded-xl transition-all ${activeBuilding?.floorPlans?.find(p => p.id === activeBuilding.activeFloorPlanId)?.visible ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                      title="Toggle PDF Floor Plan"
                      disabled={!activeBuilding?.activeFloorPlanId}
                    >
                      <FileText size={20} />
                    </button>
                  </>
                )}
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
                <div className="relative">
                  <button
                    onClick={() => setShowLineUpMenu(!showLineUpMenu)}
                    className={`p-2.5 rounded-xl transition-all ${showLineUpMenu ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Line Up Visibility"
                  >
                    <AlignLeft size={20} />
                  </button>
                  {showLineUpMenu && (
                    <div className="absolute top-full right-0 mt-3 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top-2 duration-200 z-50">
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2 px-1">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Line Up Visibility</span>
                        <X size={14} className="cursor-pointer text-slate-500 hover:text-white" onClick={() => setShowLineUpMenu(false)} />
                      </div>
                      <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          onClick={() => setHiddenLineUps(new Set())}
                          className="w-full text-left p-2 text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 mb-2"
                        >
                          Show All
                        </button>
                        {Array.from(new Set(activeBuilding?.racks.map(r => r.lineUp || 'UNK') || [])).sort().map(lu => (
                          <button
                            key={lu}
                            onClick={() => setHiddenLineUps(prev => {
                              const next = new Set(prev);
                              if (next.has(lu)) next.delete(lu);
                              else next.add(lu);
                              return next;
                            })}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-all group"
                          >
                            <span className={`text-[10px] font-bold uppercase tracking-tight ${hiddenLineUps.has(lu) ? 'text-slate-500' : 'text-slate-200'}`}>{lu}</span>
                            {!hiddenLineUps.has(lu) && <Check size={14} className="text-blue-500 shrink-0 ml-2" />}
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

          {((selectedBuildingId !== null && viewLevel === 'SITE') || (viewLevel === 'BUILDING' && showBuildingProperties && activeBuilding)) && (
            <div className="pointer-events-auto">
              <EditBuildingCard
                building={viewLevel === 'SITE' ? selectedBuilding! : activeBuilding!}
                buildingDefs={buildingDefs}
                onUpdate={handleUpdateBuilding}
                onEnter={handleEnterBuilding}
                onClose={() => { setSelectedBuildingId(null); setShowBuildingProperties(false); }}
                mode={appMode}
                onDelete={handleDeleteBuilding}
                statuses={statuses}
                owners={owners}
                viewLevel={viewLevel}
              />
            </div>
          )}
          {selectedRackId !== null && viewLevel === 'BUILDING' && activeBuilding && (
            <div className="pointer-events-auto">
              {(() => {
                const rack = activeBuilding.racks.find(r => r.id === selectedRackId);
                if (!rack) return null;
                return (
                  <EditRackCard rack={rack} rackDefs={rackDefs} equipmentDefs={equipmentDefs} owners={owners} statuses={statuses} buildingLabel={activeBuilding.label} otherRacks={activeBuilding.racks.filter(r => r.id !== selectedRackId)}
                    onUpdateId={(oldId, newId) => handleUpdateRackId(oldId, newId)}
                    onUpdate={(id, up) => { const newRacks = activeBuilding.racks.map(r => r.id === id ? { ...r, ...up } : r); handleUpdateBuilding(activeBuilding.id, { racks: newRacks }); }}
                    onMove={(dir, shiftKey, altKey) => {
                      // Nudge Logic:
                      // Default: 1 inch (0.0833 ft) - Better for general alignment
                      // Shift: 12 inches (1.0 ft) - Big jumps
                      // Alt: ~1/8 inch (0.01 ft) - Micro adjustments
                      let step = 0.0833;
                      if (shiftKey) step = 1.0;
                      if (altKey) step = 0.01;
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
                    onAddHardware={(defId, uPos) => handleAddEquipment(rack.id, defId, uPos)}
                    onArrayClone={(seedRack, count, spacing, direction) => {
                      const newRacks = [...activeBuilding.racks];
                      const rot = seedRack.rotation || 0;

                      // Smart Label Logic
                      let prefix = '';
                      let currentBay = 0;
                      let digitCount = 3;

                      if (seedRack.label.includes('.')) {
                        const idx = seedRack.label.lastIndexOf('.');
                        prefix = seedRack.label.substring(0, idx + 1); // "001."
                        const suffix = seedRack.label.substring(idx + 1); // "001"
                        digitCount = suffix.length;
                        currentBay = parseInt(suffix) || 0;
                      } else if (/^\d+$/.test(seedRack.label)) {
                        // "001" -> prefix "", bay 1
                        prefix = '';
                        digitCount = seedRack.label.length;
                        currentBay = parseInt(seedRack.label) || 0;
                      } else {
                        // Fallback for text labels: "Rack A" -> "Rack A.001"
                        prefix = seedRack.label + '.';
                        currentBay = 0;
                        digitCount = 3;
                      }

                      // Calculate perpendicular direction (left/right relative to rack orientation)
                      // Corrected: Arrow points +Z (Down in Plan), so Right is -X.
                      const dirMultiplier = direction === 'R' ? -1 : 1;

                      for (let i = 0; i < count; i++) {
                        currentBay++;
                        const bayStr = currentBay.toString().padStart(digitCount, '0');

                        // Calculate position offset perpendicular to rack orientation
                        const offsetDistance = spacing * (i + 1);
                        const dx = dirMultiplier * offsetDistance * Math.cos(rot);
                        const dy = -dirMultiplier * offsetDistance * Math.sin(rot);

                        const newRack: Rack = {
                          ...seedRack,
                          id: `R-${Date.now()}-${i}`,
                          label: `${prefix}${bayStr}`,
                          bayNo: bayStr,
                          x: seedRack.x + dx,
                          y: seedRack.y + dy,
                          equipment: [] // Start with no equipment
                        };

                        newRacks.push(newRack);
                      }

                      handleUpdateBuilding(activeBuilding.id, { racks: newRacks });
                    }}
                  />
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
                  <EditPropertyCard item={eq} equipmentDefs={equipmentDefs} racks={activeBuilding.racks} vendors={vendors} owners={owners} statuses={statuses} onUpdate={(id, up) => { const newEq = activeBuilding.equipment.map(e => e.id === id ? { ...e, ...up } : e); handleUpdateBuilding(activeBuilding.id, { equipment: newEq }); }} onClose={() => setSelectedId(null)} mode={appMode} onDelete={(id) => { const newEq = activeBuilding.equipment.filter(e => e.id !== id); handleUpdateBuilding(activeBuilding.id, { equipment: newEq }); setSelectedId(null); }} clashingIds={clashingEquipmentIds} />
                );
              })()}
            </div>
          )}
        </div>

        {showInventory && (
          <InventoryPanel
            isOpen={showInventory}
            onToggle={() => setShowInventory(false)}
            height={inventoryHeight}
            onHeightChange={setInventoryHeight}
            equipmentDefs={equipmentDefs}
            vendors={vendors}
            equipment={(activeBuilding ? [activeBuilding] : siteBuildings).flatMap(b => b.equipment.map(e => {
              const def = equipmentDefs.find(d => d.id === e.definitionId);
              return {
                ...e,
                building: b.label,
                vendorName: def?.manufacturer || vendors.find(v => v.id === e.vendorId)?.name || '-',
                ownerName: owners.find(o => o.id === e.ownerId)?.name || '-',
                model: def?.name || '-'
              };
            }))}
            racks={(activeBuilding ? [activeBuilding] : siteBuildings).flatMap(b => b.racks.map(r => ({
              ...r,
              building: b.label,
              ownerName: owners.find(o => o.id === r.ownerId)?.name || '-',
              definition: (() => {
                const def = rackDefs.find(d => d.id === r.definitionId);
                return def ? `${def.name} (${def.totalU}U)` : 'Standard Rack';
              })(),
              rackW: rackDefs.find(d => d.id === r.definitionId)?.width ? `${Math.round(rackDefs.find(d => d.id === r.definitionId)!.width * 12)}"` : '-',
              rackD: rackDefs.find(d => d.id === r.definitionId)?.depth ? `${Math.round(rackDefs.find(d => d.id === r.definitionId)!.depth * 12)}"` : '-',
              rackH: rackDefs.find(d => d.id === r.definitionId)?.height ? `${Math.round(rackDefs.find(d => d.id === r.definitionId)!.height * 12)}"` : '-'
            })))}
            proInventory={proInventory}
            selectedRackId={selectedRackId}
            selectedEquipmentId={selectedId}
            onSelect={(type, id, focus) => {
              // Find which building this item belongs to
              const foundBuilding = siteBuildings.find(b =>
                type === 'RACK'
                  ? b.racks.some(r => r.id === id)
                  : b.equipment.some(e => e.id === id)
              );

              if (foundBuilding) {
                if (activeBuildingId !== foundBuilding.id) {
                  setActiveBuildingId(foundBuilding.id);
                  // Optionally switch to Building View if not already
                  // if (viewLevel !== 'BUILDING') setViewLevel('BUILDING'); 
                  // User can stay in Site view if they want, but selection might not be visible in 3D
                }
              }

              if (type === 'RACK') setSelectedRackId(id);
              else { setSelectedId(id); setSelectedEquipmentId(id); }

              if (focus) {
                setFocusTrigger(prev => prev + 1);
              }
            }}
            onLink={handleLinkInventory}
            onImport={handleImportProInventory}
            onProcess={() => setShowReconciliation(true)}
            filterBuildingCode={activeBuildingId ? activeBuilding?.label : undefined}

          />
        )}
      </main>
      <LeaveConfirmationModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSaveAndExit={handleSaveAndExit}
        onDiscardAndExit={handleDiscardAndExit}
      />
      {showReconciliation && (
        <InventoryReconciliationModal
          isOpen={showReconciliation}
          onClose={() => setShowReconciliation(false)}
          racks={siteBuildings.flatMap(b => b.racks.map(r => ({ ...r, building: b.label })))}
          equipment={siteBuildings.flatMap(b => b.equipment.map(e => ({ ...e, building: b.label })))}
          proInventory={proInventory}
          activeSite={activeSite}
          equipmentDefs={equipmentDefs}
          rackDefs={rackDefs}
        />
      )}
    </div>
  );
};

export default App;
