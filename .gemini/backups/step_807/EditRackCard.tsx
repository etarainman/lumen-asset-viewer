
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Rack, Status4D, RackDefinition, EquipmentDefinition, OwnerDefinition } from '../types';
import { X, GripHorizontal, Trash2, Box, Layers, RotateCw, MapPin, Hash, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Copy, Plus } from 'lucide-react';

interface EditRackCardProps {
  rack: Rack;
  rackDefs: RackDefinition[];
  equipmentDefs: EquipmentDefinition[];
  owners: OwnerDefinition[];
  statuses: { id: string; label: string }[];
  onUpdate: (id: string, updates: Partial<Rack>) => void;
  onUpdateId: (oldId: string, newId: string) => void;
  onClose: () => void;
  mode: AppMode;
  onDelete: (id: string) => void;
  onMove: (direction: 'F' | 'B' | 'L' | 'R', shiftKey: boolean) => void;
  onAddHardware: (defId: string, uPos: number) => void;
  onArrayClone: (seedRack: Rack, count: number, spacing: number, direction: 'L' | 'R') => void;
}

const EditRackCard: React.FC<EditRackCardProps> = ({
  rack, rackDefs, equipmentDefs, owners, statuses, onUpdate, onUpdateId, onClose, mode, onDelete, onMove, onAddHardware, onArrayClone
}) => {
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [cloneCount, setCloneCount] = useState(1);
  const [cloneSpacing, setCloneSpacing] = useState(2.0); // Ft

  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardStartPos = useRef({ x: 0, y: 0 });

  const isReadOnly = mode === 'VIEW';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({ x: cardStartPos.current.x + (e.clientX - dragStartPos.current.x), y: cardStartPos.current.y + (e.clientY - dragStartPos.current.y) });
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true); dragStartPos.current = { x: e.clientX, y: e.clientY }; cardStartPos.current = { ...position };
  };

  return (
    <div className="absolute w-[300px] bg-white shadow-2xl rounded-3xl border border-slate-400 z-[120] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
      <div className="flex items-center justify-between px-5 py-3 bg-slate-950 text-white cursor-move select-none" onMouseDown={handleMouseDown}>
        <div className="flex items-center gap-2">
          <Hash size={14} className="text-blue-400" />
          <span className="font-black text-[13px] tracking-tight truncate max-w-[140px]">{rack.label}</span>
        </div>
        <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
          <button onClick={() => setShowClone(!showClone)} className={`p-1 transition-all ${showClone ? 'text-white' : 'text-slate-500 hover:text-white'}`}><Copy size={14} /></button>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white ml-1 transition-all"><X size={16} /></button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

        {/* Clone Tool */}
        {showClone && (
          <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 mb-2">
            <div className="text-[9px] font-black uppercase text-slate-500 mb-2">Array Clone</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[8px] block text-slate-400 font-bold">Count</label>
                <input type="number" value={cloneCount} onChange={e => setCloneCount(parseInt(e.target.value))} className="w-full text-xs font-bold p-1 rounded border border-slate-300" min={1} max={10} />
              </div>
              <div>
                <label className="text-[8px] block text-slate-400 font-bold">Spacing (ft)</label>
                <input type="number" value={cloneSpacing} onChange={e => setCloneSpacing(parseFloat(e.target.value))} className="w-full text-xs font-bold p-1 rounded border border-slate-300" step={0.1} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onArrayClone(rack, cloneCount, cloneSpacing, 'L')} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-[9px] font-bold py-1 rounded">Clone Left</button>
              <button onClick={() => onArrayClone(rack, cloneCount, cloneSpacing, 'R')} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-[9px] font-bold py-1 rounded">Clone Right</button>
            </div>
          </div>
        )}

        {/* Nudge Controls */}
        {!isReadOnly && (
          <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="col-start-2 place-self-center">
              <button onClick={(e) => onMove('F', e.shiftKey)} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all" title="Move Forward (Shift+Click for 1ft)"><ArrowUp size={14} className="text-slate-700" /></button>
            </div>
            <div className="col-start-1 col-end-4 flex justify-between px-4">
              <button onClick={(e) => onMove('L', e.shiftKey)} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all" title="Move Left"><ArrowLeft size={14} className="text-slate-700" /></button>
              <button onClick={(e) => onMove('R', e.shiftKey)} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all" title="Move Right"><ArrowRight size={14} className="text-slate-700" /></button>
            </div>
            <div className="col-start-2 place-self-center">
              <button onClick={(e) => onMove('B', e.shiftKey)} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all" title="Move Back"><ArrowDown size={14} className="text-slate-700" /></button>
            </div>
          </div>
        )}

        {/* Definition */}
        <div>
          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Template</label>
          <select value={rack.definitionId} onChange={e => onUpdate(rack.id, { definitionId: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-bold border-b border-slate-300 pb-1 outline-none bg-transparent uppercase truncate text-slate-950">
            {rackDefs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.totalU}U)</option>)}
          </select>
        </div>

        {/* Location Info */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-300">
          <div>
            <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Line Up</label>
            <input type="text" value={rack.lineUp} onChange={e => onUpdate(rack.id, { lineUp: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-bold border-none outline-none bg-transparent text-slate-950" />
          </div>
          <div>
            <label className="text-[8px] font-black text-blue-600 uppercase mb-1 block tracking-widest">Bay No</label>
            <input type="text" value={rack.bayNo} onChange={e => onUpdate(rack.id, { bayNo: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-black bg-transparent border-none outline-none text-slate-950" />
          </div>
          <div className="col-span-2 border-t border-slate-200 pt-2">
            <label className="text-[8px] font-black text-amber-600 uppercase mb-1 block tracking-widest">Suite (Legacy/Override)</label>
            <input type="text" value={rack.suite || ''} onChange={e => onUpdate(rack.id, { suite: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-black bg-transparent border-none outline-none text-slate-950" placeholder="Auto-Detected" />
          </div>
        </div>

        {/* Orientation */}
        <div>
          <label className="block text-[8px] font-black text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-1">
            <RotateCw size={10} /> Orientation
          </label>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-400 shadow-inner">
            {[0, 90, 180, 270].map(deg => (
              <button
                key={deg}
                onClick={() => onUpdate(rack.id, { rotation: (deg * Math.PI) / 180 })}
                disabled={isReadOnly}
                className={`flex-1 py-1 rounded-xl text-[9px] font-black transition-all ${Math.abs((rack.rotation || 0) - (deg * Math.PI) / 180) < 0.1
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="text-[8px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Lifecycle Status</label>
          <select value={rack.status} onChange={e => onUpdate(rack.id, { status: e.target.value as Status4D })} disabled={isReadOnly || mode === 'EDIT'} className="w-full text-[9px] font-black border border-slate-400 rounded-lg p-1.5 outline-none bg-slate-50 text-slate-950 appearance-none uppercase">
            {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {!isReadOnly && (
          <div className="pt-2 border-t border-slate-50">
            {!isDeleting ? (
              <button onClick={() => setIsDeleting(true)} className="w-full text-[8px] font-black uppercase text-red-500 hover:text-red-700 tracking-widest flex items-center justify-center gap-1.5 py-1.5"><Trash2 size={10} /> Delete</button>
            ) : (
              <div className="flex gap-1.5 animate-in slide-in-from-top-1">
                <button onClick={() => setIsDeleting(false)} className="flex-1 bg-slate-100 text-slate-600 text-[8px] font-black py-1.5 rounded-lg uppercase">Cancel</button>
                <button onClick={() => onDelete(rack.id)} className="flex-1 bg-red-600 text-white text-[8px] font-black py-1.5 rounded-lg uppercase">Confirm</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditRackCard;
