
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
  FilterX
} from 'lucide-react';

interface InventoryPanelProps {
  equipment: Equipment[];
  racks: Rack[];
  proInventory: ProInventoryItem[];
  onSelect: (type: 'EQUIPMENT' | 'RACK', id: string) => void;
  onLink: (bimId: string, proId: string, type: 'EQUIPMENT' | 'RACK') => void;
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
  height, 
  isOpen, 
  onToggle 
}) => {
  const [activeTab, setActiveTab] = useState<'RACKS' | 'EQUIPMENT'>('RACKS');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

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
  };

  const rows = useMemo(() => {
    let data: any[] = [];
    if (activeTab === 'RACKS') {
      const bimRacks = racks.map(r => ({ 
        ...r, 
        source: 'BIM',
        sync: r.isVerified ? 'Verified' : 'Unsynced'
      }));
      const proRacks = proInventory.filter(p => p.type === 'RACK').map(p => ({ 
        ...p, 
        source: 'PRO',
        sync: 'Unknown'
      }));
      data = [...bimRacks, ...proRacks];
    } else {
      const bimEq = equipment.map(e => {
        const parentRack = racks.find(r => r.id === e.rackId);
        return { 
          ...e, 
          source: 'BIM',
          lineUp: parentRack?.lineUp || '-',
          bayNo: parentRack?.bayNo || '-',
          sync: e.isVerified ? 'Verified' : 'Unsynced'
        };
      });
      const proEq = proInventory.filter(p => p.type === 'EQUIPMENT').map(p => ({ 
        ...p, 
        source: 'PRO',
        sync: 'Unknown'
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
    if (sortConfig) {
      filteredData.sort((a, b) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

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
          className="w-full bg-slate-900/80 border border-white/5 rounded-lg px-8 py-1.5 text-[9px] font-bold text-slate-300 placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
        />
        <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
      </div>
    );
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 glass-panel shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col z-[60] border-t border-white/10 animate-in slide-in-from-bottom duration-500 rounded-t-[40px]" style={{ height: `${height}px` }}>
      <div className="flex items-center justify-between px-10 py-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <h3 className="font-black text-[11px] uppercase tracking-[0.3em] text-blue-500 flex items-center gap-2 mb-1">
                  <Database size={14} /> Pro Inventory Explorer
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{rows.length} Segmented Records Found</span>
            </div>
            
            <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5">
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
            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-blue-400 uppercase">Granite-Sync Active</span>
            </div>
            <button onClick={onToggle} className="text-slate-400 hover:text-white p-2 bg-white/5 rounded-full transition-all border border-white/5"><ChevronDown size={24} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <table className="w-full text-[11px] text-left border-collapse table-fixed">
          <thead className="bg-slate-950/80 sticky top-0 z-10">
            <tr className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
              <th className="px-6 py-4 w-32 cursor-pointer group" onClick={() => handleSort('source')}>
                <div className="flex items-center gap-2">Source <SortIcon column="source" /></div>
                <FilterInput column="source" placeholder="Filter..." />
              </th>
              <th className="px-6 py-4 w-48 cursor-pointer group" onClick={() => handleSort('proInventoryId')}>
                <div className="flex items-center gap-2">Granite ID <SortIcon column="proInventoryId" /></div>
                <FilterInput column="proInventoryId" placeholder="Search ID..." />
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
              <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('label')}>
                <div className="flex items-center gap-2">Label <SortIcon column="label" /></div>
                <FilterInput column="label" placeholder="Search..." />
              </th>
              <th className="px-6 py-4 w-40 cursor-pointer group" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-2">Status <SortIcon column="status" /></div>
                <FilterInput column="status" placeholder="Filter..." />
              </th>
              <th className="px-6 py-4 w-32 cursor-pointer group text-right pr-10" onClick={() => handleSort('sync')}>
                <div className="flex items-center justify-end gap-2">Sync <SortIcon column="sync" /></div>
                <FilterInput column="sync" placeholder="Any" />
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

              return (
                <tr 
                  key={`${row.source}-${row.id}-${idx}`} 
                  className={`hover:bg-blue-600/5 transition-all cursor-pointer group h-14`}
                  onClick={() => isBim && onSelect(activeTab === 'RACKS' ? 'RACK' : 'EQUIPMENT', row.id)}
                >
                  <td className="px-6 py-2">
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${isBim ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
                        {isBim ? 'BIM Model' : 'Granite'}
                    </span>
                  </td>
                  <td className={`px-6 py-2 font-mono font-bold tracking-tight ${displayId === '[REQUIRED]' ? 'text-red-500 animate-pulse' : !row.proInventoryId && isBim ? 'text-slate-500 italic' : 'text-white'}`}>
                    {displayId}
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
                  <td className="px-6 py-2">
                    <span className="font-bold text-slate-400 uppercase truncate block">{row.label || row.name}</span>
                  </td>
                  <td className="px-6 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }}></div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{STATUS_LABELS[row.status as Status4D]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-2 text-right pr-10">
                    {isBim ? (
                        <div className="flex items-center justify-end gap-2">
                            {row.isVerified ? (
                                <span className="text-emerald-400 font-black text-[9px] uppercase tracking-widest"><CheckCircle2 size={12} className="inline mr-1"/> OK</span>
                            ) : (
                                <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest"><AlertCircle size={12} className="inline mr-1"/> Unsynced</span>
                            )}
                        </div>
                    ) : (
                        <button className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full border border-white/5">
                            <Link size={16} />
                        </button>
                    )}
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
