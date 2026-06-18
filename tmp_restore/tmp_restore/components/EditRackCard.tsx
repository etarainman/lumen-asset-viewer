
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
  buildingLabel: string;
  otherRacks?: Rack[];
}

const EditRackCard: React.FC<EditRackCardProps> = ({
  rack, rackDefs, equipmentDefs, owners, statuses, onUpdate, onUpdateId, onClose, mode, onDelete, onMove, onAddHardware, onArrayClone, buildingLabel, otherRacks
}) => {
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [cloneCount, setCloneCount] = useState(1);
  const [cloneSpacing, setCloneSpacing] = useState(2.0);
  const [showAddHardware, setShowAddHardware] = useState(false); // Ft

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

        {/* Rack ID */}
        <div>
          <label className="text-[8px] font-black text-blue-600 uppercase mb-1 block tracking-widest">Rack ID</label>
          <input
            type="text"
            value={rack.proInventoryId || ''}
            onChange={e => onUpdate(rack.id, { proInventoryId: e.target.value })}
            disabled={isReadOnly}
            className="w-full text-[12px] font-black border-none outline-none bg-slate-50 rounded p-1 text-slate-950 placeholder:text-slate-300"
            placeholder="Asset Tag..."
          />
        </div>

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



        {/* Definition */}
        <div>
          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Model</label>
          <select value={rack.definitionId} onChange={e => onUpdate(rack.id, { definitionId: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-bold border-b border-slate-300 pb-1 outline-none bg-transparent uppercase truncate text-slate-950">
            {rackDefs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.totalU}U)</option>)}
          </select>
        </div>

        {/* Location Info */}
        {/* Location Info */}
        {/* Location Info Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-[9px]">
            <thead className="bg-slate-100 text-slate-500 font-black uppercase tracking-wider">
              <tr>
                <th className="py-1 px-2 text-left">Building</th>
                <th className="py-1 px-2 text-left">Suite</th>
                <th className="py-1 px-2 text-left text-blue-600">Line Up</th>
                <th className="py-1 px-2 text-left text-blue-600">Bay No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr>
                <td className="py-1.5 px-2 font-bold text-slate-700">{buildingLabel}</td>
                <td className="py-1.5 px-2 font-bold text-slate-700">{rack.suite || '000'}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="text"
                    value={rack.lineUp}
                    onChange={e => onUpdate(rack.id, { lineUp: e.target.value })}
                    onBlur={e => { if (!e.target.value.trim()) alert('Line Up is Required'); }}
                    disabled={mode !== 'EDIT'}
                    className={`w-full font-bold outline-none bg-transparent text-slate-950 ${!rack.lineUp ? 'border-b border-red-500 bg-red-50' : ''}`}
                  />
                </td>
                <td className="py-1.5 px-2 relative">
                  <input
                    type="text"
                    value={rack.bayNo}
                    onChange={e => onUpdate(rack.id, { bayNo: e.target.value })}
                    onBlur={e => { if (!e.target.value.trim()) alert('Bay No is Required'); }}
                    disabled={mode !== 'EDIT'}
                    className={`w-full font-bold outline-none bg-transparent text-slate-950 ${(otherRacks?.some(r => r.suite === rack.suite && r.bayNo === rack.bayNo) || !rack.bayNo) ? 'text-red-600 bg-red-50' : ''}`}
                  />
                  {otherRacks?.some(r => r.suite === rack.suite && r.bayNo === rack.bayNo) && (
                    <span className="absolute right-1 top-1.5 text-[6px] text-red-500 font-bold">DUP</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Orientation */}
        {/* Combined Orientation & Move Controls */}
        <div>
          <label className="text-[8px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1">
            <RotateCw size={10} /> Orientation
          </label>
          <div className="flex gap-4 items-center">
            {/* Orientation Buttons */}
            <div className="w-[140px] flex bg-slate-100 p-1 rounded-xl gap-0.5 border border-slate-300">
              {[0, 90, 180, 270].map(deg => (
                <button
                  key={deg}
                  onClick={() => onUpdate(rack.id, { rotation: (deg * Math.PI) / 180 })}
                  disabled={isReadOnly}
                  className={`flex-1 py-1 rounded text-[8px] font-black transition-all ${Math.abs((rack.rotation || 0) - (deg * Math.PI) / 180) < 0.1
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {deg}°
                </button>
              ))}
            </div>

            {/* Nudge Controls */}
            {!isReadOnly && (
              <div className="w-[80px]">
                <div className="grid grid-cols-3 gap-0.5">
                  <div className="col-start-2 flex justify-center"><button onClick={(e) => onMove('F', e.shiftKey)} className="p-1 bg-slate-50 border border-slate-200 rounded hover:bg-blue-50 hover:border-blue-400 active:scale-90 transition-all shadow-sm"><ArrowUp size={10} className="text-slate-600" /></button></div>
                  <div className="col-start-1 flex justify-center"><button onClick={(e) => onMove('L', e.shiftKey)} className="p-1 bg-slate-50 border border-slate-200 rounded hover:bg-blue-50 hover:border-blue-400 active:scale-90 transition-all shadow-sm"><ArrowLeft size={10} className="text-slate-600" /></button></div>
                  <div className="col-start-3 flex justify-center"><button onClick={(e) => onMove('R', e.shiftKey)} className="p-1 bg-slate-50 border border-slate-200 rounded hover:bg-blue-50 hover:border-blue-400 active:scale-90 transition-all shadow-sm"><ArrowRight size={10} className="text-slate-600" /></button></div>
                  <div className="col-start-2 flex justify-center"><button onClick={(e) => onMove('B', e.shiftKey)} className="p-1 bg-slate-50 border border-slate-200 rounded hover:bg-blue-50 hover:border-blue-400 active:scale-90 transition-all shadow-sm"><ArrowDown size={10} className="text-slate-600" /></button></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        {/* Status & Stakeholder */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[8px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Lifecycle Status</label>
            <select value={rack.status} onChange={e => onUpdate(rack.id, { status: e.target.value as Status4D })} disabled={isReadOnly || mode === 'EDIT'} className="w-full text-[9px] font-black border border-slate-300 rounded-lg p-1.5 outline-none bg-slate-50 text-slate-950 appearance-none uppercase">
              {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[8px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Stakeholder</label>
            <select value={rack.ownerId || ''} onChange={e => onUpdate(rack.id, { ownerId: e.target.value })} disabled={isReadOnly} className="w-full text-[9px] font-black border border-slate-300 rounded-lg p-1.5 outline-none bg-slate-50 text-slate-950 appearance-none uppercase">
              <option value="">(None)</option>
              {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        {/* Collapsible Add Equipment */}
        {!isReadOnly && (
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowAddHardware(!showAddHardware)}
              className="w-full flex items-center justify-between text-[8px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 p-1 rounded"
            >
              <span className="flex items-center gap-1"><Layers size={10} /> Add Equipment</span>
              {showAddHardware ? <ArrowUp size={10} /> : <Plus size={10} />}
            </button>

            {showAddHardware && (
              <div className="flex gap-1 mt-2 animate-in slide-in-from-top-2">
                <select id="eq-def-select" className="flex-1 text-[9px] font-bold border border-slate-300 rounded p-1 outline-none bg-white text-slate-900 uppercase">
                  {equipmentDefs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.heightU}U)</option>)}
                </select>
                <input type="number" id="eq-u-input" placeholder="U" defaultValue="1" className="w-10 text-[9px] font-bold border border-slate-300 rounded p-1 outline-none bg-white text-center" />
                <button
                  onClick={() => {
                    const defId = (document.getElementById('eq-def-select') as HTMLSelectElement).value || equipmentDefs[0]?.id;
                    const uPos = parseInt((document.getElementById('eq-u-input') as HTMLInputElement).value) || 1;
                    if (defId) onAddHardware(defId, uPos);
                  }}
                  className="bg-blue-600 text-white rounded p-1 hover:bg-blue-500"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        )}



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
