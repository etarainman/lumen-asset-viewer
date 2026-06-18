
import React from 'react';
import { Equipment, Rack, EquipmentDefinition, RackDefinition } from '../types';
import { X, FileText, ExternalLink, Zap, Server, Box } from 'lucide-react';
import AIAssistant from './AIAssistant';

interface InfoModalProps {
  item: Equipment | Rack;
  onClose: () => void;
  type: 'EQUIPMENT' | 'RACK';
  // Added definitions to access specification data not present on instances
  equipmentDefs?: EquipmentDefinition[];
  rackDefs?: RackDefinition[];
}

const InfoModal: React.FC<InfoModalProps> = ({ item, onClose, type, equipmentDefs, rackDefs }) => {
  const isEquipment = type === 'EQUIPMENT';
  const eq = item as Equipment;
  const rack = item as Rack;

  // Resolve definitions for detailed specs
  const eqDef = isEquipment ? equipmentDefs?.find(d => d.id === eq.definitionId) : null;
  const rackDef = !isEquipment ? rackDefs?.find(d => d.id === rack.definitionId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 animate-in fade-in duration-200">
      <div className="bg-white w-[800px] h-[500px] rounded-lg shadow-2xl flex overflow-hidden ring-1 ring-white/20">
        
        {/* Left Side: Information */}
        <div className="w-1/2 flex flex-col border-r border-slate-200">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                <h2 className="font-bold text-slate-800">{isEquipment ? eq.name : rack.label}</h2>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
          </div>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {isEquipment ? (
                <>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Specifications</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                <span className="block text-xs text-slate-500 mb-1">Vendor</span>
                                <span className="font-semibold text-sm text-slate-800">{eq.vendorId || 'Generic'}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                <span className="block text-xs text-slate-500 mb-1">Model</span>
                                <span className="font-semibold text-sm text-slate-800">{eq.model || 'N/A'}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex items-center gap-3">
                                <Zap size={18} className="text-amber-500" />
                                <div>
                                    <span className="block text-xs text-slate-500">Power</span>
                                    <span className="font-semibold text-sm text-slate-800">{eq.power || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex items-center gap-3">
                                <Server size={18} className="text-blue-500" />
                                <div>
                                    <span className="block text-xs text-slate-500">Rack Units</span>
                                    {/* Fix: Property 'heightU' exists on EquipmentDefinition, not Equipment instance */}
                                    <span className="font-semibold text-sm text-slate-800">{eqDef?.heightU || 'N/A'} RU</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {eq.description || 'No detailed description available for this unit.'}
                        </p>
                    </div>

                    {eq.datasheetUrl && (
                        <div className="pt-4 border-t border-slate-100">
                            <a 
                                href={eq.datasheetUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                            >
                                <ExternalLink size={16} />
                                View Manufacturer Datasheet (PDF)
                            </a>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-10 text-slate-500">
                    <Box size={48} className="mx-auto mb-4 text-slate-300" />
                    {/* Fix: Use totalU from definition if available */}
                    <p>Rack Specification: Standard {rackDef?.totalU || 42}U Seismic Enclosure.</p>
                    <p className="text-xs mt-2">Location: {rack.location}</p>
                </div>
            )}
          </div>
        </div>

        {/* Right Side: AI Assistant */}
        <div className="w-1/2 bg-slate-50 flex flex-col h-full">
            <div className="flex-1 p-4 h-full">
                <AIAssistant context={isEquipment ? `${eq.vendorId} ${eq.model} (${eq.name})` : `Rack ${rack.label} at ${rack.location}`} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
