import React, { useMemo, useState } from 'react';
import { Rack, Equipment, ProInventoryItem, Status4D } from '../types';
import { X, Download, AlertTriangle, ArrowRight, Trash2, PlusCircle, RefreshCw, FileJson, FileText, CheckCircle2 } from 'lucide-react';
import { saveAs } from 'file-saver';

interface InventoryReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    racks: Rack[];
    equipment: Equipment[];
    proInventory: ProInventoryItem[];
    siteId?: string;
}

export const InventoryReconciliationModal: React.FC<InventoryReconciliationModalProps> = ({
    isOpen,
    onClose,
    racks,
    equipment,
    proInventory,
    siteId = 'SITE'
}) => {
    const diff = useMemo(() => {
        const creates: { item: Rack | Equipment; type: 'RACK' | 'EQUIPMENT' }[] = [];
        const updates: { bim: Rack | Equipment; pro: ProInventoryItem; changes: string[] }[] = [];
        const deletes: ProInventoryItem[] = [];

        // Helper to find Pro item
        const findPro = (id: string) => proInventory.find(p => p.id === id);

        // Process Racks
        racks.forEach(r => {
            if (!r.proInventoryId) {
                creates.push({ item: r, type: 'RACK' });
            } else {
                const pro = findPro(r.proInventoryId);
                if (pro) {
                    // Check for Updates
                }
            }
        });

        // Process Equipment
        equipment.forEach(e => {
            if (!e.proInventoryId) {
                creates.push({ item: e, type: 'EQUIPMENT' });
            } else {
                const pro = findPro(e.proInventoryId);
                if (pro) {
                    const changes: string[] = [];
                    // Check RMU
                    const bimRMU = e.baseRMU?.toString() || '0';
                    const proRMU = pro.rmu?.toString() || '0';
                    if (bimRMU !== proRMU) {
                        changes.push(`RMU Mismatch: BIM ${bimRMU} vs Granite ${proRMU}`);
                    }

                    if (changes.length > 0) {
                        updates.push({ bim: e, pro, changes });
                    }
                }
            }
        });

        // Process Deletes
        const linkedProIds = new Set([
            ...racks.map(r => r.proInventoryId).filter(Boolean),
            ...equipment.map(e => e.proInventoryId).filter(Boolean)
        ]);

        proInventory.forEach(p => {
            if (!linkedProIds.has(p.id)) {
                deletes.push(p);
            }
        });

        return { creates, updates, deletes };
    }, [racks, equipment, proInventory]);

    const handleDownload = async (format: 'json' | 'txt') => {
        const date = new Date().toISOString().split('T')[0];
        // Enforce extension and Building Code
        const extension = format === 'json' ? '.json' : '.txt';
        // Use Site ID for filename
        const safeSite = siteId.replace(/[^a-zA-Z0-9-_]/g, '');
        const filename = `${safeSite}_Inventory_Instructions${extension}`;

        let content = '';
        let mimeType = 'text/plain';

        if (format === 'json') {
            const payload = {
                metadata: { date, generatedBy: "Lumen Asset LCM", version: "1.0", site: siteId },
                summary: {
                    creates: diff.creates.length,
                    updates: diff.updates.length,
                    deletes: diff.deletes.length
                },
                operations: {
                    create: diff.creates.map(c => ({
                        type: c.type,
                        tempId: c.item.id,
                        location: c.type === 'RACK' ? (c.item as Rack).label : c.item.name,
                        attributes: c.item,
                        building: (c.item as any).building
                    })),
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
            // Readable Text Report
            content = `LUMEN ASSET LCM - INVENTORY RECONCILIATION REPORT\n`;
            content += `Site: ${siteId.replace(/^A(?=\d)/, '')}\n`;
            content += `Generated: ${date}\n`;
            content += `--------------------------------------------------\n\n`;

            content += `1. NEW ITEMS FOUND IN BIM (Create in System of Record)\n`;
            content += `   Total: ${diff.creates.length}\n`;
            if (diff.creates.length === 0) content += `   (None)\n`;
            diff.creates.forEach(c => {
                if (c.type === 'RACK') {
                    const r = c.item as Rack;
                    const bLabel = (r as any).building || '0000';
                    content += `   - Building: ${bLabel}\n`;
                    content += `     Suite: ${r.suite || ''}\n`;
                    content += `     Location: ${r.lineUp || '000'}.${r.bayNo || '000'}\n`;
                    content += `     BAY NAME: ${(r.location || 'N/A').replace(/^A(?=\d)/, '')}\n`;
                    content += `\n`;
                } else {
                    const e = c.item as Equipment;
                    const bLabel = (e as any).building || '0000';
                    content += `   - [EQUIPMENT] Name: ${e.name}\n`;
                    content += `     Building: ${bLabel}\n`;
                    content += `     Location: ${(e as any).location || 'Unknown'}\n`; // Eq might not have full loc property
                    content += `\n`;
                }
            });
            content += `\n`;

            content += `2. ATTRIBUTE MISMATCHES (Update System of Record)\n`;
            content += `   Total: ${diff.updates.length}\n`;
            if (diff.updates.length === 0) content += `   (None)\n`;
            diff.updates.forEach(u => {
                content += `   - [${u.bim.name || 'Item'}] (ID: ${u.pro.id})\n`;
                u.changes.forEach(ch => content += `     > ${ch}\n`);
            });
            content += `\n`;

            content += `3. MISSING IN BIM (Remove from System of Record)\n`;
            content += `   Total: ${diff.deletes.length}\n`;
            if (diff.deletes.length === 0) content += `   (None)\n`;
            diff.deletes.forEach(d => {
                content += `   - [${d.type.padEnd(9)}] ID: ${d.id.padEnd(12)} | ${d.name}\n`;
                content += `     Loc: ${d.location}\n`;
            });
        }

        const blob = new Blob([content], { type: mimeType });

        // Tactic: Try File System Access API for explicit Save As dialog
        // This solves "Where is it saved?" and "Filename ignored" issues.
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
                return; // Success
            } catch (err) {
                console.warn('Save File Picker cancelled or failed, falling back to auto-save', err);
            }
        }

        saveAs(blob, filename);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-slate-950/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                            <RefreshCw className="text-blue-500" /> Process Inventory Instructions
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Reconcile Reality (BIM) with System of Record (Granite)</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="text-slate-400 hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8 grid grid-cols-3 gap-6">

                    {/* Creates */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold uppercase text-xs tracking-widest border-b border-emerald-500/20 pb-3">
                            <PlusCircle size={16} /> Create New ({diff.creates.length})
                        </div>
                        <div className="flex-1 overflow-auto space-y-2">
                            {diff.creates.map((c, i) => (
                                <div key={i} className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/10 text-sm">
                                    <div className="font-bold text-emerald-300">{c.type}</div>
                                    <div className="text-emerald-400/70 text-xs mt-1">{c.item.id}</div>
                                    <div className="text-white mt-1">{c.type === 'RACK' ? (c.item as Rack).label : c.item.name}</div>
                                </div>
                            ))}
                            {diff.creates.length === 0 && <div className="text-emerald-500/30 text-center italic mt-10">No new items</div>}
                        </div>
                    </div>

                    {/* Updates */}
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-4 text-amber-400 font-bold uppercase text-xs tracking-widest border-b border-amber-500/20 pb-3">
                            <RefreshCw size={16} /> Update Attributes ({diff.updates.length})
                        </div>
                        <div className="flex-1 overflow-auto space-y-2">
                            {diff.updates.map((u, i) => (
                                <div key={i} className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/10 text-sm">
                                    <div className="font-bold text-amber-300 truncate">{u.bim.name || 'Item'}</div>
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
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-4 text-red-400 font-bold uppercase text-xs tracking-widest border-b border-red-500/20 pb-3">
                            <Trash2 size={16} /> Delete / Missing ({diff.deletes.length})
                        </div>
                        <div className="flex-1 overflow-auto space-y-2">
                            {diff.deletes.map((d, i) => (
                                <div key={i} className="bg-red-500/10 p-3 rounded-lg border border-red-500/10 text-sm">
                                    <div className="font-bold text-red-300">{d.type}</div>
                                    <div className="text-red-400/70 text-xs mt-1">{d.id}</div>
                                    <div className="text-red-200 mt-1">{d.name}</div>
                                    <div className="text-red-400/50 text-[10px] mt-1 truncate">{d.location}</div>
                                </div>
                            ))}
                            {diff.deletes.length === 0 && <div className="text-red-500/30 text-center italic mt-10">No items to remove</div>}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="bg-slate-950 px-8 py-6 border-t border-white/10 rounded-b-2xl flex items-center justify-between">
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
