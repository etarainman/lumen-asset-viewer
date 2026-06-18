
import { Equipment, ProInventoryItem, Rack, Status4D } from '../types';
import { detectAnomalies, getReconciliationSummary } from './dataProcessing';

export interface GraniteAddress {
  clli: string;
  floor: string;
  building: string;
  suite: string;
  lineUp: string;
  bay: string;
}

/**
 * Parses a full Granite BAY NAME into segments
 * Example: CSRKCOCF.001.0002.003.001.005
 */
export const parseGraniteAddress = (address: string): GraniteAddress | null => {
  const parts = address.split('.');
  if (parts.length < 6) return null;
  return {
    clli: parts[0],
    floor: parts[1],
    building: parts[2],
    suite: parts[3],
    lineUp: parts[4],
    bay: parts[5]
  };
};

export const formatGraniteAddress = (addr: GraniteAddress): string => {
  return `${addr.clli}.${addr.floor}.${addr.building}.${addr.suite}.${addr.lineUp}.${addr.bay}`;
};

export { detectAnomalies, getReconciliationSummary };
