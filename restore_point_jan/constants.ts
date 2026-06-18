
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
  { id: 'EQ_SERVER_1U', name: 'Generic 1U Server', heightU: 1, depth: 1.15, powerWatts: 450, color: '#3b82f6', category: 'SERVER' },
  { id: 'EQ_SERVER_2U', name: 'Dual-Node 2U Server', heightU: 2, depth: 1.15, powerWatts: 1200, color: '#6366f1', category: 'SERVER' },
  { id: 'EQ_SWITCH_1U', name: '48-Port Edge Switch', heightU: 1, depth: 0.8, powerWatts: 150, color: '#06b6d4', category: 'NETWORK' },
  { id: 'EQ_STORAGE_4U', name: '60-Bay Storage Array', heightU: 4, depth: 1.2, powerWatts: 2400, color: '#14b8a6', category: 'STORAGE' },
  { id: 'EQ_PATCH_1U', name: '24-Port Patch Panel', heightU: 1, depth: 0.1, powerWatts: 0, color: '#94a3b8', category: 'PATCH_PANEL' },
];

export const INITIAL_VENDORS: VendorDefinition[] = [
  { id: 'V_CIENA', name: 'Ciena', color: '#06b6d4' },
  { id: 'V_CISCO', name: 'Cisco', color: '#6366f1' },
  { id: 'V_JUNIPER', name: 'Juniper', color: '#14b8a6' },
  { id: 'V_OTHER', name: 'Other', color: '#64748b' },
];

export const INITIAL_OWNERS: OwnerDefinition[] = [
  { id: 'OWN_LUMEN', name: 'Lumen', color: '#3b82f6' },
  { id: 'OWN_CUSTOMER', name: 'Customer', color: '#f97316' },
];

export const INITIAL_STATUSES: StatusDefinition[] = [
  { id: Status4D.RETAIN, label: 'Existing to be retained', color: '#94a3b8' },
  { id: Status4D.REMOVE, label: 'Existing to be removed', color: '#ef4444' },
  { id: Status4D.PROPOSED, label: 'Proposed', color: '#10b981' },
  { id: Status4D.FUTURE, label: 'Future', color: '#c084fc' },
  { id: Status4D.MODIFIED, label: 'Modified', color: '#f59e0b' },
];

export const getRegistryColor = (registry: { id: string, color: string }[], id: string, fallback: string = '#475569') => {
  return registry.find(item => item.id === id)?.color || fallback;
};

export const STATUS_COLORS: Record<Status4D, string> = {
  [Status4D.RETAIN]: '#94a3b8',
  [Status4D.REMOVE]: '#ef4444',
  [Status4D.PROPOSED]: '#10b981',
  [Status4D.FUTURE]: '#c084fc',
  [Status4D.MODIFIED]: '#f59e0b',
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
