
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Equipment, Rack, Status4D, ProInventoryItem, EquipmentDefinition, VendorDefinition } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import {
    ChevronDown,
    Link,
    Database,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    FilterX,
    Upload,
    RefreshCw,
    X,
    Link2
} from 'lucide-react';

interface InventoryPanelProps {
    equipment: Equipment[];
    racks: Rack[];
    proInventory: ProInventoryItem[];
    equipmentDefs: EquipmentDefinition[];
    vendors: VendorDefinition[];
    selectedRackId?: string | null;
    selectedEquipmentId?: string | null;
    onSelect: (type: 'RACK' | 'EQUIPMENT', id: string, focus: boolean) => void;
    onLink: (bimId: string, proId: string, type: 'EQUIPMENT' | 'RACK') => void;
    onImport: (items: ProInventoryItem[]) => void;
    onProcess: () => void;
    filterBuildingCode?: string;
    onHeightChange?: (height: number) => void;
    height: number;
    isOpen: boolean;
    onToggle: () => void;
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
} | null;

// Extended Interface for Preview
interface CsvPreviewItem extends ProInventoryItem {
    csvRowNumber: number;
    usage?: string;
}

// Draggable Modal Component - Defined before usage
const DraggableModal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only drag via the header handle
        const target = e.target as HTMLElement;
        if (target.closest('#modal-drag-handle')) {
            isDragging.current = true;
            dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
            e.preventDefault();
        }
    }, [position]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const newX = e.clientX - dragStart.current.x;
            const newY = e.clientY - dragStart.current.y;
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <div
            className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 w-[95vw] max-w-7xl max-h-[80vh] flex flex-col overflow-hidden relative"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            onMouseDown={handleMouseDown}
        >
            {children}
        </div>
    );
};

const InventoryPanel: React.FC<InventoryPanelProps> = ({
    equipment,
    racks,
    proInventory,
    equipmentDefs,
    vendors,
    onSelect,
    onLink,
    onImport,
    onProcess,
    filterBuildingCode,
    onHeightChange,
    height,
    isOpen,
    onToggle,
    selectedRackId,
    selectedEquipmentId
}) => {
    const [activeTab, setActiveTab] = useState<'RACKS' | 'EQUIPMENT'>('RACKS');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [showLinked, setShowLinked] = useState(false);

    // New State for CSV Workflow
    const [pendingItems, setPendingItems] = useState<CsvPreviewItem[]>([]);
    const [summaryData, setSummaryData] = useState<Record<string, { racks: number, equipment: number }>>({});
    const [showSummary, setShowSummary] = useState(false);
    const [showDetachMenu, setShowDetachMenu] = useState(false);
    // New State for CSV Sorting
    const [csvSortConfig, setCsvSortConfig] = useState<SortConfig>({ key: 'csvRowNumber', direction: 'asc' });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasAttachedCsv = proInventory.length > 0;

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({});
        setSortConfig(null);
        setSortConfig(null);
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = height;

        const handleMouseMove = (ev: MouseEvent) => {
            const delta = startY - ev.clientY;
            const newHeight = Math.min(Math.max(startHeight + delta, 200), window.innerHeight - 100);
            if (onHeightChange) onHeightChange(newHeight);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const processCsvFile = (text: string) => {
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) return;

        // Helper: Parse Equipment Name
        const parseEquipmentName = (nameString: string) => {
            if (!nameString) return { vendor: 'Unknown', model: 'Unidentified' };

            const parts = nameString.split('.');
            // If strictly creating arrays, sometimes dot is inside quotes, but here we assume simple structure for now 
            // or rely on previous cleaning. The nameString comes from a generic cleaner.

            const token1 = parts[1]?.toUpperCase()?.trim() || '';
            const token2 = parts[2]?.trim() || '';

            // 1. Known Vendors
            const KNOWN_VENDORS = ['HUAWEI', 'INFINERA', 'CIENA', 'CISCO', 'ADVA', 'ABB', 'JUNIPER', 'CANOGA', 'EATON', 'FUJITSU', 'NOKIA', 'ALCATEL', 'LUCENT'];
            if (KNOWN_VENDORS.includes(token1)) {
                return { vendor: token1, model: token2 || 'Generic' };
            }

            // 2. Frame/Type Checks (Keywords)
            const nameUpper = nameString.toUpperCase();
            if (nameUpper.includes('OSPOSX')) return { vendor: 'Generic', model: 'Optical Splitter (OSPOSX)' };
            if (nameUpper.includes('GWYOSX')) return { vendor: 'Generic', model: 'Optical Gateway (GWYOSX)' };
            if (nameUpper.includes('FAP')) return { vendor: 'Generic', model: 'Fiber Adapter Panel' };
            if (nameUpper.includes('AC-PNL')) return { vendor: 'Eaton', model: 'AC Panel' };
            if (nameUpper.includes('BDFB')) return { vendor: 'Generic', model: 'Power Dist (BDFB)' };
            if (nameUpper.includes('FDP') || nameUpper.includes('TXCFDP')) return { vendor: 'Generic', model: 'Fiber Dist Panel' };
            if (nameUpper.includes('ISPR45')) return { vendor: 'Generic', model: 'ISPR Frame' };
            if (nameUpper.includes('OSPOCP')) return { vendor: 'Generic', model: 'OSP OCP Frame' };

            // 3. Fallback
            return { vendor: 'Unknown', model: 'Unidentified Device' };
        };

        const headerLine = lines[0];
        // Robust CSV Splitter
        const splitCSV = (str: string) => {
            const matches = str.matchAll(/(?:^|,)(?:"([^"]*)"|([^,]*))/g);
            return Array.from(matches).map(m => (m[1] !== undefined ? m[1] : m[2]).trim());
        };

        const headers = splitCSV(lines[0].toUpperCase());

        // Robust Header Detection
        const hasRackId = headers.some(h => h.includes('RACK') && h.includes('ID'));
        const possibleEqHeaders = ['EQPT_ID', 'EQPT ID', 'EQUIPMENT ID', 'EQUIPMENT_ID', 'ASSET ID', 'ASSET_TAG', 'DEVICE ID'];
        const hasEqId = headers.some(h => possibleEqHeaders.some(ph => h.includes(ph))) || headers.some(h => h.includes('EQ') && h.includes('ID'));

        const isGranite = hasRackId || hasEqId;

        let items: CsvPreviewItem[] = [];

        if (isGranite) {
            // Find Indices
            const idxBayName = headers.indexOf('BAY NAME');
            const idxEqName = headers.indexOf('EQUIPMENT NAME');
            const idxRackId = headers.findIndex(h => h.includes('RACK') && h.includes('ID'));

            let idxEqId = -1;
            // Priority 1: Exact matches or strong patterns
            // We want to be very aggressive in finding the Equipment ID column
            for (const ph of possibleEqHeaders) {
                const found = headers.findIndex(h => h === ph || h.includes(ph)); // Relaxed check
                if (found > -1) { idxEqId = found; break; }
            }
            // Priority 2: Fuzzy fallback
            if (idxEqId === -1) {
                idxEqId = headers.findIndex(h => h.includes('EQ') && h.includes('ID'));
            }

            const idxUsage = headers.indexOf('USAGE');
            const idxRackW = headers.findIndex(h => h.includes('RACK-W') || h === 'WIDTH' || h === 'W');
            const idxRackH = headers.findIndex(h => h.includes('RACK-H') || h === 'HEIGHT' || h === 'H');
            const idxRackD = headers.findIndex(h => h.includes('RACK-D') || h === 'DEPTH' || h === 'D');

            const uniqueRacks = new Map<string, CsvPreviewItem>();
            const equipmentList: CsvPreviewItem[] = [];

            lines.slice(1).forEach((line, idx) => {
                const cols = splitCSV(line);
                const rowNum = idx + 2; // Data starts at line 2

                const rackId = idxRackId > -1 ? cols[idxRackId]?.trim() : '';
                const eqId = idxEqId > -1 ? cols[idxEqId]?.trim() : '';
                const bayName = idxBayName > -1 ? cols[idxBayName]?.trim() || '' : '';
                const usage = idxUsage > -1 ? cols[idxUsage]?.trim() : '';
                const rackW = idxRackW > -1 ? cols[idxRackW]?.trim() : '';
                const rackH = idxRackH > -1 ? cols[idxRackH]?.trim() : '';
                const rackD = idxRackD > -1 ? cols[idxRackD]?.trim() : '';

                // Strict Existence Checks
                const hasRack = !!rackId && rackId.length > 0;
                // RELAXED CHECK: If we have an eqId column but it's empty, and we have a rackId, it might just be a rack row.
                // But if we have an eqId, we treat it as equipment.
                const hasEq = !!eqId && eqId.length > 0;

                // Parse Location
                let building = '', suite = '', lineUp = '000', bayNo = '000';
                if (bayName) {
                    const locParts = bayName.split('.');
                    // indices: 0=Site, 1=Floor, 2=Building, 3=Suite
                    building = locParts[2] || '';
                    suite = locParts[3] || '';
                    lineUp = locParts[4] || '000';
                    bayNo = locParts[5] || '000';
                }

                // Logic: Owner Name
                const ownerName = usage?.toLowerCase() === 'customer' ? 'Customer' : 'Lumen';

                // Logic: Always Status RETAIN for existing PRO Inventory
                const status = Status4D.RETAIN;

                let rowCaptured = false;

                // 1. Valid Racks
                if (hasRack) {
                    // We only add the rack to the "Unique Racks" list to prevent duplicates in import
                    if (!uniqueRacks.has(rackId)) {
                        uniqueRacks.set(rackId, {
                            id: rackId,
                            name: bayName || `Rack ${rackId}`,
                            type: 'RACK',
                            rackId: rackId,
                            proInventoryId: rackId,
                            status: Status4D.RETAIN, // Force RETAIN
                            location: bayName,
                            lineUp,
                            bayNo,
                            rmu: '0',
                            building,
                            suite,
                            definition: 'Generic Rack',
                            ownerName,
                            csvRowNumber: rowNum,
                            usage,
                            rackW,
                            rackH,
                            rackD
                        });
                    }
                    rowCaptured = true;
                }

                // 2. Process Equipment
                if (hasEq) {
                    const eqName = cols[idxEqName]?.trim() || '';
                    let rmu = '0';
                    if (eqName) {
                        const eqParts = eqName.split('.');
                        const last = eqParts[eqParts.length - 1];
                        if (!isNaN(parseInt(last))) rmu = last;
                    }


                    // Parse Name Info
                    const { vendor, model } = parseEquipmentName(eqName);
                    // Use model as the "clean name" if available, else fallback
                    const displayName = model !== 'Unidentified' ? `${vendor} ${model}` : (eqName.split('.')[1] || eqName);

                    equipmentList.push({
                        id: eqId,
                        name: displayName,
                        type: 'EQUIPMENT',
                        rackId: hasRack ? rackId : '',
                        proInventoryId: eqId,
                        status: Status4D.RETAIN, // Force RETAIN
                        location: bayName,
                        lineUp,
                        bayNo,
                        rmu,
                        building,
                        suite,
                        model: model,
                        vendorName: vendor,
                        ownerName,
                        csvRowNumber: rowNum,
                        usage
                    });
                    rowCaptured = true;
                }

                // 3. Catch-All for Rows with Missing IDs
                // STRICT MODE: If we didn't capture a valid rack or valid equipment, and we are skipping missing rows, just ignore it.
                // The User explicitly asked to "Only import rows that have Equipment IDs"
                if (!rowCaptured) {
                    // Do nothing - skip this row.
                    // Previously we were adding a placeholder "ROW-XXX-MISSING" item, 
                    // but the requirement is now to strictly ignore them.
                }
            });

            items = [...Array.from(uniqueRacks.values()), ...equipmentList];
        } else {
            // Fallback
            const hLower = headers.map(h => h.toLowerCase());
            const getIdx = (patterns: string[]) => hLower.findIndex(h => patterns.some(p => h.includes(p)));

            const idIdx = getIdx(['id', 'tag', 'asset']);
            const nameIdx = getIdx(['name', 'label', 'description']);
            const locIdx = getIdx(['location', 'clli', 'address']);

            items = lines.slice(1).map((line, idx) => {
                const cols = splitCSV(line); // Use robust splitter here too

                // If it's empty, skip
                if (!line.trim()) return null;

                const id = cols[idIdx > -1 ? idIdx : 0]?.trim();

                // Skipping fallback rows without ID if requested, but for fallback mode we might be linient.
                // However, safe bet is to skip if ID is missing or empty.
                if (!id) return null;

                const name = cols[nameIdx > -1 ? nameIdx : 1]?.trim() || 'Unknown';
                const loc = cols[locIdx > -1 ? locIdx : 3]?.trim() || '';
                const type = name.toLowerCase().includes('rack') ? 'RACK' : 'EQUIPMENT';

                return {
                    id,
                    name,
                    type,
                    rackId: '',
                    status: Status4D.RETAIN, // Always RETAIN
                    location: loc,
                    lineUp: '000',
                    bayNo: '000',
                    rmu: '0',
                    ownerName: 'Lumen',
                    csvRowNumber: idx + 2
                } as CsvPreviewItem;
            }).filter((i): i is CsvPreviewItem => i !== null);
        }

        // Generate Summary
        const summary: Record<string, { racks: number, equipment: number }> = {};
        items.forEach(item => {
            const b = item.building || 'Unknown';
            if (!summary[b]) summary[b] = { racks: 0, equipment: 0 };
            if (item.type === 'RACK') summary[b].racks++;
            else summary[b].equipment++;
        });

        setPendingItems(items);
        setSummaryData(summary);
        setShowSummary(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            processCsvFile(text);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = () => {
        onImport(pendingItems);
        setShowSummary(false);
        setPendingItems([]);
    };

    const handleDetachCsv = () => {
        onImport([]);
        setShowDetachMenu(false);
    };

    const handleDrop = (e: React.DragEvent, targetBimRow: any) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === targetBimRow.type) {
                onLink(targetBimRow.id, data.id, data.type);
            }
        } catch (err) { console.error(err); }
    };

    const handleCsvSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (csvSortConfig && csvSortConfig.key === key && csvSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setCsvSortConfig({ key, direction });
    };

    const sortedPendingItems = useMemo(() => {
        const items = [...pendingItems];
        if (csvSortConfig) {
            items.sort((a, b) => {
                // Handle specialized keys
                let valA: any = a[csvSortConfig.key as keyof CsvPreviewItem];
                let valB: any = b[csvSortConfig.key as keyof CsvPreviewItem];

                // Specific Mapping for columns
                if (csvSortConfig.key === 'equipId') valA = a.type === 'EQUIPMENT' ? a.proInventoryId : '';
                if (csvSortConfig.key === 'equipId') valB = b.type === 'EQUIPMENT' ? b.proInventoryId : '';

                if (valA === undefined || valA === null) valA = '';
                if (valB === undefined || valB === null) valB = '';

                if (valA < valB) return csvSortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return csvSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [pendingItems, csvSortConfig]);

    const rows = useMemo(() => {
        let data: any[] = [];
        // Calculate Linked IDs (BIM Items that have a valid proInventoryId)
        const linkedIds = new Set<string>();
        racks.forEach(r => { if ((r as any).proInventoryId) linkedIds.add((r as any).proInventoryId); });
        equipment.forEach(e => { if (e.proInventoryId) linkedIds.add(e.proInventoryId); });

        const getSortKey = (item: any, src: string) => {
            const lu = (item.lineUp || '999').toString().padStart(3, '0');
            const bay = (item.bayNo || '999').toString().padStart(3, '0');

            // Priority 1: Type (Racks anchor the top of each bay group)
            const typePriority = (item.type === 'RACK') ? '0' : '1';

            // Normalize RMU for sorting (ensure numerical alignment)
            let rmuVal = 0;
            if (item.rmu && item.rmu !== '-' && item.rmu !== '') {
                rmuVal = parseInt(item.rmu) || 0;
            } else if (item.baseRMU) {
                rmuVal = parseInt(item.baseRMU) || 0;
            }
            const rmuStr = rmuVal.toString().padStart(2, '0');

            // Source Priority (BIM first)
            const srcPriority = src === 'BIM' ? '0' : '1';

            // Model string for differentiating multiple entries at same U
            const modelStr = (item.model || item.definition || item.name || '').toString().toLowerCase().trim();

            // Priority: Line & Bay -> Type -> RMU -> Source (BIM/PRO) -> Model (fine-grain grouping)
            return `${lu}.${bay}.${typePriority}.${rmuStr}.${srcPriority}.${modelStr}`;
        };

        // Strict Filter for Building Code
        const matchesBuilding = (itemBuilding: string | undefined) => {
            if (!filterBuildingCode) return true;
            if (!itemBuilding) return false;
            return itemBuilding.toLowerCase().includes(filterBuildingCode.toLowerCase()) || filterBuildingCode.toLowerCase().includes(itemBuilding.toLowerCase());
        };

        if (activeTab === 'RACKS') {
            const bimRacks = racks.map(r => ({
                ...r,
                source: 'BIM',
                type: 'RACK',
                sync: r.isVerified ? 'Verified' : 'Unsynced',
                sortKey: getSortKey({ ...r, type: 'RACK' }, 'BIM'),
                rackId: r.id,
                proInventoryId: (r as any).proInventoryId || '',
                building: (r as any).building || '-',
                suite: (r as any).suite || '',
                definition: (r as any).definition || '-'
            })).filter(r => matchesBuilding(r.building));

            const proRacks = proInventory.filter(p => p.type === 'RACK' && matchesBuilding(p.building))
                .filter(p => showLinked || !linkedIds.has(p.id))
                .map(p => ({
                    ...p,
                    source: 'PRO',
                    sync: 'Unknown',
                    sortKey: getSortKey(p, 'PRO'),
                    rackId: p.id,
                    proInventoryId: p.id // Fix: Use the Rack ID as the Pro Inventory ID so it displays in table
                }));
            data = [...bimRacks, ...proRacks];
        } else {
            const bimEq = equipment.map(e => {
                const parentRack = racks.find(r => r.id === e.rackId);
                const def = equipmentDefs.find(d => d.id === e.definitionId);
                const derived = {
                    lineUp: parentRack?.lineUp || '-',
                    bayNo: parentRack?.bayNo || '-',
                    building: (e as any).building || (parentRack as any)?.building || '-',
                    suite: (e as any).suite || (parentRack as any)?.suite || '',
                    vendorName: def?.manufacturer || (e as any).vendorName || '-',
                    model: def?.name || (e as any).model || '-'
                };
                return {
                    ...e,
                    source: 'BIM',
                    type: 'EQUIPMENT',
                    rmu: String(e.baseRMU || ''),
                    ...derived,
                    sync: e.isVerified ? 'Verified' : 'Unsynced',
                    sortKey: getSortKey({ ...e, ...derived, type: 'EQUIPMENT' }, 'BIM'),
                    rackId: e.rackId,
                    proInventoryId: e.proInventoryId || ''
                };
            }).filter(e => matchesBuilding(e.building));

            const proEq = proInventory.filter(p => p.type === 'EQUIPMENT' && matchesBuilding(p.building))
                .filter(p => showLinked || !linkedIds.has(p.id))
                .map(p => ({
                    ...p,
                    source: 'PRO',
                    sync: 'Unknown',
                    sortKey: getSortKey(p, 'PRO'),
                    proInventoryId: p.id
                }));

            data = [...bimEq, ...proEq];
        }

        // Apply Filters
        let filteredData = data.filter(row => {
            // Cast Object.entries to [string, string][] to ensure 'value' is not inferred as 'unknown'
            return (Object.entries(filters) as [string, string][]).every(([key, value]) => {
                if (!value) return true;
                const rowValue = String(row[key] || '').toLowerCase();
                const filterValue = value.toLowerCase();

                // Handle specialized display mappings for status and sync in filter
                if (key === 'status') {
                    // Access status labels safely and ensure string type for toLowerCase()
                    const statusLabel = (STATUS_LABELS[row.status as Status4D] || '').toLowerCase();
                    return statusLabel.includes(filterValue);
                }

                return rowValue.includes(filterValue);
            });
        });

        // Apply Sorting
        filteredData.sort((a, b) => {
            if (sortConfig) {
                const valA = a[sortConfig.key] ?? '';
                const valB = b[sortConfig.key] ?? '';

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            }
            // Default sort or Tiebreaker (using sortKey ensures alternating pairs at same position)
            if (a.sortKey < b.sortKey) return -1;
            if (a.sortKey > b.sortKey) return 1;
            return 0;
        });

        return filteredData;
    }, [equipment, racks, proInventory, activeTab, sortConfig, filters, filterBuildingCode, showLinked]);

    // Scroll Effect
    const rowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

    useEffect(() => {
        const id = activeTab === 'RACKS' ? selectedRackId : selectedEquipmentId;
        if (id && rowRefs.current[id]) {
            rowRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedRackId, selectedEquipmentId, activeTab]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-white/10 z-[100] transition-transform duration-300 shadow-2xl flex flex-col`}
            style={{ height: isOpen ? height : 0 }}
        >
            <div
                className="w-full h-1.5 bg-slate-800 hover:bg-blue-500/50 cursor-ns-resize absolute top-0 left-0 z-50 transition-colors"
                onMouseDown={handleResizeMouseDown}
            />
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-10">
                    <div className="flex flex-col">
                        <h3 className="font-black text-[11px] uppercase tracking-[0.3em] text-blue-500 flex items-center gap-2 mb-1">
                            <Database size={14} /> Pro Inventory Explorer
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{rows.length} Segmented Records Found</span>
                    </div>

                    <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/20">
                        {(['RACKS', 'EQUIPMENT'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    clearFilters();
                                }}
                                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {Object.keys(filters).length > 0 && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                        >
                            <FilterX size={14} /> Clear Filters
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-6 relative">
                    <button
                        onClick={() => setShowLinked(!showLinked)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${showLinked ? 'bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-600 hover:text-white' : 'bg-slate-800 text-slate-500 border-white/10 hover:text-slate-300'}`}
                    >
                        <Link size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{showLinked ? 'Hide Linked' : 'Show Linked'}</span>
                    </button>

                    {hasAttachedCsv ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowDetachMenu(!showDetachMenu)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-full border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all"
                            >
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-emerald-500/50 shadow-lg"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">CSV Attached</span>
                                <ChevronDown size={12} className={showDetachMenu ? 'rotate-180' : ''} />
                            </button>

                            {showDetachMenu && (
                                <div className="absolute top-12 right-0 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-1 z-[200] w-40">
                                    <button
                                        onClick={handleDetachCsv}
                                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg flex items-center gap-2"
                                    >
                                        <FilterX size={12} /> Detach CSV
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30 cursor-pointer hover:bg-blue-600 hover:text-white transition-all">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                            <Upload size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Load CSV</span>
                        </label>
                    )}

                    <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-blue-400 uppercase">Granite-Sync Active</span>
                    </div>
                    <button
                        onClick={onProcess}
                        className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/30 transition-all group"
                    >
                        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Process Instructions</span>
                    </button>
                    <button onClick={onToggle} className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-all">
                        <ChevronDown size={24} />
                    </button>
                </div>
            </div>

            {showSummary && (
                <div className="absolute inset-0 z-[250] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-auto">
                    {/* Draggable Container */}
                    <DraggableModal onClose={() => { setShowSummary(false); setPendingItems([]); }}>
                        <div className="flex items-center justify-between mb-4 shrink-0 cursor-move" id="modal-drag-handle">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <Database size={24} className="text-blue-500" />
                                CSV Import Summary
                            </h3>
                            <button onClick={() => { setShowSummary(false); setPendingItems([]); }} className="cursor-pointer"><X size={24} className="text-slate-500 hover:text-white" /></button>
                        </div>

                        {/* Area 1: Summary Table */}
                        <div className="bg-slate-950 rounded-xl border border-white/5 mb-4 p-4 shrink-0">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Building Summary</h4>
                            <div className="max-h-[100px] overflow-y-auto">
                                <table className="w-full text-left text-xs font-bold">
                                    <thead className="text-slate-500 uppercase tracking-wider border-b border-white/5">
                                        <tr>
                                            <th className="px-4 py-2">Building</th>
                                            <th className="px-4 py-2 text-blue-400 text-right">Racks</th>
                                            <th className="px-4 py-2 text-emerald-400 text-right">Equipment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-300">
                                        {Object.entries(summaryData).map(([bldg, counts]: [string, { racks: number, equipment: number }]) => (
                                            <tr key={bldg}>
                                                <td className="px-4 py-2">{bldg}</td>
                                                <td className="px-4 py-2 text-right">{counts.racks}</td>
                                                <td className="px-4 py-2 text-right">{counts.equipment}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Area 2: Detailed Table */}
                        <div className="flex-1 bg-slate-950 rounded-xl border border-white/5 flex flex-col min-h-0 overflow-hidden">
                            <div className="px-4 py-2 border-b border-white/5 bg-slate-900/50 shrink-0">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Detailed Records ({pendingItems.length})</h4>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left text-[10px] font-mono">
                                    <thead className="bg-[#0f172a] text-slate-500 sticky top-0 font-bold uppercase tracking-wider z-10 cursor-pointer">
                                        <tr>
                                            <th className="px-3 py-2 bg-[#0f172a] hover:text-white group" onClick={() => handleCsvSort('csvRowNumber')}>
                                                <div className="flex items-center gap-2">Row <SortIcon column="csvRowNumber" sortConfig={csvSortConfig} /></div>
                                            </th>
                                            <th className="px-3 py-2 bg-[#0f172a] hover:text-white group">
                                                Type
                                            </th>
                                            <th className="px-3 py-2 bg-[#0f172a] hover:text-white group" onClick={() => handleCsvSort('rackId')}>
                                                <div className="flex items-center gap-2">Rack ID <SortIcon column="rackId" sortConfig={csvSortConfig} /></div>
                                            </th>
                                            <th className="px-3 py-2 bg-[#0f172a] hover:text-white group" onClick={() => handleCsvSort('equipId')}>
                                                <div className="flex items-center gap-2">Equip ID <SortIcon column="equipId" sortConfig={csvSortConfig} /></div>
                                            </th>
                                            <th className="px-3 py-2 bg-[#0f172a] hover:text-white group" onClick={() => handleCsvSort('building')}>
                                                <div className="flex items-center gap-2">Building <SortIcon column="building" sortConfig={csvSortConfig} /></div>
                                            </th>
                                            <th className="px-3 py-2 bg-[#0f172a] hover:text-white group" onClick={() => handleCsvSort('lineUp')}>
                                                <div className="flex items-center gap-2">Line Up <SortIcon column="lineUp" sortConfig={csvSortConfig} /></div>
                                            </th>
                                            <th className="px-3 py-2 bg-[#0f172a] hover:text-white group" onClick={() => handleCsvSort('bayNo')}>
                                                <div className="flex items-center gap-2">Bay <SortIcon column="bayNo" sortConfig={csvSortConfig} /></div>
                                            </th>
                                            <th className="px-3 py-2 bg-[#0f172a] hover:text-white group" onClick={() => handleCsvSort('ownerName')}>
                                                <div className="flex items-center gap-2">Owner <SortIcon column="ownerName" sortConfig={csvSortConfig} /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-300">
                                        {sortedPendingItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/5">
                                                <td className="px-3 py-1.5 text-slate-500">{item.csvRowNumber}</td>
                                                <td className="px-3 py-1.5">
                                                    {item.type === 'RACK'
                                                        ? <span className="text-blue-400 bg-blue-400/10 px-1 rounded font-bold text-[9px]">RACK</span>
                                                        : <span className="text-emerald-400 bg-emerald-400/10 px-1 rounded font-bold text-[9px]">EQUIP</span>}
                                                </td>
                                                <td className="px-3 py-1.5 text-blue-300 font-bold">{item.rackId || '-'}</td>
                                                <td className="px-3 py-1.5 text-emerald-300 font-bold">{item.type === 'EQUIPMENT' ? item.proInventoryId : '-'}</td>
                                                <td className="px-3 py-1.5">{item.building}</td>
                                                <td className="px-3 py-1.5">{item.lineUp}</td>
                                                <td className="px-3 py-1.5">{item.bayNo}</td>
                                                <td className="px-3 py-1.5">
                                                    <span className={`px-1.5 py-0.5 rounded ${item.ownerName === 'Customer' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/10 text-blue-300'}`}>
                                                        {item.ownerName}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4 shrink-0">
                            <button
                                onClick={() => { setShowSummary(false); setPendingItems([]); }}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl uppercase tracking-widest text-[10px]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-[10px]"
                            >
                                Proceed
                            </button>
                        </div>
                    </DraggableModal>
                </div>
            )}

            <div className="flex-1 overflow-auto px-6 pb-6">
                <table className="w-full text-sm text-left border-collapse table-fixed">
                    <thead className="bg-slate-950/80 sticky top-0 z-10">
                        <tr className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
                            <th className="w-12"></th>
                            {activeTab === 'RACKS' ? (
                                <>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('source')}>
                                        <div className="flex items-center gap-2">Source <SortIcon column="source" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.source || ''} onChange={(v) => handleFilterChange('source', v)} placeholder="Filter..." />
                                    </th>
                                    <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('rackId')}>
                                        <div className="flex items-center gap-2">Rack ID <SortIcon column="rackId" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.rackId || ''} onChange={(v) => handleFilterChange('rackId', v)} placeholder="Search..." />
                                    </th>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('building')}>
                                        <div className="flex items-center gap-2">Building <SortIcon column="building" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.building || ''} onChange={(v) => handleFilterChange('building', v)} placeholder="Filter..." />
                                    </th>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('suite')}>
                                        <div className="flex items-center gap-2">Suite <SortIcon column="suite" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.suite || ''} onChange={(v) => handleFilterChange('suite', v)} placeholder="Filter..." />
                                    </th>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('lineUp')}>
                                        <div className="flex items-center gap-2 text-blue-400">Line Up <SortIcon column="lineUp" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.lineUp || ''} onChange={(v) => handleFilterChange('lineUp', v)} placeholder="#" />
                                    </th>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('bayNo')}>
                                        <div className="flex items-center gap-2 text-blue-400">Bay No <SortIcon column="bayNo" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.bayNo || ''} onChange={(v) => handleFilterChange('bayNo', v)} placeholder="#" />
                                    </th>
                                    <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('definition')}>
                                        <div className="flex items-center gap-2">Model <SortIcon column="definition" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.definition || ''} onChange={(v) => handleFilterChange('definition', v)} placeholder="Filter..." />
                                    </th>
                                    <th className="px-6 py-4 w-24 cursor-pointer group" onClick={() => handleSort('rackW')}>
                                        <div className="flex items-center gap-2">W <SortIcon column="rackW" sortConfig={sortConfig} /></div>
                                    </th>
                                    <th className="px-6 py-4 w-24 cursor-pointer group" onClick={() => handleSort('rackD')}>
                                        <div className="flex items-center gap-2">D <SortIcon column="rackD" sortConfig={sortConfig} /></div>
                                    </th>
                                    <th className="px-6 py-4 w-24 cursor-pointer group" onClick={() => handleSort('rackH')}>
                                        <div className="flex items-center gap-2">H <SortIcon column="rackH" sortConfig={sortConfig} /></div>
                                    </th>
                                    <th className="px-6 py-4 w-32 cursor-pointer group" onClick={() => handleSort('ownerName')}>
                                        <div className="flex items-center gap-2">Stakeholder <SortIcon column="ownerName" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.ownerName || ''} onChange={(v) => handleFilterChange('ownerName', v)} placeholder="Filter..." />
                                    </th>
                                </>
                            ) : (
                                <>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('source')}>
                                        <div className="flex items-center gap-2">Source <SortIcon column="source" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.source || ''} onChange={(v) => handleFilterChange('source', v)} placeholder="Filter..." />
                                    </th>
                                    <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('proInventoryId')}>
                                        <div className="flex items-center gap-2">Equipment ID <SortIcon column="proInventoryId" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.proInventoryId || ''} onChange={(v) => handleFilterChange('proInventoryId', v)} placeholder="Search..." />
                                    </th>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('building')}>
                                        <div className="flex items-center gap-2">Building <SortIcon column="building" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.building || ''} onChange={(v) => handleFilterChange('building', v)} placeholder="Filter..." />
                                    </th>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('lineUp')}>
                                        <div className="flex items-center gap-2 text-blue-400">Line Up <SortIcon column="lineUp" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.lineUp || ''} onChange={(v) => handleFilterChange('lineUp', v)} placeholder="#" />
                                    </th>
                                    <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('bayNo')}>
                                        <div className="flex items-center gap-2 text-blue-400">Bay No <SortIcon column="bayNo" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.bayNo || ''} onChange={(v) => handleFilterChange('bayNo', v)} placeholder="#" />
                                    </th>
                                    <th className="px-6 py-4 w-32 cursor-pointer group" onClick={() => handleSort('vendorName')}>
                                        <div className="flex items-center gap-2">Vendor <SortIcon column="vendorName" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.vendorName || ''} onChange={(v) => handleFilterChange('vendorName', v)} placeholder="Filter..." />
                                    </th>
                                    <th className="px-6 py-4 w-32 cursor-pointer group" onClick={() => handleSort('model')}>
                                        <div className="flex items-center gap-2">Model <SortIcon column="model" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.model || ''} onChange={(v) => handleFilterChange('model', v)} placeholder="Filter..." />
                                    </th>
                                    <th className="px-6 py-4 w-20 cursor-pointer group" onClick={() => handleSort('rmu')}>
                                        <div className="flex items-center gap-2">RMU <SortIcon column="rmu" sortConfig={sortConfig} /></div>
                                    </th>
                                    <th className="px-6 py-4 w-32 cursor-pointer group" onClick={() => handleSort('ownerName')}>
                                        <div className="flex items-center gap-2">Stakeholder <SortIcon column="ownerName" sortConfig={sortConfig} /></div>
                                        <FilterInput value={filters.ownerName || ''} onChange={(v) => handleFilterChange('ownerName', v)} placeholder="Filter..." />
                                    </th>
                                </>
                            )}
                            <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-2">4D Status <SortIcon column="status" sortConfig={sortConfig} /></div>
                                <FilterInput value={filters.status || ''} onChange={(v) => handleFilterChange('status', v)} placeholder="Filter..." />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row: any, idx) => {
                            const isBim = row.source === 'BIM';
                            const statusColor = STATUS_COLORS[row.status as Status4D];
                            const displayId = (row.proInventoryId && row.proInventoryId.trim() !== '')
                                ? row.proInventoryId
                                : ''; // Strictly use proInventoryId (Asset Tag) for both Racks and Equipment to match CP

                            const isMissingId = isBim && row.type === 'RACK' && (!row.proInventoryId || row.proInventoryId.trim() === '');
                            const isMissingEqId = isBim && row.type === 'EQUIPMENT' && (!row.proInventoryId || row.proInventoryId.trim() === '');

                            const isSelected = activeTab === 'RACKS'
                                ? (row.rackId === selectedRackId && isBim)
                                : (row.id === selectedEquipmentId && isBim);

                            const hasSelection = activeTab === 'RACKS' ? !!selectedRackId : !!selectedEquipmentId;

                            // Link Visualization Logic
                            const nextRow = rows[idx + 1];
                            const prevRow = rows[idx - 1];
                            const isLinkedToNext = row.proInventoryId && nextRow && nextRow.proInventoryId === row.proInventoryId && row.source !== nextRow.source;
                            const isLinkedToPrev = row.proInventoryId && prevRow && prevRow.proInventoryId === row.proInventoryId && row.source !== prevRow.source;

                            return (
                                <tr
                                    key={`${row.source}-${row.id}-${idx}`}
                                    ref={el => { if (isBim) rowRefs.current[row.id] = el; }}
                                    className={`
                     transition-all cursor-pointer group h-16 border-b border-white/5 relative
                     ${!isBim ? 'bg-slate-900/40' : ''}
                     ${isSelected ? 'bg-blue-600/30 border-l-4 border-l-blue-400 shadow-lg z-10 scale-[1.002]' : 'hover:bg-blue-600/5 border-l-4 border-l-transparent'}
                     ${hasSelection && !isSelected && isBim ? 'opacity-40 grayscale-[0.5] blur-[0.2px]' : ''}
                  `}
                                    onClick={(e) => isBim && onSelect(activeTab === 'RACKS' ? 'RACK' : 'EQUIPMENT', row.id, false)}
                                    draggable={!isBim}
                                    onDragStart={(e) => {
                                        if (!isBim) {
                                            e.dataTransfer.setData('text/plain', JSON.stringify({ id: row.id, type: row.type }));
                                        }
                                    }}
                                    onDragOver={(e) => isBim && e.preventDefault()}
                                    onDrop={(e) => isBim && handleDrop(e, row)}
                                >
                                    <td className="w-12 relative overflow-visible">
                                        {/* Connector Line */}
                                        {isLinkedToNext && (
                                            <div className="absolute left-1/2 bottom-0 w-0.5 h-1/2 bg-blue-500/30 -translate-x-1/2 z-0" />
                                        )}
                                        {isLinkedToPrev && (
                                            <div className="absolute left-1/2 top-0 w-0.5 h-1/2 bg-blue-500/30 -translate-x-1/2 z-0" />
                                        )}

                                        {/* Link Icon */}
                                        {(isLinkedToNext || isLinkedToPrev) && (
                                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                                <div className="bg-slate-950 p-1 rounded-full border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                                    <Link2 size={10} className="text-blue-400 rotate-45" />
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {activeTab === 'RACKS' ? (
                                        <>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs">
                                                {row.source === 'BIM' ? (
                                                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">BIM</span>
                                                ) : (
                                                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">PRO</span>
                                                )}
                                            </td>
                                            <td className={`px-6 py-4 font-mono ${isMissingId ? 'bg-red-500/20 text-red-300' : 'font-bold text-slate-200'}`}>
                                                {displayId || '[MISSING]'}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-300">{row.building || 'n/a'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300">
                                                <span className={row.source === 'PRO' && row.suite && !row.building?.includes('OPEN') ? 'text-amber-400' : ''}>
                                                    {row.suite}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-200 font-mono font-bold text-base text-center">{(!row.lineUp || row.lineUp === '-') ? '-' : String(row.lineUp).padStart(3, '0')}</td>
                                            <td className="px-6 py-4 text-slate-200 font-mono font-bold text-base text-center">{(!row.bayNo || row.bayNo === '-') ? '-' : String(row.bayNo).padStart(3, '0')}</td>
                                            <td className="px-6 py-4 text-slate-400 text-xs uppercase tracking-wider font-bold">{row.definition || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs bg-slate-900/20">{row.rackW || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs bg-slate-900/20">{row.rackD || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs bg-slate-900/20">{row.rackH || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs">{row.ownerName || '-'}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs">
                                                {row.source === 'BIM' ? (
                                                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">BIM</span>
                                                ) : (
                                                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">PRO</span>
                                                )}
                                            </td>
                                            <td className={`px-6 py-4 font-mono ${isMissingEqId ? 'bg-red-500/20 text-red-300' : 'font-bold text-white'}`}>
                                                {displayId || '[MISSING]'}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-300">{row.building || 'n/a'}</td>
                                            <td className="px-6 py-4 text-slate-200 font-mono font-bold text-base text-center">{(!row.lineUp || row.lineUp === '-') ? '-' : String(row.lineUp).padStart(3, '0')}</td>
                                            <td className="px-6 py-4 text-slate-200 font-mono font-bold text-base text-center">{(!row.bayNo || row.bayNo === '-') ? '-' : String(row.bayNo).padStart(3, '0')}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs">{row.vendorName || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs truncate max-w-[150px]" title={row.model}>{row.model || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs text-center">{String(row.rmu || '-').replace(/^0+(?=\d)/, '')}</td>
                                            <td className="px-6 py-4 font-mono text-slate-300 text-xs">{row.ownerName || '-'}</td>
                                        </>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-lg shadow-black/50" style={{ backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}40` }}></div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{STATUS_LABELS[row.status as Status4D]}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {rows.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                        <FilterX size={48} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">No matching records found in ledger</p>
                    </div>
                )}
            </div>
        </div >
    );
};

// Extracted Subcomponents to prevent re-mounting focus loss
const SortIcon = ({ column, sortConfig }: { column: string, sortConfig: any }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />;
};

const FilterInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
    return (
        <div className="relative mt-2" onClick={(e) => e.stopPropagation()}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-8 py-1.5 text-[9px] font-bold text-slate-300 placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
            />
            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
        </div>
    );
};

export default InventoryPanel;
