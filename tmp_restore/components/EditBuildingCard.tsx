import React, { useState, useRef, useEffect } from 'react';
import { Building, AppMode, Status4D, BuildingDefinition, StatusDefinition, OwnerDefinition, Suite, ViewLevel } from '../types';
import { X, Trash2, LogIn, Hash, Box, Layers, GripHorizontal, User, RotateCw, BoxSelect, Maximize2, Move } from 'lucide-react';

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
  viewLevel: ViewLevel;
}

const SUITE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#14b8a6'];

const EditBuildingCard: React.FC<EditBuildingCardProps> = ({ building, buildingDefs, onUpdate, onEnter, onClose, mode, onDelete, statuses, owners, viewLevel }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardStartPos = useRef({ x: 0, y: 0 });

  const isReadOnly = mode === 'VIEW';

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
      className="absolute w-[340px] bg-white shadow-2xl rounded-[32px] border border-slate-400 z-[120] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="flex items-center justify-between p-6 bg-slate-950 text-white cursor-move select-none" onMouseDown={handleMouseDown}>
        <div className="flex items-center gap-4">
          <GripHorizontal size={20} className="text-slate-500" />
          <div className="flex flex-col text-white">
            <span className="text-[10px] font-black text-slate-100 tracking-[0.25em] uppercase">Building Assets</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full border border-white/5"><X size={18} /></button>
      </div>

      <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1"><Hash size={10} /> Building Number</label>
            <input
              type="text"
              value={building.label}
              onChange={e => onUpdate(building.id, { label: e.target.value })}
              onBlur={e => {
                const val = e.target.value.trim();
                if (val && /^\d+$/.test(val)) {
                  onUpdate(building.id, { label: val.padStart(4, '0') });
                }
              }}
              disabled={isReadOnly}
              className="w-full text-xs font-bold border border-slate-400 rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 text-slate-900 shadow-inner disabled:opacity-50 transition-all font-mono"
              placeholder="0001"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1"><Box size={10} /> Definition</label>
            <select
              value={building.definitionId}
              onChange={e => onUpdate(building.id, { definitionId: e.target.value })}
              disabled={isReadOnly}
              className="w-full text-[9px] font-black border border-slate-400 rounded-xl p-3 outline-none bg-slate-50 text-slate-900 uppercase appearance-none shadow-inner disabled:opacity-50 transition-all cursor-pointer"
            >
              {buildingDefs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1"><Layers size={10} /> 4D Status</label>
            <select
              value={building.status}
              onChange={e => onUpdate(building.id, { status: e.target.value as Status4D })}
              disabled={isReadOnly}
              className="w-full text-[9px] font-black border border-slate-400 rounded-xl p-3 outline-none bg-slate-50 text-slate-900 appearance-none shadow-inner disabled:opacity-50 transition-all"
            >
              {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1"><User size={10} /> Owner</label>
            <select
              value={building.ownerId}
              onChange={e => onUpdate(building.id, { ownerId: e.target.value })}
              disabled={isReadOnly}
              className="w-full text-[9px] font-black border border-slate-400 rounded-xl p-3 outline-none bg-slate-50 text-slate-900 appearance-none shadow-inner disabled:opacity-50 transition-all"
            >
              {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        {viewLevel === 'SITE' && (
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-1">
              <RotateCw size={10} /> Base Orientation
            </label>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-400 shadow-inner">
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
        )}

        {viewLevel === 'BUILDING' && (
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-1"><Maximize2 size={10} /> Suites / Zones <span className="text-[8px] text-emerald-500 normal-case tracking-normal ml-2 list-none animate-pulse">● Live Updates</span></span>
              <button
                onClick={() => {
                  const nextColor = SUITE_COLORS[(building.suites?.length || 0) % SUITE_COLORS.length];
                  const existingNames = (building.suites || []).map(s => s.name);
                  let nextNum = 1;
                  while (existingNames.includes(nextNum.toString().padStart(3, '0'))) nextNum++;
                  const uniqueName = nextNum.toString().padStart(3, '0');

                  onUpdate(building.id, { suites: [...(building.suites || []), { id: `s-${Date.now()}`, name: uniqueName, x: 0, y: 0, width: 10, depth: 10, color: nextColor }] });
                }}
                disabled={isReadOnly}
                className="text-white bg-blue-600 hover:bg-blue-500 w-5 h-5 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
              >
                +
              </button>
            </label>
            <div className="space-y-2">
              {(building.suites || []).map((suite, idx) => (
                <div key={suite.id} className="bg-slate-50 p-3 rounded-xl border border-slate-400">
                  <div className="flex gap-2 mb-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={suite.color || '#ffaa00'}
                        onChange={e => {
                          const newSuites = [...(building.suites || [])];
                          newSuites[idx] = { ...suite, color: e.target.value };
                          onUpdate(building.id, { suites: newSuites });
                        }}
                        className="w-8 h-8 p-1 bg-white border border-slate-400 rounded-lg cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={suite.name}
                      onChange={e => {
                        const newSuites = [...(building.suites || [])];
                        newSuites[idx] = { ...suite, name: e.target.value };
                        onUpdate(building.id, { suites: newSuites });
                      }}
                      onBlur={e => {
                        const val = e.target.value.trim();
                        const others = (building.suites || []).filter(s => s.id !== suite.id);
                        if (others.some(s => s.name === val)) {
                          // Duplicate detected - revert/modify
                          // Simple fix: append _1
                          const newSuites = [...(building.suites || [])];
                          newSuites[idx] = { ...suite, name: val + '_1' };
                          onUpdate(building.id, { suites: newSuites });
                        }
                      }}
                      disabled={isReadOnly}
                      className={`flex-1 text-[10px] font-black uppercase bg-white border border-slate-400 rounded-lg px-2 py-1.5 focus:border-blue-500 outline-none text-slate-900 ${(building.suites || []).some(s => s.id !== suite.id && s.name === suite.name) ? 'border-red-500 text-red-600' : ''}`}
                      placeholder="NAME"
                    />
                    <button
                      onClick={() => {
                        const newSuites = (building.suites || []).filter(s => s.id !== suite.id);
                        onUpdate(building.id, { suites: newSuites });
                      }}
                      disabled={isReadOnly}
                      className="text-slate-400 hover:text-red-500 p-1.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1 bg-white border border-slate-400 rounded-lg px-2 py-1">
                      <Maximize2 size={10} className="text-slate-400" />
                      <input
                        type="number"
                        value={suite.width}
                        onChange={e => {
                          const newSuites = [...(building.suites || [])];
                          newSuites[idx] = { ...suite, width: parseFloat(e.target.value) || 0 };
                          onUpdate(building.id, { suites: newSuites });
                        }}
                        className="w-full text-[9px] font-black bg-transparent outline-none text-slate-900"
                        placeholder="W"
                      />
                      <span className="text-[9px] text-slate-300">x</span>
                      <input
                        type="number"
                        value={suite.depth}
                        onChange={e => {
                          const newSuites = [...(building.suites || [])];
                          newSuites[idx] = { ...suite, depth: parseFloat(e.target.value) || 0 };
                          onUpdate(building.id, { suites: newSuites });
                        }}
                        className="w-full text-[9px] font-black bg-transparent outline-none text-right text-slate-900"
                        placeholder="D"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-400 rounded-lg px-2 py-1">
                      <Move size={10} className="text-slate-400" />
                      <input
                        type="number"
                        value={suite.x}
                        onChange={e => {
                          const newSuites = [...(building.suites || [])];
                          newSuites[idx] = { ...suite, x: parseFloat(e.target.value) || 0 };
                          onUpdate(building.id, { suites: newSuites });
                        }}
                        className="w-full text-[9px] font-black bg-transparent outline-none text-slate-900"
                        placeholder="X"
                      />
                      <span className="text-[9px] text-slate-300">/</span>
                      <input
                        type="number"
                        value={suite.y}
                        onChange={e => {
                          const newSuites = [...(building.suites || [])];
                          newSuites[idx] = { ...suite, y: parseFloat(e.target.value) || 0 };
                          onUpdate(building.id, { suites: newSuites });
                        }}
                        className="w-full text-[9px] font-black bg-transparent outline-none text-right text-slate-900"
                        placeholder="Y"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(building.suites || []).length === 0 && (
                <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-xl text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  No Suites Defined
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 space-y-4">
          <button
            onClick={() => onEnter(building.id)}
            className="w-full py-5 bg-slate-950 hover:bg-slate-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 group"
          >
            <BoxSelect size={18} className="group-hover:rotate-12 transition-transform" /> VIEW 3D BIM MODEL
          </button>
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
