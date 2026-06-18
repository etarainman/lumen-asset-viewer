
import React, { useState, useMemo } from 'react';
import { Equipment, Rack, Status4D, ProInventoryItem } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import {
  ChevronDown,
  CheckCircle2,
  Link,
  AlertCircle,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  FilterX,
  Upload,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

interface InventoryPanelProps {
  equipment: Equipment[];
  racks: Rack[];
  proInventory: ProInventoryItem[];
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

const InventoryPanel: React.FC<InventoryPanelProps> = ({
  equipment,
  racks,
  proInventory,
  onSelect,
  onLink,
  onImport,
  onProcess,
  filterBuildingCode,
  onHeightChange,
  height,
  isOpen,
  onToggle
}) => {
  const [activeTab, setActiveTab] = useState<'RACKS' | 'EQUIPMENT'>('RACKS');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) return;

      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().toUpperCase());

      const isGranite = headers.includes('BAY NAME') && (headers.includes('RACK ID') || headers.includes('EQPT_ID'));
      let items: ProInventoryItem[] = [];

      if (isGranite) {
        const idxBayName = headers.indexOf('BAY NAME');
        const idxEqName = headers.indexOf('EQUIPMENT NAME');
        const idxRackId = headers.indexOf('RACK ID');
        const idxEqId = headers.indexOf('EQPT_ID');
        const idxRackStatus = headers.indexOf('RACK STATUS');
        const idxEqStatus = headers.indexOf('EQPT STATUS');

        items = lines.slice(1).map((line, idx) => {
          const cols = line.split(',');

          const eqId = cols[idxEqId]?.trim();
          const rackId = cols[idxRackId]?.trim();
          const isEq = !!eqId && eqId.length > 0;
          const isRack = !isEq && !!rackId && rackId.length > 0;

          if (!isEq && !isRack) return null;

          const id = isEq ? eqId : rackId;
          const type = isEq ? 'EQUIPMENT' : 'RACK';
          const bayName = cols[idxBayName]?.trim() || '';
          const eqName = cols[idxEqName]?.trim() || '';

          const locParts = bayName.split('.');
          const csvBuilding = locParts[2];

          if (filterBuildingCode && csvBuilding) {
            const normCsv = csvBuilding.replace(/^0+/, '').trim().toLowerCase();
            const normFilter = filterBuildingCode.replace(/^0+/, '').trim().toLowerCase();

            // Allow match if normalized versions match, or if one contains the other
            if (normCsv !== normFilter && !csvBuilding.toLowerCase().includes(filterBuildingCode.toLowerCase()) && !filterBuildingCode.toLowerCase().includes(csvBuilding.toLowerCase())) {
              return null;
            }
          }

          const building = locParts[1] || '';
          const suite = locParts[2] || '';
          const lineUp = locParts[4] || '000';
          const bayNo = locParts[5] || '000';

          let rmu = '0';
          if (isEq && eqName) {
            const eqParts = eqName.split('.');
            const last = eqParts[eqParts.length - 1];
            if (!isNaN(parseInt(last))) rmu = last;
          }

          const rawStatus = isEq ? cols[idxEqStatus] : cols[idxRackStatus];
          let status = Status4D.PROPOSED;
          if (rawStatus?.toUpperCase().includes('IN SERVICE')) status = Status4D.RETAIN;

          let name = 'Unknown';
          if (isEq && eqName) {
            name = eqName.split('.')[1] || eqName;
          } else {
            name = bayName || 'Rack';
          }

          return {
            id, name, type, rackId: isEq ? rackId : '', status, location: bayName, lineUp, bayNo, rmu, building, suite
          } as ProInventoryItem;
        }).filter(x => x !== null) as ProInventoryItem[];

      } else {
        const hLower = headers.map(h => h.toLowerCase());
        const getIdx = (patterns: string[]) => hLower.findIndex(h => patterns.some(p => h.includes(p)));

        const idIdx = getIdx(['id', 'tag', 'asset']);
        const nameIdx = getIdx(['name', 'label', 'description']);
        const typeIdx = getIdx(['type', 'category']);
        const locIdx = getIdx(['location', 'clli', 'address']);

        items = lines.slice(1).map((line, idx) => {
          const cols = line.split(',');
          const id = cols[idIdx > -1 ? idIdx : 0]?.trim() || `PRO-${Date.now()}-${idx}`;
          const name = cols[nameIdx > -1 ? nameIdx : 1]?.trim() || 'Unknown';
          const typeRaw = cols[typeIdx > -1 ? typeIdx : 2]?.trim().toUpperCase();
          const type = (typeRaw?.includes('RACK') ? 'RACK' : 'EQUIPMENT') as 'RACK' | 'EQUIPMENT';
          const loc = cols[locIdx > -1 ? locIdx : 3]?.trim() || '';

          let lineUp = '000', bayNo = '000', rmu = '0';
          const locParts = loc.split('.');
          if (locParts.length >= 6) {
            lineUp = locParts[4] || '000';
            bayNo = locParts[5] || '000';
            if (type === 'EQUIPMENT' && locParts[6]) rmu = locParts[6];
          }

          return {
            id, name, type, rackId: '', status: Status4D.PROPOSED, location: loc, lineUp, bayNo, rmu
          } as ProInventoryItem;
        });
      }

      onImport(items);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent, targetBimRow: any) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      // Only allow dropping matching types (or Eq -> Rack if supporting parenting, but prompt says LINK)
      if (data.type === targetBimRow.type) {
        onLink(targetBimRow.id, data.id, data.type);
      }
    } catch (err) { console.error(err); }
  };

  const rows = useMemo(() => {
    let data: any[] = [];

    // Helper to generate sort key for Alternating View
    // Format: LineUp.Bay.RMU (Zero padded)
    const getSortKey = (item: any, src: string) => {
      const lu = (item.lineUp || '999').toString().padStart(3, '0');
      const bay = (item.bayNo || '999').toString().padStart(3, '0');
      let rmu = '00';
      if (item.baseRMU) rmu = (item.baseRMU || 0).toString().padStart(2, '0');
      if (item.rmu) rmu = (item.rmu || 0).toString().padStart(2, '0');

      // Pro items should appear AFTER BIM items for same location? Or interleaved?
      // User says "our inventory file record and then we would have the pro inventory record"
      // So BIM (0) then PRO (1)
      const srcPriority = src === 'BIM' ? '0' : '1';
      return `${lu}.${bay}.${rmu}.${srcPriority}`;
    };

    if (activeTab === 'RACKS') {
      const bimRacks = racks.map(r => ({
        ...r,
        source: 'BIM',
        type: 'RACK',
        sync: r.isVerified ? 'Verified' : 'Unsynced',
        sortKey: getSortKey(r, 'BIM'),
        rackId: r.id,
        proInventoryId: '',
        building: (r as any).building || '-',
        suite: (r as any).suite || '-'
      }));
      const proRacks = proInventory.filter(p => p.type === 'RACK').map(p => ({
        ...p,
        source: 'PRO',
        sync: 'Unknown',
        sortKey: getSortKey(p, 'PRO'),
        rackId: p.id,
        proInventoryId: ''
      }));
      data = [...bimRacks, ...proRacks];
    } else {
      const bimEq = equipment.map(e => {
        const parentRack = racks.find(r => r.id === e.rackId);
        const derived = {
          lineUp: parentRack?.lineUp || '-',
          bayNo: parentRack?.bayNo || '-',
          building: (e as any).building || (parentRack as any)?.building || '-',
          suite: (e as any).suite || (parentRack as any)?.suite || '-'
        };
        return {
          ...e,
          source: 'BIM',
          type: 'EQUIPMENT',
          ...derived,
          sync: e.isVerified ? 'Verified' : 'Unsynced',
          sortKey: getSortKey({ ...e, ...derived }, 'BIM'),
          rackId: e.rackId,
          proInventoryId: e.id
        };
      });
      const proEq = proInventory.filter(p => p.type === 'EQUIPMENT').map(p => ({
        ...p,
        source: 'PRO',
        sync: 'Unknown',
        sortKey: getSortKey(p, 'PRO'),
        // rackId is present
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
    // Default sort is by SortKey (Alternating)
    filteredData.sort((a, b) => {
      if (sortConfig) {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      } else {
        // Default Alternating Sort
        if (a.sortKey < b.sortKey) return -1;
        if (a.sortKey > b.sortKey) return 1;
        return 0;
      }
    });

    return filteredData;
  }, [equipment, racks, proInventory, activeTab, sortConfig, filters]);

  if (!isOpen) return null;

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />;
  };

  const FilterInput = ({ column, placeholder, type = 'text' }: { column: string, placeholder: string, type?: 'text' | 'select' }) => {
    return (
      <div className="relative mt-2">
        <input
          type="text"
          value={filters[column] || ''}
          onChange={(e) => handleFilterChange(column, e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-8 py-1.5 text-[9px] font-bold text-slate-300 placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
        />
        <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
      </div>
    );
  };

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

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30 cursor-pointer hover:bg-blue-600 hover:text-white transition-all">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
            <Upload size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Import CSV</span>
          </label>
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

      <div className="flex-1 overflow-auto px-6 pb-6">
        <table className="w-full text-[11px] text-left border-collapse table-fixed">
          <thead className="bg-slate-950/80 sticky top-0 z-10">
            <tr className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
              <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('rackId')}>
                <div className="flex items-center gap-2">RACK ID <SortIcon column="rackId" /></div>
                <FilterInput column="rackId" placeholder="Search..." />
              </th>
              {activeTab === 'EQUIPMENT' && (
                <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('proInventoryId')}>
                  <div className="flex items-center gap-2">EQUIPMENT ID <SortIcon column="proInventoryId" /></div>
                  <FilterInput column="proInventoryId" placeholder="Search..." />
                </th>
              )}
              <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('building')}>
                <div className="flex items-center gap-2">Building <SortIcon column="building" /></div>
                <FilterInput column="building" placeholder="Filter..." />
              </th>
              <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('suite')}>
                <div className="flex items-center gap-2">Suite <SortIcon column="suite" /></div>
                <FilterInput column="suite" placeholder="Filter..." />
              </th>
              <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('lineUp')}>
                <div className="flex items-center gap-2 text-blue-400">Line Up <SortIcon column="lineUp" /></div>
                <FilterInput column="lineUp" placeholder="#" />
              </th>
              <th className="px-6 py-4 w-28 cursor-pointer group" onClick={() => handleSort('bayNo')}>
                <div className="flex items-center gap-2 text-blue-400">Bay No <SortIcon column="bayNo" /></div>
                <FilterInput column="bayNo" placeholder="#" />
              </th>
              {activeTab === 'EQUIPMENT' && (
                <th className="px-6 py-4 w-20 cursor-pointer group" onClick={() => handleSort('baseRMU')}>
                  <div className="flex items-center gap-2 text-emerald-400">RMU <SortIcon column="baseRMU" /></div>
                  <FilterInput column="baseRMU" placeholder="U" />
                </th>
              )}
              {activeTab === 'RACKS' && (
                <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('definition')}>
                  <div className="flex items-center gap-2">Definition <SortIcon column="definition" /></div>
                  <FilterInput column="definition" placeholder="Filter..." />
                </th>
              )}
              <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-2">Status <SortIcon column="status" /></div>
                <FilterInput column="status" placeholder="Filter..." />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row: any, idx) => {
              const isBim = row.source === 'BIM';
              const statusColor = STATUS_COLORS[row.status as Status4D];
              const displayId = (row.proInventoryId && row.proInventoryId.trim() !== '')
                ? row.proInventoryId
                : (row.id && row.id.trim() !== '')
                  ? row.id
                  : '[REQUIRED]';

              const isMissingId = isBim && row.type === 'RACK' && (!row.proInventoryId || row.proInventoryId.trim() === '');

              return (
                <tr
                  key={`${row.source}-${row.id}-${idx}`}
                  className={`hover:bg-blue-600/5 transition-all cursor-pointer group h-14 ${!isBim ? 'bg-slate-900/40' : ''}`}
                  onClick={(e) => isBim && onSelect(activeTab === 'RACKS' ? 'RACK' : 'EQUIPMENT', row.id, e.ctrlKey)}
                  draggable={!isBim}
                  onDragStart={(e) => {
                    if (!isBim) {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ id: row.id, type: row.type }));
                    }
                  }}
                  onDragOver={(e) => isBim && e.preventDefault()}
                  onDrop={(e) => isBim && handleDrop(e, row)}
                >
                  <td className={`px-6 py-2 font-mono text-[10px] ${isMissingId ? 'bg-red-500/20 text-red-300' : 'text-white'}`}>
                    {row.type === 'RACK' ? (isBim ? (row.proInventoryId || '') : row.id) : (row.rackId || '-')}
                  </td>
                  {activeTab === 'EQUIPMENT' && (
                    <td className={`px-6 py-2 font-mono text-[10px] ${row.type === 'EQUIPMENT' ? 'font-bold text-white' : 'text-slate-500'}`}>
                      {row.type === 'EQUIPMENT' ? displayId : '-'}
                    </td>
                  )}
                  <td className="px-6 py-3 font-mono text-[10px] text-slate-300">{row.building || 'n/a'}</td>
                  <td className="px-6 py-3 font-mono text-[10px] text-slate-300">
                    <span className={row.source === 'PRO' && row.suite && !row.building?.includes('OPEN') ? 'text-amber-400' : ''}>
                      {row.suite || 'n/a'}
                    </span>
                  </td>
                  <td className="px-6 py-2 text-slate-300 font-mono font-bold">
                    {row.lineUp || '-'}
                  </td>
                  <td className="px-6 py-2 text-slate-300 font-mono font-bold">
                    {row.bayNo || '-'}
                  </td>
                  {activeTab === 'EQUIPMENT' && (
                    <td className="px-6 py-2 text-emerald-400 font-mono font-bold">
                      {row.baseRMU || '-'}
                    </td>
                  )}
                  {activeTab === 'RACKS' && (
                    <td className="px-6 py-2 text-slate-400 text-[10px]">
                      Standard Rack
                    </td>
                  )}
                  <td className="px-6 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }}></div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{STATUS_LABELS[row.status as Status4D]}</span>
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
    </div>
  );
};

export default InventoryPanel;
