
import { Status4D, BuildingDefinition, VendorDefinition, OwnerDefinition, StatusDefinition, Ownership, SiteDefinition, RackDefinition, EquipmentDefinition } from './types';

export const INITIAL_SITES: SiteDefinition[] = [
  {
    id: 'A0001',
    customerId: 'CSRKCOCF',
    name: 'Castlerock',
    lat: 39.371693,
    lng: -104.865836,
    digitizedStatus: 'Digitized'
  }
];

export const INITIAL_BUILDING_DEFS: BuildingDefinition[] = [
  {
    id: 'TYPE_A',
    name: 'Type A (16 x 12)',
    width: 16,
    depth: 12,
    height: 10,
    color: '#d2c29d',
    roofColor: '#ffffff',
    svgPath: 'M -8,-6 L 8,-6 L 8,6 L -8,6 Z'
  },
  {
    id: 'TYPE_B',
    name: 'Type B (24 x 12)',
    width: 24,
    depth: 12,
    height: 10,
    color: '#c2b280',
    roofColor: '#ffffff',
    svgPath: 'M -12,-6 L 12,-6 L 12,6 L -12,6 Z'
  },
  {
    id: 'TYPE_C',
    name: 'Type C (32 x 12)',
    width: 32,
    depth: 12,
    height: 10,
    color: '#b2a270',
    roofColor: '#f1f1f1',
    svgPath: 'M -16,-6 L 16,-6 L 16,6 L -16,6 Z'
  },
  {
    id: 'TYPE_D',
    name: 'Type D (36 x 12)',
    width: 36,
    depth: 12,
    height: 10,
    color: '#a29260',
    roofColor: '#e1e1e1',
    svgPath: 'M -18,-6 L 18,-6 L 18,6 L -18,6 Z'
  },
];

export const INITIAL_RACK_DEFS: RackDefinition[] = [
  { id: 'RACK_42U', name: 'Standard 42U Cabinet', totalU: 42, width: 2.0, depth: 1.25, height: 6.46, color: '#1e293b' },
  { id: 'RACK_48U', name: 'High-Density 48U', totalU: 48, width: 2.0, depth: 3.5, height: 7.33, color: '#0f172a' },
  { id: 'RACK_2POST', name: '2-Post Relay Rack', totalU: 45, width: 1.6, depth: 1.3, height: 6.9, color: '#475569' },
];

export const INITIAL_EQUIPMENT_DEFS: EquipmentDefinition[] = [
  { id: 'EQ_SERVER_1U', name: 'Generic 1U Server', heightU: 1, depth: 1.15, powerWatts: 450, color: '#3b82f6', category: 'SERVER', manufacturer: 'BBBB' },
  { id: 'EQ_SERVER_2U', name: 'Dual-Node 2U Server', heightU: 2, depth: 1.15, powerWatts: 1200, color: '#6366f1', category: 'SERVER', manufacturer: 'BBBB' },
  { id: 'EQ_SWITCH_1U', name: '48-Port Edge Switch', heightU: 1, depth: 0.8, powerWatts: 150, color: '#06b6d4', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_STORAGE_4U', name: '60-Bay Storage Array', heightU: 4, depth: 1.2, powerWatts: 2400, color: '#14b8a6', category: 'STORAGE', manufacturer: 'BBBB' },
  { id: 'EQ_PATCH_1U', name: '24-Port Patch Panel', heightU: 1, depth: 0.1, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL', manufacturer: 'BBBB' },

  // -- AUTO-IMPORTED FROM CSV ANALYSIS --
  // Active Equipment
  { id: 'EQ_ADVA_FSP_3000R7', name: 'FSP 3000R7', heightU: 6, depth: 1.0, powerWatts: 500, color: '#0ea5e9', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_ADVA_FSP_3000RE', name: 'FSP 3000RE', heightU: 1, depth: 1.0, powerWatts: 200, color: '#0ea5e9', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_CANOGA_CP9101', name: 'CP9101', heightU: 1, depth: 0.83, powerWatts: 100, color: '#f59e0b', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_CIENA_6500', name: '6500 Packet-Optical', heightU: 14, depth: 1.66, powerWatts: 1500, color: '#06b6d4', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_CISCO_2811', name: 'Cisco 2811', heightU: 1, depth: 1.33, powerWatts: 300, color: '#6366f1', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_CISCO_1924', name: 'Cisco 1924', heightU: 1, depth: 1.0, powerWatts: 150, color: '#6366f1', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_CISCO_2511', name: 'Cisco 2511', heightU: 1, depth: 0.83, powerWatts: 100, color: '#6366f1', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_CISCO_7204', name: 'Cisco 7204', heightU: 4, depth: 1.5, powerWatts: 600, color: '#6366f1', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_EATON_AC_PNL', name: 'Eaton AC Panel', heightU: 3, depth: 0.5, powerWatts: 0, color: '#ef4444', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
  { id: 'EQ_HUAWEI_OPTIX', name: 'Huawei OptiX', heightU: 10, depth: 1.0, powerWatts: 800, color: '#ef4444', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_INFINERA_DTN_X', name: 'Infinera DTN-X', heightU: 20, depth: 2.0, powerWatts: 2500, color: '#f97316', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_INFINERA_GENERIC', name: 'Infinera Generic', heightU: 4, depth: 1.0, powerWatts: 500, color: '#f97316', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_JUNIPER_EX', name: 'Juniper EX', heightU: 1, depth: 1.25, powerWatts: 200, color: '#14b8a6', category: 'NETWORK', manufacturer: 'BBBB' },
  { id: 'EQ_ABB_BDFB', name: 'ABB BDFB', heightU: 42, depth: 2.0, powerWatts: 0, color: '#64748b', category: 'PATCH_PANEL', manufacturer: 'BBBB' },

  // Infrastructure Frames
  { id: 'EQ_FRAME_GWYOSX', name: 'Optical Gateway (GWYOSX)', heightU: 42, depth: 1.0, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
  { id: 'EQ_FRAME_OSP_OCP', name: 'OSP OCP Frame', heightU: 42, depth: 1.0, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
  { id: 'EQ_FRAME_ISPR', name: 'ISPR Frame', heightU: 42, depth: 1.0, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
  { id: 'EQ_PANEL_FAP', name: 'Fiber Adapter Panel', heightU: 4, depth: 0.33, powerWatts: 0, color: '#cbd5e1', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
  { id: 'EQ_PANEL_OSPOSX', name: 'Optical Splitter', heightU: 6, depth: 0.66, powerWatts: 0, color: '#cbd5e1', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
  { id: 'EQ_PANEL_FDP', name: 'Fiber Dist Panel', heightU: 6, depth: 1.0, powerWatts: 0, color: '#cbd5e1', category: 'PATCH_PANEL', manufacturer: 'BBBB' },
];

export const INITIAL_VENDORS: VendorDefinition[] = [
  { id: 'V_CIENA', name: 'Ciena', color: '#06b6d4' },
  { id: 'V_CISCO', name: 'Cisco', color: '#6366f1' },
  { id: 'V_JUNIPER', name: 'Juniper', color: '#14b8a6' },
  { id: 'V_BBBB', name: 'BBBB', color: '#64748b' },
  { id: 'V_OTHER', name: 'Other', color: '#64748b' },
];

export const INITIAL_OWNERS: OwnerDefinition[] = [
  { id: 'OWN_LUMEN', name: 'Lumen', color: '#3b82f6' },
  { id: 'OWN_CUSTOMER', name: 'Customer', color: '#f97316' },
];

export const INITIAL_STATUSES: StatusDefinition[] = [
  { id: Status4D.RETAIN, label: 'Existing to be retained', color: '#e2e8f0' },
  { id: Status4D.REMOVE, label: 'Existing to be removed', color: '#ef4444' },
  { id: Status4D.PROPOSED, label: 'Proposed', color: '#10b981' },
  { id: Status4D.FUTURE, label: 'Future', color: '#c084fc' },
  { id: Status4D.MODIFIED, label: 'Modified', color: '#FAFF00' },
];

export const getRegistryColor = (registry: { id: string, color: string }[], id: string, fallback: string = '#475569') => {
  return registry.find(item => item.id === id)?.color || fallback;
};

export const STATUS_COLORS: Record<Status4D, string> = {
  [Status4D.RETAIN]: '#e2e8f0',
  [Status4D.REMOVE]: '#ef4444',
  [Status4D.PROPOSED]: '#10b981',
  [Status4D.FUTURE]: '#c084fc',
  [Status4D.MODIFIED]: '#FAFF00',
};

export const STATUS_LABELS: Record<Status4D, string> = {
  [Status4D.RETAIN]: 'Existing to be retained',
  [Status4D.REMOVE]: 'Existing to be removed',
  [Status4D.PROPOSED]: 'Proposed',
  [Status4D.FUTURE]: 'Future',
  [Status4D.MODIFIED]: 'Modified',
};

export const OWNERSHIP_COLORS: Record<string, string> = {
  [Ownership.LUMEN]: '#3b82f6',
  [Ownership.CUSTOMER]: '#f97316',
};

export const MM_TO_FT = 1 / 304.8;
