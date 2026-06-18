
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Building, AppMode, BuildingDefinition, Status4D, ColorMode, StatusDefinition, OwnerDefinition } from '../types';
import { Plus, X, RotateCw, Maximize2, Crosshair } from 'lucide-react';

interface SitePlanner2DProps {
    buildings: Building[];
    buildingDefs: BuildingDefinition[];
    selectedBuildingId: string | null;
    appMode: AppMode;
    colorMode: ColorMode;
    colorCodingEnabled: boolean;
    onSelectBuilding: (id: string | null) => void;
    onUpdateBuilding: (id: string, updates: Partial<Building>) => void;
    onAddBuilding: (x: number, y: number, defId: string) => void;
    statuses: StatusDefinition[];
    owners: OwnerDefinition[];
    isDirty: boolean;
    isSaving: boolean;
    saveSuccess: boolean;
    onSave: () => void;
    onDeleteBuilding: (id: string) => void;
    onEnterBuilding: (id: string) => void;
    showLabels: boolean;
    visibleStatuses: Status4D[];
    alerts: any[];
}

interface BlueprintEntry {
    viewBox: string;
    render: (strokeColor: string, isSelected: boolean) => React.ReactNode;
}

const BLUEPRINTS: Record<string, BlueprintEntry> = {
    TYPE_A: {
        viewBox: "0 0 16 12",
        render: (strokeColor: string, isSelected: boolean) => (
            <g>
                <rect x="16" y="2" width="1.2" height="2.5" stroke={strokeColor} strokeWidth="0.02" fill="none" vectorEffect="non-scaling-stroke" />
                <rect x="16" y="7.5" width="1.2" height="2.5" stroke={strokeColor} strokeWidth="0.02" fill="none" vectorEffect="non-scaling-stroke" />
                <rect x="0" y="0" width="16" height="12" stroke={strokeColor} strokeWidth="0.1" fill={isSelected ? "rgba(59,130,246,0.1)" : "none"} vectorEffect="non-scaling-stroke" />
                <rect x="0.5" y="0.5" width="15" height="11" stroke={strokeColor} strokeWidth="0.02" strokeOpacity="0.3" fill="none" vectorEffect="non-scaling-stroke" />
                <path d="M4 12 L4 13.5 C3 13.5 2 13 2 12" stroke={strokeColor} strokeWidth="0.04" fill="none" vectorEffect="non-scaling-stroke" />
                <path d="M12 12 L12 13.5 C13 13.5 14 13 14 12" stroke={strokeColor} strokeWidth="0.04" fill="none" vectorEffect="non-scaling-stroke" />
            </g>
        )
    },
    TYPE_B: {
        viewBox: "0 0 24 12",
        render: (strokeColor: string, isSelected: boolean) => (
            <g>
                <rect x="24" y="2" width="1.2" height="2.5" stroke={strokeColor} strokeWidth="0.02" fill="none" vectorEffect="non-scaling-stroke" />
                <rect x="24" y="7.5" width="1.2" height="2.5" stroke={strokeColor} strokeWidth="0.02" fill="none" vectorEffect="non-scaling-stroke" />
                <rect x="0" y="0" width="24" height="12" stroke={strokeColor} strokeWidth="0.1" fill={isSelected ? "rgba(59,130,246,0.1)" : "none"} vectorEffect="non-scaling-stroke" />
                <rect x="0.5" y="0.5" width="23" height="11" stroke={strokeColor} strokeWidth="0.02" strokeOpacity="0.3" fill="none" vectorEffect="non-scaling-stroke" />
                <path d="M6 12 L6 13.5 C5 13.5 4 13 4 12" stroke={strokeColor} strokeWidth="0.04" fill="none" vectorEffect="non-scaling-stroke" />
                <path d="M18 12 L18 13.5 C19 13.5 20 13 20 12" stroke={strokeColor} strokeWidth="0.04" fill="none" vectorEffect="non-scaling-stroke" />
            </g>
        )
    },
    TYPE_C: {
        viewBox: "0 0 32 12",
        render: (strokeColor: string, isSelected: boolean) => (
            <g>
                <rect x="32" y="2" width="1.2" height="2.5" stroke={strokeColor} strokeWidth="0.02" fill="none" vectorEffect="non-scaling-stroke" />
                <rect x="32" y="7.5" width="1.2" height="2.5" stroke={strokeColor} strokeWidth="0.02" fill="none" vectorEffect="non-scaling-stroke" />
                <rect x="0" y="0" width="32" height="12" stroke={strokeColor} strokeWidth="0.1" fill={isSelected ? "rgba(59,130,246,0.1)" : "none"} vectorEffect="non-scaling-stroke" />
                <rect x="0.5" y="0.5" width="31" height="11" stroke={strokeColor} strokeWidth="0.02" strokeOpacity="0.3" fill="none" vectorEffect="non-scaling-stroke" />
                <path d="M8 12 L8 13.5 C7 13.5 6 13 6 12" stroke={strokeColor} strokeWidth="0.04" fill="none" vectorEffect="non-scaling-stroke" />
                <path d="M24 12 L24 13.5 C25 13.5 26 13 26 12" stroke={strokeColor} strokeWidth="0.04" fill="none" vectorEffect="non-scaling-stroke" />
            </g>
        )
    }
};

const AlertBadge: React.FC<{ alerts: any[], buildingId: string, rotation: number }> = ({ alerts, buildingId, rotation }) => {
    try {
        const safeAlerts = Array.isArray(alerts) ? alerts : [];
        const count = safeAlerts.filter(a => a && a.buildingId && String(a.buildingId) === String(buildingId)).length;
        const color = count > 0 ? '#ef4444' : '#10b981';

        return (
            <div
                className="absolute flex items-center justify-center rounded-full border-[0.2px] border-white shadow-md z-[60]"
                style={{
                    width: '6px',
                    height: '6px',
                    right: '-2px',
                    top: '-2px',
                    backgroundColor: color,
                    transform: `rotate(${-rotation}deg)`
                }}
            >
                <span className="text-[3px] font-black text-white leading-none">{count}</span>
            </div>
        );
    } catch {
        return null;
    }
};

const BuildingShell: React.FC<{
    building: Building;
    buildingDefs: BuildingDefinition[];
    isSelected: boolean;
    isBeingDragged: boolean;
    isGhost?: boolean;
    appMode: AppMode;
    colorMode: ColorMode;
    colorCodingEnabled: boolean;
    onPointerDown?: (e: React.PointerEvent) => void;
    onRotateClick?: (e: React.MouseEvent) => void;
    statuses: StatusDefinition[];
    owners: OwnerDefinition[];
    zoom: number;
    showLabels: boolean;
    alerts: any[];
}> = ({
    building, buildingDefs, isSelected, isBeingDragged, isGhost = false, appMode, colorMode, colorCodingEnabled, onPointerDown, onRotateClick, statuses, owners, zoom, showLabels, alerts
}) => {
        const def = buildingDefs.find(d => d.id === building.definitionId);
        const rotationDeg = ((building.rotation || 0) * 180) / Math.PI;

        // Use definition dimensions or fallback to TYPE_B defaults
        const w = def?.width || 24;
        const h = def?.depth || 12;
        const viewBox = `0 0 ${w} ${h}`;

        const fullName = def?.name || 'Unknown Type';
        // Split "Type A (16 x 12)" into ["Type A", "(16 x 12)"]
        const nameParts = fullName.split(/\s+(?=\()/);
        const typeLabel = nameParts[0] || fullName;
        const dimensionLabel = nameParts[1] || '';

        let strokeColor = '#94a3b8';
        if (colorCodingEnabled && !isGhost) {
            if (colorMode === 'OWNER') strokeColor = owners.find(o => o.id === building.ownerId)?.color || '#3b82f6';
            else strokeColor = statuses.find(s => s.id === building.status)?.color || '#10b981';
        }
        if (isSelected || isGhost) strokeColor = '#3b82f6';

        // Updated: Refined labels for scalable visibility
        const labelClasses = "text-[2.5px] text-white tracking-tight leading-tight drop-shadow-[0_0.25px_0.25px_rgba(0,0,0,1)] whitespace-nowrap text-center font-black";

        return (
            <div
                onPointerDown={onPointerDown}
                className={`absolute ${isBeingDragged ? 'z-50' : 'z-10'} ${isGhost ? 'pointer-events-none opacity-50' : 'pointer-events-auto cursor-grab active:cursor-grabbing'}`}
                style={{
                    left: building.x,
                    top: building.z,
                    width: w,
                    height: h,
                    transform: `rotate(${rotationDeg}deg)`,
                    transformOrigin: 'center center'
                }}
            >
                <svg
                    width="100%" height="100%"
                    viewBox={viewBox}
                    className="overflow-visible"
                    style={{ filter: isSelected ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.4))' : 'none' }}
                >
                    {/* Dynamic Render: Use svgPath if centered, or just a rect if not provided */}
                    <g transform={`translate(${w / 2}, ${h / 2})`}>
                        {def?.svgPath ? (
                            <path
                                d={def.svgPath}
                                stroke={strokeColor}
                                strokeWidth="0.1"
                                fill={isSelected ? "rgba(59,130,246,0.1)" : "none"}
                                vectorEffect="non-scaling-stroke"
                            />
                        ) : (
                            <rect
                                x={-w / 2} y={-h / 2} width={w} height={h}
                                stroke={strokeColor}
                                strokeWidth="0.1"
                                fill={isSelected ? "rgba(59,130,246,0.1)" : "none"}
                                vectorEffect="non-scaling-stroke"
                            />
                        )}
                        {/* Outline highlight */}
                        <rect
                            x={-w / 2 + 0.5} y={-h / 2 + 0.5} width={w - 1} height={h - 1}
                            stroke={strokeColor} strokeWidth="0.02" strokeOpacity="0.3"
                            fill="none" vectorEffect="non-scaling-stroke"
                        />
                    </g>
                </svg>

                <AlertBadge alerts={alerts} buildingId={building.id} rotation={rotationDeg} />

                {showLabels && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-sans" style={{ transform: `rotate(${-rotationDeg}deg)` }}>
                        <div className="flex flex-col items-center gap-[0.4px]">
                            <span className={labelClasses}>{building.label.padStart(4, '0')}</span>
                            <span className={labelClasses}>{typeLabel}</span>
                            {dimensionLabel && <span className={labelClasses}>{dimensionLabel}</span>}
                        </div>
                    </div>
                )}

                {isSelected && !isGhost && appMode !== 'VIEW' && (
                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={onRotateClick}
                        className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-[1.6px] h-[1.6px] bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl border-[0.1px] border-slate-900 transition-transform hover:scale-110 active:scale-95"
                        style={{ transform: `translateX(-50%) rotate(${-rotationDeg}deg)` }}
                    >
                        <RotateCw size={0.8} strokeWidth={3} />
                    </button>
                )}
            </div>
        );
    };

const SitePlanner2D: React.FC<SitePlanner2DProps> = ({
    buildings, buildingDefs, selectedBuildingId, appMode, colorMode, colorCodingEnabled, onSelectBuilding, onUpdateBuilding, onAddBuilding, statuses, owners, isDirty, isSaving, saveSuccess, onSave, onDeleteBuilding, onEnterBuilding, showLabels, visibleStatuses = Object.values(Status4D), alerts = []
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(5.0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [draggedBuildingId, setDraggedBuildingId] = useState<string | null>(null);
    const [placementId, setPlacementId] = useState<string | null>(null);
    const [ghostRotation, setGhostRotation] = useState(0);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [mouseGridPos, setMouseGridPos] = useState({ x: 0, y: 0 });

    const lastMousePos = useRef({ x: 0, y: 0 });
    const dragStartOffset = useRef({ x: 0, y: 0 });

    const handleRecenter = useCallback(() => {
        if (!containerRef.current || buildings.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const padding = 10;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        buildings.forEach(b => {
            const def = buildingDefs.find(d => d.id === b.definitionId);
            const w = def?.width || 16;
            const h = def?.depth || 12;
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.z);
            maxX = Math.max(maxX, b.x + w);
            maxY = Math.max(maxY, b.z + h);
        });

        const contentW = (maxX - minX) + padding * 2;
        const contentH = (maxY - minY) + padding * 2;
        const zoomW = rect.width / contentW;
        const zoomH = rect.height / contentH;

        const newZoom = Math.min(zoomW, zoomH, 50.0);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setZoom(newZoom);
        setOffset({
            x: rect.width / 2 - centerX * newZoom,
            y: rect.height / 2 - centerY * newZoom
        });
    }, [buildings, buildingDefs]);

    // Initial centering on load
    useEffect(() => {
        const timer = setTimeout(() => {
            handleRecenter();
        }, 100);
        return () => clearTimeout(timer);
    }, [handleRecenter]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setPlacementId(null); setShowAddMenu(false); }
            if (e.key.toLowerCase() === 'r') {
                if (placementId) setGhostRotation(prev => (prev + Math.PI / 2) % (Math.PI * 2));
                else if (selectedBuildingId) {
                    const b = buildings.find(x => x.id === selectedBuildingId);
                    if (b) onUpdateBuilding(selectedBuildingId, { rotation: ((b.rotation || 0) + Math.PI / 2) % (Math.PI * 2) });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedBuildingId, buildings, placementId, onUpdateBuilding]);

    const handlePointerDownContainer = (e: React.PointerEvent) => {
        if (placementId) {
            e.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mouseX = (e.clientX - rect.left - offset.x) / zoom;
            const mouseY = (e.clientY - rect.top - offset.y) / zoom;
            const snapX = Math.round(mouseX / 0.5) * 0.5;
            const snapY = Math.round(mouseY / 0.5) * 0.5;
            const def = buildingDefs.find(d => d.id === placementId);
            if (def) {
                onAddBuilding(snapX - def.width / 2, snapY - def.depth / 2, placementId);
                setPlacementId(null);
                setGhostRotation(0);
            }
            return;
        }
        if (e.button === 1 || e.button === 2 || (e.button === 0 && !draggedBuildingId)) {
            setIsPanning(true);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            containerRef.current?.setPointerCapture(e.pointerId);
        } else if (e.button === 0 && !draggedBuildingId && e.ctrlKey) {
            onSelectBuilding(null);
        }
    };

    const handlePointerDownBuilding = (e: React.PointerEvent, b: Building) => {
        if (placementId) return;
        if (e.button !== 0) return;
        e.stopPropagation();

        // Selection always on CTRL
        if (e.ctrlKey) onSelectBuilding(b.id);

        if (appMode !== 'VIEW') {
            setDraggedBuildingId(b.id);
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mouseX = (e.clientX - rect.left - offset.x) / zoom;
            const mouseY = (e.clientY - rect.top - offset.y) / zoom;
            dragStartOffset.current = { x: mouseX - b.x, y: mouseY - b.z };
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        } else {
            // In VIEW mode, clicking a building should still allow panning
            setIsPanning(true);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            containerRef.current?.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = (e.clientX - rect.left - offset.x) / zoom;
        const mouseY = (e.clientY - rect.top - offset.y) / zoom;
        setMouseGridPos({ x: Math.round(mouseX / 0.5) * 0.5, y: Math.round(mouseY / 0.5) * 0.5 });
        if (draggedBuildingId) {
            onUpdateBuilding(draggedBuildingId, {
                x: Math.round((mouseX - dragStartOffset.current.x) / 0.5) * 0.5,
                z: Math.round((mouseY - dragStartOffset.current.y) / 0.5) * 0.5
            });
        } else if (isPanning) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (draggedBuildingId) { try { (e.target as any).releasePointerCapture(e.pointerId); } catch (err) { } }
        if (isPanning) { try { containerRef.current?.releasePointerCapture(e.pointerId); } catch (err) { } }
        setIsPanning(false);
        setDraggedBuildingId(null);
    };

    return (
        <div className="flex h-full w-full bg-[#020617] overflow-hidden font-sans relative">
            <div ref={containerRef} className={`flex-1 relative overflow-hidden select-none ${placementId ? 'cursor-none' : 'cursor-default'}`} onPointerDown={handlePointerDownContainer} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onWheel={(e) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const delta = -e.deltaY * 0.001; // Slower zoom
                const nextZoom = Math.min(Math.max(zoom + delta, 0.01), 15);
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const worldX = (mouseX - offset.x) / zoom;
                const worldY = (mouseY - offset.y) / zoom;
                setZoom(nextZoom);
                setOffset({ x: mouseX - worldX * nextZoom, y: mouseY - worldY * nextZoom });
            }} style={{ backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px)`, backgroundSize: `${5 * zoom}px ${5 * zoom}px`, backgroundPosition: `${offset.x}px ${offset.y}px` }}>
                <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>

                    {buildings.length === 0 && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.5px] font-black text-slate-800 whitespace-nowrap tracking-[0.2em] opacity-50 select-none">
                            NO SITE ASSETS
                        </div>
                    )}

                    {buildings.filter(b => visibleStatuses.includes(b.status || Status4D.RETAIN)).map(b => (
                        <BuildingShell key={b.id} building={b} buildingDefs={buildingDefs} isSelected={b.id === selectedBuildingId} isBeingDragged={b.id === draggedBuildingId} appMode={appMode} colorMode={colorMode} colorCodingEnabled={colorCodingEnabled} onPointerDown={(e) => handlePointerDownBuilding(e, b)} onRotateClick={(e) => { e.stopPropagation(); onUpdateBuilding(b.id, { rotation: ((b.rotation || 0) + Math.PI / 2) % (Math.PI * 2) }); }} statuses={statuses} owners={owners} zoom={zoom} showLabels={showLabels} alerts={alerts} />
                    ))}
                    {placementId && (
                        <div className="absolute" style={{ left: mouseGridPos.x - (buildingDefs.find(d => d.id === placementId)?.width || 16) / 2, top: mouseGridPos.y - (buildingDefs.find(d => d.id === placementId)?.depth || 12) / 2 }}>
                            <BuildingShell building={{ id: 'GHOST', label: 'NEW', racks: [], x: 0, z: 0, rotation: ghostRotation, status: Status4D.PROPOSED, ownerId: 'OWN_LUMEN', definitionId: placementId } as any} buildingDefs={buildingDefs} isSelected={false} isBeingDragged={false} isGhost={true} appMode={appMode} colorMode={colorMode} colorCodingEnabled={colorCodingEnabled} statuses={statuses} owners={owners} zoom={zoom} showLabels={showLabels} alerts={[]} />
                            <div className="absolute -bottom-0.4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-blue-600/90 text-[1px] font-black px-0.1 rounded-full text-white pointer-events-none"> PRESS 'R' TO ROTATE </div>
                        </div>
                    )}
                </div>
                <div className="absolute top-4 left-4 glass-panel px-4 py-2 rounded-xl flex items-center gap-6 z-50 pointer-events-auto">
                    <div className="flex flex-col"> <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Viewport</span> <span className="text-xs font-bold text-slate-300">ZOOM: {Math.round(zoom * 100)}%</span> </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col"> <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Position</span> <span className="text-xs font-mono text-blue-400">X: {Math.round(offset.x)} Y: {Math.round(offset.y)}</span> </div>
                    <div className="w-px h-6 bg-white/10" />
                    <button
                        onClick={handleRecenter}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-all text-[10px] font-black uppercase tracking-tighter"
                    >
                        <Crosshair size={14} /> Center Site
                    </button>
                </div>
                {(appMode === 'EDIT' || appMode === 'DESIGN') && (
                    <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4 z-[150]" onPointerDown={e => e.stopPropagation()}>
                        {showAddMenu && (
                            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 mb-2 animate-in slide-in-from-bottom-4 duration-300 w-64 ring-1 ring-blue-500/20">
                                <div className="px-4 py-3 border-b border-white/5 mb-2 flex justify-between items-center"> <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Library</span> <button onClick={() => setShowAddMenu(false)} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button> </div>
                                <div className="p-1 space-y-1">
                                    {buildingDefs.map(def => (
                                        <button key={def.id} onClick={(e) => { e.stopPropagation(); setPlacementId(def.id); setShowAddMenu(false); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-600 transition-all group">
                                            <div className="flex flex-col items-start"> <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">{def.name}</span> <span className="text-[9px] text-slate-500 font-mono group-hover:text-blue-100">{def.width}x{def.depth}ft</span> </div>
                                            <Plus size={16} className="text-blue-500 group-hover:text-white" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); if (placementId) setPlacementId(null); else setShowAddMenu(!showAddMenu); }} className={`h-16 w-16 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 ${placementId ? 'bg-red-600 text-white shadow-red-500/20' : 'bg-blue-600 text-white shadow-blue-500/20'}`}> {placementId ? <X size={28} /> : <Plus size={28} />} </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SitePlanner2D;
