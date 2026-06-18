
import React, { useState, useRef, useEffect } from 'react';
import { Building, AppMode, Status4D, BuildingDefinition, StatusDefinition, OwnerDefinition } from '../types';
import { X, Trash2, LogIn, Hash, Box, Layers, GripHorizontal, User, RotateCw, BoxSelect } from 'lucide-react';

interface EditBuildingCardProps {
  building: Building;
  buildingDefs: BuildingDefinition[];
  onUpdate: (id: string, updates: Partial<Building>) => void;
  onEnter: (id: string) => void;
  onClose: () => void;
  mode: AppMode;
  onDelete: (id: string) => void;
  statuses: StatusDefinition[];
  owners: OwnerDefinition[];
}

const EditBuildingCard: React.FC<EditBuildingCardProps> = ({ building, buildingDefs, onUpdate, onEnter, onClose, mode, onDelete, statuses, owners }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardStartPos = useRef({ x: 0, y: 0 });

  const isReadOnly = mode === 'VIEW';
  
  // Normalize building label to match map display (0001)
  const displayLabel = building.label.padStart(4, '0');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({ 
        x: cardStartPos.current.x + (e.clientX - dragStartPos.current.x), 
        y: cardStartPos.current.y + (e.clientY - dragStartPos.current.y) 
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true); dragStartPos.current = { x: e.clientX, y: e.clientY }; cardStartPos.current = { ...position };
  };

  const isRotationActive = (deg: number) => {
    let cur = Math.round((building.rotation || 0) * (180 / Math.PI));
    cur = ((cur % 360) + 360) % 360;
    return Math.abs(cur - deg) < 5;
  };

  return (
    <div 
      className="absolute w-[340px] bg-white shadow-2xl rounded-[32px] border border-slate-200 z-[120] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="flex items-center justify-between p-6 bg-slate-950 text-white cursor-move select-none" onMouseDown={handleMouseDown}>
        <div className="flex items-center gap-4">
            <GripHorizontal size={20} className="text-slate-500" />
            <div className="flex flex-col text-white">
              <span className="text-[10px] font-black text-slate-100 tracking-[0.25em] uppercase">Building Assets</span>
            </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full border border-white/5"><X size={18}/></button>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1"><Hash size={10}/> Shell ID</label>
              <input 
                type="text" 
                value={displayLabel} 
                onChange={e => onUpdate(building.id, { label: e.target.value })} 
                disabled={isReadOnly} 
                className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 text-slate-900 shadow-inner disabled:opacity-50 transition-all" 
              />
          </div>
          <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1"><Box size={10}/> Definition</label>
              <select 
                value={building.definitionId} 
                onChange={e => onUpdate(building.id, { definitionId: e.target.value })}
                disabled={isReadOnly}
                className="w-full text-[9px] font-black border border-slate-200 rounded-xl p-3 outline-none bg-slate-50 text-slate-900 uppercase appearance-none shadow-inner disabled:opacity-50 transition-all cursor-pointer"
              >
                {buildingDefs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1"><Layers size={10}/> 4D Status</label>
                <select 
                    value={building.status} 
                    onChange={e => onUpdate(building.id, { status: e.target.value as Status4D })}
                    disabled={isReadOnly || mode === 'EDIT'}
                    className="w-full text-[9px] font-black border border-slate-200 rounded-xl p-3 outline-none bg-slate-50 text-slate-900 appearance-none shadow-inner disabled:opacity-50 transition-all"
                >
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1"><User size={10}/> Owner</label>
                <select 
                    value={building.ownerId} 
                    onChange={e => onUpdate(building.id, { ownerId: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full text-[9px] font-black border border-slate-200 rounded-xl p-3 outline-none bg-slate-50 text-slate-900 appearance-none shadow-inner disabled:opacity-50 transition-all"
                >
                    {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
            </div>
        </div>

        <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-1">
                <RotateCw size={10} /> Base Orientation
            </label>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200 shadow-inner">
                {[0, 90, 180, 270].map(deg => (
                    <button 
                        key={deg} 
                        disabled={isReadOnly}
                        onClick={() => onUpdate(building.id, { rotation: deg * (Math.PI / 180) })} 
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${isRotationActive(deg) ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-50'}`}
                    >
                        {deg}°
                    </button>
                ))}
            </div>
        </div>

        <div className="pt-2 space-y-4">
          <button 
            onClick={() => onEnter(building.id)} 
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/30 transition-all hover:scale-[1.03] active:scale-95 group"
          >
            <BoxSelect size={18} className="group-hover:rotate-12 transition-transform" /> VIEW 3D BIM MODEL
          </button>
          
          <div className="flex items-center gap-2 justify-center py-2 px-4 bg-slate-50 rounded-xl border border-slate-100">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Site Data Synchronized</span>
          </div>
        </div>

        {!isReadOnly && (
          <div className="pt-2 flex justify-center border-t border-slate-100">
            <button 
              onClick={() => onDelete(building.id)} 
              className="flex items-center gap-2 text-[9px] font-black uppercase text-red-500 hover:text-red-700 transition-all tracking-[0.15em] px-4 py-3 hover:bg-red-50 rounded-xl"
            >
              <Trash2 size={12} /> Purge Shell
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditBuildingCard;
