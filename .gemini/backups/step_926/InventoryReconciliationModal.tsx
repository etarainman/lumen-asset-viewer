import React, { useMemo, useState } from 'react';
import { Rack, Equipment, ProInventoryItem, Status4D, SiteDefinition, EquipmentDefinition, RackDefinition } from '../types';
import { X, Download, AlertTriangle, ArrowRight, Trash2, PlusCircle, RefreshCw, FileJson, FileText, CheckCircle2, Ban, EyeOff, AlertOctagon } from 'lucide-react';
import { saveAs } from 'file-saver';

interface InventoryReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    racks: (Rack & { building?: string })[];
    equipment: (Equipment & { building?: string })[];
    proInventory: ProInventoryItem[];
    activeSite: SiteDefinition;
    equipmentDefs: EquipmentDefinition[];
    rackDefs: RackDefinition[];
}

export const InventoryReconciliationModal: React.FC<InventoryReconciliationModalProps> = ({
    isOpen,
    onClose,
    racks,
    equipment,
    proInventory,
    activeSite,
    equipmentDefs,
    rackDefs
}) => {
    // State for Unmodeled Buildings: 'IGNORE' (Default) | 'PURGE'
    const [resolutions, setResolutions] = useState<Record<string, 'PURGE' | 'IGNORE'>>({});

    // Item Name Resolver logic
    const getItemDisplayName = (item: any, type: 'RACK' | 'EQUIPMENT', forceNew: boolean = false) => {
        const prefix = forceNew ? 'NEW ' : '';
        if (type === 'RACK') {
            const def = rackDefs.find(d => d.id === item.definitionId);
            return def ? `${prefix}${def.name}` : `${prefix}RACK (${item.label})`;
        } else {
            const def = equipmentDefs.find(d => d.id === item.definitionId);
            if (!def) return `${prefix}EQUIPMENT (${item.name})`;

            const vendor = def.manufacturer || '';
            const modelName = def.name || '';

            // Avoid "Ciena Ciena" if model name already starts with vendor
            if (vendor && modelName.startsWith(vendor)) {
                return `${prefix}${modelName}`.trim();
            }
            return `${prefix}${vendor} ${modelName}`.trim();
        }
    };

    // 1. Identify Unmodeled Buildings
    const unmodeledBuildings = useMemo(() => {
        const bimBuildings = new Set<string>();
        racks.forEach(r => { if (r.building) bimBuildings.add(r.building); });
        equipment.forEach(e => { if (e.building) bimBuildings.add(e.building); });

        const csvBuildings = new Set<string>();
        proInventory.forEach(p => { if (p.building) csvBuildings.add(p.building); });

        // items in Csv but not in Bim
        return [...csvBuildings].filter(b => !bimBuildings.has(b)).sort();
    }, [racks, equipment, proInventory]);

    // 2. Calculate Diff based on Resolutions
    const diff = useMemo(() => {
        const creates: { item: Rack | Equipment; type: 'RACK' | 'EQUIPMENT' }[] = [];
        const updates: { bim: Rack | Equipment; pro: ProInventoryItem; type: 'RACK' | 'EQUIPMENT'; changes: string[] }[] = [];
        const deletes: ProInventoryItem[] = [];

        // Build lookup: proId → ProInventoryItem
        const proById = new Map(proInventory.map(p => [p.id, p]));

        // Build set of all linked PRO ids (via proInventoryId field OR rack.id === proId)
        const linkedProIds = new Set<string>();
        racks.forEach(r => {
            if (r.proInventoryId) linkedProIds.add(r.proInventoryId);
            // If rack.id itself matches a pro item (i.e. id was set to proId during link)
            if (proById.has(r.id)) linkedProIds.add(r.id);
        });
        equipment.forEach(e => {
            if (e.proInventoryId) linkedProIds.add(e.proInventoryId);
            if (proById.has(e.id)) linkedProIds.add(e.id);
        });

        // --- Process Racks ---
        racks.forEach(r => {
            // Determine which PRO item this rack is linked to
            const proId = r.proInventoryId || (proById.has(r.id) ? r.id : '');
            if (!proId) {
                creates.push({ item: r, type: 'RACK' });
                return;
            }
            const pro = proById.get(proId);
            if (!pro) return; // linked id not found in current PRO inventory (edge case)

            const changes: string[] = [];
            const bimLineUp = String(r.lineUp || '').trim();
            const proLineUp = String(pro.lineUp || '').trim();
            if (bimLineUp && proLineUp && bimLineUp !== proLineUp) {
                changes.push(`Line Up: BIM "${bimLineUp}" → PRO "${proLineUp}"`);
            }
            const bimBayNo = String(r.bayNo || '').trim();
            const proBayNo = String(pro.bayNo || '').trim();
            if (bimBayNo && proBayNo && bimBayNo !== proBayNo) {
                changes.push(`Bay No: BIM "${bimBayNo}" → PRO "${proBayNo}"`);
            }
            if (changes.length > 0) {
                updates.push({ bim: r, pro, type: 'RACK', changes });
            }
        });

        // --- Process Equipment ---
        equipment.forEach(e => {
            const proId = e.proInventoryId || (proById.has(e.id) ? e.id : '');
            if (!proId) {
                creates.push({ item: e, type: 'EQUIPMENT' });
                return;
            }
            const pro = proById.get(proId);
            if (!pro) return;

            const parentRack = racks.find(r => r.id === e.rackId);
            const changes: string[] = [];

            const bimLineUp = String(parentRack?.lineUp || '').trim();
            const proLineUp = String(pro.lineUp || '').trim();
            if (bimLineUp && proLineUp && bimLineUp !== proLineUp) {
                changes.push(`Line Up: BIM "${bimLineUp}" → PRO "${proLineUp}"`);
            }
            const bimBayNo = String(parentRack?.bayNo || '').trim();
            const proBayNo = String(pro.bayNo || '').trim();
            if (bimBayNo && proBayNo && bimBayNo !== proBayNo) {
                changes.push(`Bay No: BIM "${bimBayNo}" → PRO "${proBayNo}"`);
            }
            const bimRMU = String(e.baseRMU || '0').trim();
            const proRMU = String(pro.rmu || '0').trim();
            if (bimRMU !== proRMU) {
                changes.push(`RMU: BIM "${bimRMU}" → PRO "${proRMU}"`);
            }
            if (changes.length > 0) {
                updates.push({ bim: e, pro, type: 'EQUIPMENT', changes });
            }
        });

        // --- Process Deletes ---
        proInventory.forEach(p => {
            if (!linkedProIds.has(p.id)) {
                if (p.building && unmodeledBuildings.includes(p.building)) {
                    const res = resolutions[p.building] || 'IGNORE';
                    if (res === 'PURGE') deletes.push(p);
                } else {
                    deletes.push(p);
                }
            }
        });

        return { creates, updates, deletes };
    }, [racks, equipment, proInventory, unmodeledBuildings, resolutions]);


    const handleDownload = async (format: 'json' | 'txt') => {
        const now = new Date();
        const yy = now.getFullYear().toString().slice(-2);
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const datePrefix = `${yy}${mm}${dd}`;

        const extension = format === 'json' ? '.json' : '.txt';
        const safeSite = activeSite.name.replace(/[^a-zA-Z0-9-_]/g, '');
        const filename = `${datePrefix} - ${safeSite}_Inventory_Instructions${extension}`;
        const date = now.toISOString().split('T')[0];

        let content = '';
        let mimeType = 'text/plain';

        const ignoredList = unmodeledBuildings.filter(b => (resolutions[b] || 'IGNORE') === 'IGNORE');

        if (format === 'json') {
            const payload = {
                metadata: {
                    date,
                    generatedBy: "Lumen Asset LCM",
                    version: "1.1",
                    site: activeSite.name,
                    clli: activeSite.customerId,
                    siteNo: activeSite.id,
                    latitude: activeSite.lat,
                    longitude: activeSite.lng
                },
                safeguards: {
                    ignoredBuildings: ignoredList,
                    mode: "INTERACTIVE_RESOLUTION"
                },
                summary: {
                    creates: diff.creates.length,
                    updates: diff.updates.length,
                    deletes: diff.deletes.length
                },
                operations: {
                    create: diff.creates.map(c => {
                        const item = c.item;
                        const building = (item as any).building || '0000';
                        const name = getItemDisplayName(item, c.type);

                        let details: any = { building };
                        if (c.type === 'RACK') {
                            const r = item as Rack;
                            details.lineUp = r.lineUp || '000';
                            details.bayNo = r.bayNo || '000';
                            details.label = r.label || `${details.lineUp}.${details.bayNo}`;
                        } else {
                            const e = item as Equipment;
                            const parentRack = racks.find(r => r.id === e.rackId);
                            details.rackLabel = parentRack?.label || 'Unknown';
                            details.baseRMU = e.baseRMU || 1;
                        }

                        const sanitizedAttributes: any = {
                            name: name,
                            status: item.status,
                            ownerId: item.ownerId,
                            building: building
                        };

                        if (c.type === 'EQUIPMENT') {
                            sanitizedAttributes.vendorId = (item as Equipment).vendorId;
                            sanitizedAttributes.baseRMU = (item as Equipment).baseRMU;
                        } else if (c.type === 'RACK') {
                            sanitizedAttributes.label = (item as Rack).label;
                            sanitizedAttributes.lineUp = (item as Rack).lineUp;
                            sanitizedAttributes.bayNo = (item as Rack).bayNo;
                        }

                        return {
                            type: c.type,
                            name,
                            details,
                            attributes: sanitizedAttributes
                        };
                    }),
                    update: diff.updates.map(u => ({
                        id: u.pro.id,
                        changes: u.changes
                    })),
                    delete: diff.deletes.map(d => ({
                        id: d.id,
                        original: d
                    }))
                }
            };
            content = JSON.stringify(payload, null, 2);
            mimeType = 'application/json';
        } else {
            content = `LUMEN ASSET LCM - INVENTORY RECONCILIATION REPORT\n`;
            content += `Ambiflo Site No: ${activeSite.id}\n`;
            content += `CLLI code:       ${activeSite.customerId}\n`;
            content += `Site Name:       ${activeSite.name}\n`;
            content += `Coordinates:     ${activeSite.lat}, ${activeSite.lng}\n`;
            content += `Generated:       ${date}\n`;
            if (ignoredList.length > 0) {
                content += `WARNING: The following buildings were IGNORED (Not modeled in 3D):\n`;
                content += `         ${ignoredList.join(', ')}\n`;
            }
            content += `--------------------------------------------------\n\n`;

            content += `1. NEW ITEMS FOUND IN BIM (Create in System of Record)\n`;
            content += `   Total: ${diff.creates.length}\n`;
            if (diff.creates.length === 0) content += `   (None)\n`;
            diff.creates.forEach(c => {
                const item = c.item;
                const bLabel = (item as any).building || '0000';
                const name = getItemDisplayName(item, c.type, true); // Force NEW prefix

                if (c.type === 'RACK') {
                    const r = item as Rack;
                    content += `   - [RACK] Name:   ${name}\n`;
                    content += `     Building:      ${bLabel}\n`;
                    content += `     Suite:         ${r.suite || ''}\n`;
                    content += `     Line Up:       ${r.lineUp || '000'}\n`;
                    content += `     Bay:           ${r.bayNo || '000'}\n\n`;
                } else {
                    const e = item as Equipment;
                    const parentRack = racks.find(r => r.id === e.rackId);
                    content += `   - [EQUIPMENT] Name: ${name}\n`;
                    content += `     Building:         ${bLabel}\n`;
                    content += `     Suite:            ${parentRack?.suite || ''}\n`;
                    content += `     Line Up:          ${parentRack?.lineUp || '000'}\n`;
                    content += `     Bay:              ${parentRack?.bayNo || '000'}\n`;
                    content += `     U:                ${e.baseRMU || 1}\n\n`;
                }
            });

            content += `2. ATTRIBUTE MISMATCHES\n`;
            content += `   Total: ${diff.updates.length}\n`;
            diff.updates.forEach(u => {
                content += `   - [${u.bim.name}] (ID: ${u.pro.id})\n`;
                u.changes.forEach(ch => content += `     > ${ch}\n`);
            });
            content += `\n`;

            content += `3. MISSING IN BIM (Remove from System of Record)\n`;
            content += `   Total: ${diff.deletes.length}\n`;
            diff.deletes.forEach(d => {
                content += `   - [${d.type.padEnd(9)}] ID: ${d.id.padEnd(12)} | ${d.name}\n`;
                content += `     Loc: ${d.location}\n`;
            });
        }

        const blob = new Blob([content], { type: mimeType });
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: format === 'json' ? 'JSON Data' : 'Text Report',
                        accept: format === 'json' ? { 'application/json': ['.json'] } : { 'text/plain': ['.txt'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) { console.warn(err); }
        }
        saveAs(blob, filename);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-slate-950/50 rounded-t-2xl shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                            <RefreshCw className="text-blue-500" /> Process Inventory Instructions
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Reconcile Reality (BIM) with System of Record</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="text-slate-400 hover:text-white" />
                    </button>
                </div>

                {/* SAFEGUARD: Unmodeled Buildings Warning */}
                {unmodeledBuildings.length > 0 ? (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-4 shrink-0 overflow-y-auto max-h-48">
                        <div className="flex items-start gap-3">
                            <div className="bg-amber-500/20 p-2 rounded-lg text-amber-500 mt-1">
                                <AlertOctagon size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-amber-400 font-bold uppercase text-xs tracking-widest mb-1">Verify Unmodeled Buildings</h3>
                                <p className="text-slate-300 text-xs mb-3">
                                    The following buildings appear in the Inventory CSV but are <b>not modeled</b> in the 3D Viewer.
                                    Please verify if these should be marked for removal (PURGE) or ignored for now.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {unmodeledBuildings.map(b => {
                                        const res = resolutions[b] || 'IGNORE';
                                        return (
                                            <div key={b} className={`flex items-center justify-between p-2 rounded-lg border transition-all ${res === 'PURGE' ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800 border-white/10'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold font-mono text-white bg-black/20 px-1.5 py-0.5 rounded">{b}</span>
                                                    <span className={`text-[10px] font-black uppercase ${res === 'PURGE' ? 'text-red-400' : 'text-slate-500'}`}>
                                                        {res === 'PURGE' ? 'Purge' : 'Ignored'}
                                                    </span>
                                                </div>
                                                <div className="flex bg-black/30 rounded-lg p-0.5">
                                                    <button
                                                        onClick={() => setResolutions(prev => ({ ...prev, [b]: 'IGNORE' }))}
                                                        className={`p-1.5 rounded-md transition-all ${res === 'IGNORE' ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                                        title="Ignore (Safest - Do Not Delete)"
                                                    >
                                                        <EyeOff size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setResolutions(prev => ({ ...prev, [b]: 'PURGE' }))}
                                                        className={`p-1.5 rounded-md transition-all ${res === 'PURGE' ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:text-red-400'}`}
                                                        title="Purge (Mark for Removal)"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-500/5 border-b border-emerald-500/10 px-8 py-3 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-1.5 rounded-lg text-emerald-500">
                                <CheckCircle2 size={16} />
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                                <div>
                                    <h3 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mb-0.5">Scope Verified</h3>
                                    <p className="text-slate-400 text-[10px]">All buildings in inventory are present in 3D Model.</p>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                    Processed: {Array.from(new Set(proInventory.map(p => p.building).filter(Boolean))).slice(0, 8).join(', ')}
                                    {new Set(proInventory.map(p => p.building).filter(Boolean)).size > 8 && '...'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-auto p-8 grid grid-cols-3 gap-6 min-h-0">

                    {/* Creates */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col h-full overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold uppercase text-xs tracking-widest border-b border-emerald-500/20 pb-3 shrink-0">
                            <PlusCircle size={16} /> Create New ({diff.creates.length})
                        </div>
                        <div className="flex-1 overflow-auto space-y-2 pr-2">
                            {/* Racks Summary */}
                            <div className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest mb-1 mt-1 sticky top-0 bg-slate-900/0 backdrop-blur-sm">
                                Racks ({diff.creates.filter(c => c.type === 'RACK').length})
                            </div>
                            {diff.creates.filter(c => c.type === 'RACK').map((c, i) => (
                                <div key={`new-rack-${i}`} className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/10 text-sm">
                                    <div className="font-bold text-emerald-300">{getItemDisplayName(c.item, 'RACK', true)}</div>
                                    <div className="text-emerald-400/70 text-[10px] mt-2 border-t border-emerald-500/10 pt-2 space-y-0.5">
                                        <div className="flex justify-between"><span>Building:</span> <span className="text-white font-mono">{(c.item as any).building || '0000'}</span></div>
                                        <div className="flex justify-between"><span>Suite:</span> <span className="text-white font-mono">{(c.item as Rack).suite || ''}</span></div>
                                        <div className="flex justify-between"><span>Line Up:</span> <span className="text-white font-mono">{(c.item as Rack).lineUp || '---'}</span></div>
                                        <div className="flex justify-between"><span>Bay:</span> <span className="text-white font-mono">{(c.item as Rack).bayNo || '---'}</span></div>
                                    </div>
                                </div>
                            ))}

                            {/* Equipment Summary */}
                            <div className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest mb-1 mt-4 sticky top-0 bg-slate-900/0 backdrop-blur-sm">
                                Equipment ({diff.creates.filter(c => c.type === 'EQUIPMENT').length})
                            </div>
                            {diff.creates.filter(c => c.type === 'EQUIPMENT').map((c, i) => (
                                <div key={`new-eq-${i}`} className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/10 text-sm">
                                    <div className="font-bold text-emerald-300">{getItemDisplayName(c.item, 'EQUIPMENT', true)}</div>
                                    <div className="text-emerald-400/70 text-[10px] mt-2 border-t border-emerald-500/10 pt-2 space-y-0.5">
                                        {(() => {
                                            const parentRack = racks.find(r => r.id === (c.item as Equipment).rackId);
                                            return (
                                                <>
                                                    <div className="flex justify-between"><span>Building:</span> <span className="text-white font-mono">{(c.item as any).building || '0000'}</span></div>
                                                    <div className="flex justify-between"><span>Suite:</span> <span className="text-white font-mono">{parentRack?.suite || ''}</span></div>
                                                    <div className="flex justify-between"><span>Line Up:</span> <span className="text-white font-mono">{parentRack?.lineUp || '---'}</span></div>
                                                    <div className="flex justify-between"><span>Bay:</span> <span className="text-white font-mono">{parentRack?.bayNo || '---'}</span></div>
                                                    <div className="flex justify-between font-bold text-emerald-400"><span>U:</span> <span className="text-white font-mono">{(c.item as Equipment).baseRMU}</span></div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}
                            {diff.creates.length === 0 && <div className="text-emerald-500/30 text-center italic mt-10">No new items</div>}
                        </div>
                    </div>

                    {/* Updates */}
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col h-full overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 text-amber-400 font-bold uppercase text-xs tracking-widest border-b border-amber-500/20 pb-3 shrink-0">
                            <RefreshCw size={16} /> Update Attributes ({diff.updates.length})
                        </div>
                        <div className="flex-1 overflow-auto space-y-2 pr-2">
                            {/* Racks Summary */}
                            <div className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest mb-1 mt-1">
                                Racks ({diff.updates.filter(u => u.type === 'RACK').length})
                            </div>
                            {diff.updates.filter(u => u.type === 'RACK').map((u, i) => (
                                <div key={`upd-rack-${i}`} className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/10 text-sm">
                                    <div className="font-bold text-amber-300 truncate">{getItemDisplayName(u.bim, 'RACK', false)}</div>
                                    <div className="text-amber-400/60 text-xs mt-0.5 mb-2">ID: {u.pro.id}</div>
                                    {u.changes.map((change, ci) => (
                                        <div key={ci} className="flex items-center gap-1.5 text-xs text-amber-200">
                                            <AlertTriangle size={10} /> {change}
                                        </div>
                                    ))}
                                </div>
                            ))}

                            {/* Equipment Summary */}
                            <div className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest mb-1 mt-4">
                                Equipment ({diff.updates.filter(u => u.type === 'EQUIPMENT').length})
                            </div>
                            {diff.updates.filter(u => u.type === 'EQUIPMENT').map((u, i) => (
                                <div key={`upd-eq-${i}`} className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/10 text-sm">
                                    <div className="font-bold text-amber-300 truncate">{getItemDisplayName(u.bim, 'EQUIPMENT', false)}</div>
                                    <div className="text-amber-400/60 text-xs mt-0.5 mb-2">ID: {u.pro.id}</div>
                                    {u.changes.map((change, ci) => (
                                        <div key={ci} className="flex items-center gap-1.5 text-xs text-amber-200">
                                            <AlertTriangle size={10} /> {change}
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {diff.updates.length === 0 && <div className="text-amber-500/30 text-center italic mt-10">No updates required</div>}
                        </div>
                    </div>

                    {/* Deletes */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex flex-col h-full overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 text-red-400 font-bold uppercase text-xs tracking-widest border-b border-red-500/20 pb-3 shrink-0">
                            <Trash2 size={16} /> Delete / Missing ({diff.deletes.length})
                        </div>
                        <div className="flex-1 overflow-auto space-y-2 pr-2">
                            {/* Racks Summary */}
                            <div className="text-[10px] font-black text-red-600/50 uppercase tracking-widest mb-1 mt-1">
                                Racks ({diff.deletes.filter(d => d.type === 'RACK').length})
                            </div>
                            {diff.deletes.filter(d => d.type === 'RACK').map((d, i) => (
                                <div key={`del-rack-${i}`} className="bg-red-500/10 p-3 rounded-lg border border-red-500/10 text-sm">
                                    <div className="font-bold text-red-300">{d.id}</div>
                                    <div className="text-red-200 mt-1">{d.name}</div>
                                    <div className="text-red-400/50 text-[10px] mt-1 font-mono">{d.location}</div>
                                    {d.building && (
                                        <div className="text-red-400/30 text-[9px] mt-1 flex items-center gap-1">
                                            <AlertTriangle size={8} /> Bldg: {d.building}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Equipment Summary */}
                            <div className="text-[10px] font-black text-red-600/50 uppercase tracking-widest mb-1 mt-4">
                                Equipment ({diff.deletes.filter(d => d.type === 'EQUIPMENT').length})
                            </div>
                            {diff.deletes.filter(d => d.type === 'EQUIPMENT').map((d, i) => (
                                <div key={`del-eq-${i}`} className="bg-red-500/10 p-3 rounded-lg border border-red-500/10 text-sm">
                                    <div className="font-bold text-red-300">{d.name}</div>
                                    <div className="text-red-400/70 text-xs mt-1">{d.id}</div>
                                    <div className="text-red-400/50 text-[10px] mt-1 truncate">{d.location || 'Unknown Location'}</div>
                                    {d.building && (
                                        <div className="text-red-400/30 text-[9px] mt-1 flex items-center gap-1">
                                            <AlertTriangle size={8} /> Bldg: {d.building}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {diff.deletes.length === 0 && <div className="text-red-500/30 text-center italic mt-10">No items to remove</div>}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="bg-slate-950 px-8 py-6 border-t border-white/10 rounded-b-2xl flex items-center justify-between shrink-0">
                    <div className="text-slate-400 text-sm">
                        Total Operations: <b className="text-white">{diff.creates.length + diff.updates.length + diff.deletes.length}</b>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => handleDownload('txt')}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all border border-white/10"
                        >
                            <FileText size={16} /> Save Report (TXT)
                        </button>
                        <button
                            onClick={() => handleDownload('json')}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20"
                        >
                            <FileJson size={16} /> Save Instructions (JSON)
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
