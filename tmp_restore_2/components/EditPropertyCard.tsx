
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Equipment, Rack, Status4D, VendorDefinition, OwnerDefinition, StatusDefinition, EquipmentDefinition } from '../types';
import { X, GripHorizontal, Trash2, Camera, FileText, HardDrive, User, Layers, Box } from 'lucide-react';
import InfoModal from './InfoModal';
import PhotoGalleryModal from './PhotoGalleryModal';

interface EditPropertyCardProps {
  item: Equipment;
  equipmentDefs: EquipmentDefinition[];
  racks: Rack[];
  vendors: VendorDefinition[];
  owners: OwnerDefinition[];
  statuses: StatusDefinition[];
  onUpdate: (id: string, updates: Partial<Equipment>) => void;
  onClose: () => void;
  mode: AppMode;
  onDelete: (id: string, reason: string) => void;
}

const EditPropertyCard: React.FC<EditPropertyCardProps> = ({
  item, equipmentDefs, racks, vendors, owners, statuses, onUpdate, onClose, mode, onDelete
}) => {
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Item added by error');

  const [showInfo, setShowInfo] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

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
    <>
      <div className="absolute w-[280px] bg-white shadow-2xl rounded-3xl border border-slate-400 z-[120] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 text-white cursor-move select-none" onMouseDown={handleMouseDown}>
          <div className="flex items-center gap-2">
            <span className="font-black text-[13px] tracking-tight truncate max-w-[140px]">{item.name}</span>
          </div>
          <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => setShowPhotos(true)} className="p-1 text-blue-400 hover:text-white transition-all"><Camera size={14} /></button>
            <button onClick={() => setShowInfo(true)} className="p-1 text-emerald-400 hover:text-white transition-all"><FileText size={14} /></button>
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-white ml-1 transition-all"><X size={16} /></button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Core Settings */}
          <div className="space-y-3">
            <div>
              <label className="text-[8px] font-black text-blue-600 uppercase mb-1 block tracking-widest">Equipment ID (Asset Tag)</label>
              <input type="text" value={item.proInventoryId || ''} onChange={e => onUpdate(item.id, { proInventoryId: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-bold border-b border-slate-300 pb-1 outline-none bg-transparent text-slate-950 placeholder:text-slate-300" placeholder="LEAVE BLANK IF UNASSIGNED" />
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Model</label>
              <select value={item.definitionId} onChange={e => onUpdate(item.id, { definitionId: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-bold border-b border-slate-300 pb-1 outline-none bg-transparent uppercase truncate text-slate-950">
                {equipmentDefs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.heightU}U)</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Vendor</label>
                <select value={item.vendorId} onChange={e => onUpdate(item.id, { vendorId: e.target.value })} disabled={isReadOnly} className="w-full text-[9px] font-black border-b border-slate-300 pb-1 outline-none bg-transparent uppercase text-slate-950">
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Stakeholder</label>
                <select value={item.ownerId} onChange={e => onUpdate(item.id, { ownerId: e.target.value })} disabled={isReadOnly} className="w-full text-[9px] font-black border-b border-slate-300 pb-1 outline-none bg-transparent uppercase text-slate-950">
                  {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Rack Placement */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-300">
            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Rack Host</label>
              <select value={item.rackId} onChange={e => onUpdate(item.id, { rackId: e.target.value })} disabled={isReadOnly} className="w-full text-[10px] font-bold border-none outline-none bg-transparent text-slate-950">
                {racks.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black text-blue-600 uppercase mb-1 block tracking-widest">U Position</label>
              <input type="number" value={item.baseRMU} onChange={e => onUpdate(item.id, { baseRMU: parseInt(e.target.value) })} disabled={isReadOnly} className="w-full text-[10px] font-black bg-transparent border-none outline-none text-slate-950" />
            </div>
          </div>

          <div>
            <label className="text-[8px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest">Lifecycle Status</label>
            <select value={item.status} onChange={e => onUpdate(item.id, { status: e.target.value as Status4D })} disabled={isReadOnly || mode === 'EDIT'} className="w-full text-[9px] font-black border border-slate-400 rounded-lg p-1.5 outline-none bg-slate-50 text-slate-950 appearance-none uppercase">
              {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {!isReadOnly && (
            <div className="pt-2 border-t border-slate-50">
              {!isDeleting ? (
                <button onClick={() => setIsDeleting(true)} className="w-full text-[8px] font-black uppercase text-red-500 hover:text-red-700 tracking-widest flex items-center justify-center gap-1.5 py-1.5"><Trash2 size={10} /> Delete</button>
              ) : (
                <div className="space-y-2 animate-in slide-in-from-top-1">
                  <select value={deleteReason} onChange={e => setDeleteReason(e.target.value)} className="w-full text-[9px] border border-red-100 rounded-lg p-1.5 bg-red-50/30 text-red-600">
                    <option value="Error">Manual Entry Error</option>
                    <option value="Removed">Decommissioned</option>
                  </select>
                  <div className="flex gap-1.5">
                    <button onClick={() => setIsDeleting(false)} className="flex-1 bg-slate-100 text-slate-600 text-[8px] font-black py-1.5 rounded-lg uppercase">Cancel</button>
                    <button onClick={() => onDelete(item.id, deleteReason)} className="flex-1 bg-red-600 text-white text-[8px] font-black py-1.5 rounded-lg uppercase">Confirm</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showInfo && <InfoModal item={item} type="EQUIPMENT" equipmentDefs={equipmentDefs} onClose={() => setShowInfo(false)} />}
      {showPhotos && <PhotoGalleryModal item={item} type="EQUIPMENT" onClose={() => setShowPhotos(false)} />}
    </>
  );
};

export default EditPropertyCard;
