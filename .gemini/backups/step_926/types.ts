
export type AppMode = 'VIEW' | 'EDIT' | 'DESIGN' | 'ADMIN';
export type ViewLevel = 'MAP' | 'SITE' | 'BUILDING';
export type ColorMode = 'STATUS' | 'OWNER' | 'VENDOR';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  workspaceId: string;
}

// Definitions (Registry)
export interface SiteDefinition {
  id: string; // Ambiflo ID (CLLI)
  customerId: string;
  name: string;
  lat: number;
  lng: number;
  digitizedStatus?: 'Digitized' | 'Not Digitized';
}

export interface BuildingDefinition {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  color?: string;
  svgPath?: string;
  roofColor?: string;
  wallThickness?: number;
}

export interface RackDefinition {
  id: string;
  name: string;
  totalU: number;
  width: number; // mm
  depth: number; // mm
  height: number; // mm
  color: string;
}

export interface EquipmentDefinition {
  id: string;
  name: string;
  heightU: number;
  depth: number; // mm
  powerWatts: number;
  color: string;
  category: 'SERVER' | 'NETWORK' | 'STORAGE' | 'PATCH_PANEL' | 'UPS';
  datasheetUrl?: string; // Data URL or Remote URL
  photoUrl?: string; // Data URL or Remote URL
  manufacturer?: string;
}

export interface VendorDefinition {
  id: string;
  name: string;
  color: string;
}

export interface OwnerDefinition {
  id: string;
  name: string;
  color: string;
}

export interface StatusDefinition {
  id: string;
  label: string;
  color: string;
}

export enum Status4D {
  RETAIN = 'RETAIN',
  REMOVE = 'REMOVE',
  PROPOSED = 'PROPOSED',
  FUTURE = 'FUTURE',
  MODIFIED = 'MODIFIED'
}

export enum Ownership {
  LUMEN = 'LUMEN',
  CUSTOMER = 'CUSTOMER'
}

// Instances
export interface Rack {
  id: string;
  definitionId: string; // Link to RackDefinition
  label: string; // Typically "LineUp.Bay" e.g. "001.005"
  lineUp: string; // e.g. "001"
  bayNo: string;  // e.g. "005"
  floor: string;  // e.g. "001"
  suite: string;  // e.g. "003"
  location: string; // Full Pro Inventory Address
  x: number;
  y: number;
  rotation?: number;
  status: Status4D;
  ownerId: string;
  proInventoryId?: string;
  isVerified?: boolean;
}

export interface Equipment {
  id: string;
  definitionId: string; // Link to EquipmentDefinition
  name: string;
  rackId: string;
  baseRMU: number; // PDF: "RMU 8 is the base"
  status: Status4D;
  ownerId: string;
  vendorId: string;
  model?: string;
  proInventoryId?: string;
  isVerified?: boolean;
  power?: string;
  description?: string;
  datasheetUrl?: string;
}

export interface Suite {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation?: number;
}

export interface FloorPlan {
  id: string;
  url?: string; // Blob URL
  name: string;
  uploadDate: number;
  opacity: number;
  scale: number;
  x: number;
  z: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
}

export interface Building {
  floorPlans?: FloorPlan[];
  activeFloorPlanId?: string | null;
  id: string;
  siteId: string;
  name: string;
  label: string; // 4 digit Building/Room e.g. "0002"
  definitionId: string;
  x: number;
  z: number;
  rotation?: number;
  lat: number;
  lng: number;
  racks: Rack[];
  equipment: Equipment[];
  suites: Suite[];
  auditStatus: number;
  status: Status4D;
  ownerId: string;
}

export interface ActionLog {
  id: string;
  timestamp: number;
  user: string;
  action: string;
  entityId: string;
  entityType: 'BUILDING' | 'RACK' | 'EQUIPMENT' | 'DEFINITION' | 'SITE';
  details: string;
}

export interface ProInventoryItem {
  id: string;
  name: string;
  type: 'RACK' | 'EQUIPMENT';
  rackId: string;
  status: Status4D;
  proInventoryId?: string; // Added to match usage
  vendor?: string;
  vendorName?: string; // Added to match usage
  model?: string;
  definition?: string; // Added to match usage
  ownerName?: string; // Added to match usage
  location?: string;
  // Segmented components from PRO string
  clli?: string;
  floor?: string;
  building?: string;
  suite?: string;
  lineUp?: string;
  bayNo?: string;
  rmu?: string;
  originalLine?: number;
  rawBayName?: string;
  source?: string; // e.g. 'CSV'
  rackW?: string;
  rackH?: string;
  rackD?: string;
}

export interface Anomaly {
  id: string;
  type: 'BIM_ONLY' | 'PRO_ONLY' | 'ID_MISMATCH';
  description: string;
  itemBim?: Equipment;
  itemPro?: ProInventoryItem;
  suggestedAction: string;
}
