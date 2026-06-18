import { Equipment, ProInventoryItem, Status4D, Ownership, Anomaly, Rack } from '../types';

/**
 * CORE INTELLIGENCE: 
 * This logic handles the 'decoding' of structured naming conventions 
 * used in the CSV/Granite exports.
 */

export const parseInventoryMismatch = (proItem: ProInventoryItem): boolean => {
  if (proItem.type === 'EQUIPMENT' && proItem.name.includes('.') && proItem.location) {
    const nameParts = proItem.name.split('.');
    const locParts = proItem.location.split('.');
    
    // Convention: Name parts 5 and 6 usually correspond to Aisle/Bay
    if (nameParts.length >= 7 && locParts.length >= 2) {
      const nameAisle = nameParts[5];
      const nameBay = nameParts[6];
      const locAisle = locParts[0];
      const locBay = locParts[1];
      
      return nameAisle !== locAisle || nameBay !== locBay;
    }
  }
  return false;
};

export const detectAnomalies = (bimItems: Equipment[], proItems: ProInventoryItem[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  // 1. BIM items with no ID
  bimItems.forEach(bimItem => {
    if (!bimItem.proInventoryId) {
      anomalies.push({
        id: `anom-bim-${bimItem.id}`,
        type: 'BIM_ONLY',
        description: `Item '${bimItem.name}' exists in BIM but has no linked ProInventory record.`,
        itemBim: bimItem,
        suggestedAction: 'Send to ProInventory'
      });
    }
  });

  // 2. Pro Items check
  proItems.forEach(proItem => {
    if (parseInventoryMismatch(proItem)) {
      anomalies.push({
        id: `anom-mismatch-${proItem.id}`,
        type: 'ID_MISMATCH',
        description: `Location Mismatch: Physical label does not match record location for ${proItem.name}.`,
        itemPro: proItem,
        suggestedAction: 'Update Granite Record'
      });
    }

    const match = bimItems.find(b => b.proInventoryId === proItem.id);
    if (!match) {
      anomalies.push({
        id: `anom-pro-${proItem.id}`,
        type: 'PRO_ONLY',
        description: `Item '${proItem.name}' exists in ProInventory but is missing from 3D model.`,
        itemPro: proItem,
        suggestedAction: 'Create placeholder'
      });
    }
  });

  return anomalies;
};

export const getReconciliationSummary = (equipment: Equipment[], racks: Rack[], proInventory: ProInventoryItem[]) => {
  const verifiedCount = equipment.filter(e => e.isVerified).length + racks.filter(r => r.isVerified).length;
  const totalBim = equipment.length + racks.length;
  const anomalies = detectAnomalies(equipment, proInventory);
  
  // Added mismatchDetails to resolve missing property error in AuditReviewModal
  return {
    verifiedCount,
    totalBim,
    completionRate: totalBim > 0 ? (verifiedCount / totalBim) * 100 : 0,
    mismatchCount: anomalies.filter(a => a.type === 'ID_MISMATCH').length,
    orphanProCount: anomalies.filter(a => a.type === 'PRO_ONLY').length,
    orphanBimCount: anomalies.filter(a => a.type === 'BIM_ONLY').length,
    mismatchDetails: anomalies.filter(a => a.type === 'ID_MISMATCH').map(a => a.description),
  };
};