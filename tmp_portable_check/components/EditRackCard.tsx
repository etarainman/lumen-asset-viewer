
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Rack, Status4D, OwnerDefinition, StatusDefinition, RackDefinition, EquipmentDefinition } from '../types';
import { X, GripHorizontal, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trash2, Camera, FileText, User, Layers, Box, Plus, MapPin, Hash, Move } from 'lucide-react';
import InfoModal from './InfoModal';
import PhotoGalleryModal from './PhotoGalleryModal';

interface EditRackCardProps {
  rack: Rack;
  rackDefs: RackDefinition[];
  equipmentDefs: EquipmentDefinition[];
  onAddHardware: (defId: string, uPos: number) => void;
  owners: OwnerDefinition[];
  statuses: StatusDefinition[];
  onUpdate: (id: string, updates: Partial<Rack>) => void;
  onUpdateId?: (oldId: string, newId: string) => void;
  onMove: (direction: 'F' | 'B' | 'L' | 'R') => void;
  onClose: () => void;
  mode: AppMode;
  onDelete: (id: string) => void;
}

const EditRackCard: React.FC<EditRackCardProps> = ({ 
  rack, rackDefs, equipmentDefs, onAddHardware, owners, statuses, onUpdate, onUpdateId, onMove, onClose, mode, onDelete 
}) => {
  const [position, setPosition] = useState({ x: 40, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardStartPos = useRef({ x: 0, y: 0 });
  
  const [showInfo, setShowInfo] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  const [selectedEqDefId, setSelectedEqDefId] = useState(equipmentDefs[0]?.id || '');
  const [uPos, setUPos] = useState(1);

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

  const isRotationActive = (deg: number) => {
     let cur = Math.round((rack.rotation || 0) * (180/Math.PI));
     cur = ((cur % 360) + 360) % 360;
     return Math.abs(cur - deg) < 5;
  };

  const isReadOnly = mode === 'VIEW';

  const formatThreeDigit = (val: string) => val.replace(/\D/g, '').slice(0, 3).padStart(3, '0');

  const updateLineUp = (val: string) => {
    const formatted = formatThreeDigit(val);
    onUpdate(rack.id, { lineUp: formatted, label: `${formatted}.${rack.bayNo}` });
  };

  const updateBay = (val: string) => {
    const formatted = formatThreeDigit(val);
    onUpdate(rack.id, { bayNo: formatted, label: `${rack.lineUp}.${formatted}` });
  };

  return (
    <>
    <div className="absolute w-[300px] bg-white shadow-2xl rounded-3xl border border-slate-200 z-[120] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
      <div className="flex items-center justify-between px-5 py-3 bg-slate-950 text-white cursor-move select-none shadow-lg" onMouseDown={handleMouseDown}>
        <div className="flex items-center gap-2">
            <span className="font-black text-[13px] tracking-tight">{rack.label || '001.001'}</span>
        </div>
        <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => setShowPhotos(true)} className="p-1 text-blue-400 hover:text-white transition-all"><Camera size={14} /></button>
            <button onClick={() => setShowInfo(true)} className="p-1 text-emerald-400 hover:text-white transition-all"><FileText size={14} /></button>
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-all ml-1"><X size={16}/></button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Identifiers Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            <div className="col-span-2">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Model Type</label>
              <select 
                value={rack.definitionId} 
                onChange={e => onUpdate(rack.id, { definitionId: e.target.value })} 
                disabled={isReadOnly} 
                className="w-full text-[10px] font-bold border-b border-slate-100 pb-1 outline-none bg-transparent text-slate-950 appearance-none disabled:opacity-50"
              >
                {rackDefs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Rack ID</label>
              <input 
                type="text" 
                value={rack.id} 
                onChange={e => onUpdateId?.(rack.id, e.target.value)}
                disabled={isReadOnly} 
                className="w-full text-[10px] font-mono border-b border-slate-100 pb-1 outline-none bg-transparent text-slate-950" 
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Ownership</label>
              <select value={rack.ownerId} onChange={e => onUpdate(rack.id, { ownerId: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-bold border-b border-slate-100 pb-1 outline-none bg-transparent uppercase text-slate-950">
                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
        </div>

        {/* Location Row (Simplified) */}
        <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <MapPin size={12} className="text-blue-500 shrink-0" />
            <div className="flex items-center gap-1 flex-1">
                <input maxLength={3} value={rack.lineUp} onBlur={e => updateLineUp(e.target.value)} onChange={e => onUpdate(rack.id, { lineUp: e.target.value })} disabled={isReadOnly} className="w-10 text-center font-black text-[11px] bg-white rounded border border-blue-100 text-slate-950" />
                <span className="text-blue-300 font-bold">.</span>
                <input maxLength={3} value={rack.bayNo} onBlur={e => updateBay(e.target.value)} onChange={e => onUpdate(rack.id, { bayNo: e.target.value })} disabled={isReadOnly} className="w-10 text-center font-black text-[11px] bg-white rounded border border-blue-100 text-slate-950" />
                <span className="text-[8px] font-black text-blue-500 uppercase ml-auto tracking-widest pr-1">Addr</span>
            </div>
        </div>

        {/* Status & Orientation Row */}
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Status</label>
              <select 
                value={rack.status} 
                onChange={e => onUpdate(rack.id, { status: e.target.value as Status4D })} 
                disabled={isReadOnly || mode === 'EDIT'} 
                className="w-full text-[9px] font-black border border-slate-200 rounded-lg p-1.5 outline-none bg-slate-50 text-slate-950 appearance-none uppercase disabled:opacity-70"
              >
                {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Rotation</label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
                  {[0, 90, 180, 270].map(deg => (
                      <button key={deg} onClick={() => onUpdate(rack.id, { rotation: deg*(Math.PI/180) })} className={`flex-1 py-1 rounded text-[8px] font-black transition-all ${isRotationActive(deg) ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}>{deg}°</button>
                  ))}
              </div>
            </div>
        </div>

        {/* Compact Nudge & Hardware */}
        {!isReadOnly && (
          <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fine Nudge</span>
                  <div className="flex gap-1">
                    {[
                      { icon: ArrowUp, dir: 'F' },
                      { icon: ArrowDown, dir: 'B' },
                      { icon: ArrowLeft, dir: 'L' },
                      { icon: ArrowRight, dir: 'R' }
                    ].map(btn => (
                      <button key={btn.dir} onClick={() => onMove(btn.dir as any)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-md hover:bg-blue-50 transition-all text-slate-600"><btn.icon size={10} /></button>
                    ))}
                  </div>
              </div>

              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <select value={selectedEqDefId} onChange={e => setSelectedEqDefId(e.target.value)} className="flex-1 text-[9px] font-bold border-none outline-none bg-transparent uppercase text-slate-950">
                    {equipmentDefs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <input type="number" value={uPos} onChange={e => setUPos(parseInt(e.target.value))} className="w-8 text-[9px] font-black text-center bg-white rounded border border-slate-200 text-slate-950" />
                  <button onClick={() => onAddHardware(selectedEqDefId, uPos)} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all shadow-sm"><Plus size={10} /></button>
              </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-50 flex justify-center">
            <button onClick={() => onDelete(rack.id)} className="text-[8px] font-black uppercase text-red-500 hover:text-red-700 flex items-center gap-1.5 tracking-widest"><Trash2 size={10} /> Delete</button>
        </div>
      </div>
    </div>
    {showInfo && <InfoModal item={rack} type="RACK" rackDefs={rackDefs} onClose={() => setShowInfo(false)} />}
    {showPhotos && <PhotoGalleryModal item={rack} type="RACK" onClose={() => setShowPhotos(false)} />}
    </>
  );
};

export default EditRackCard;
