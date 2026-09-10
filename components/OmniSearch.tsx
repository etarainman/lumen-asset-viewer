
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, CheckCircle2, AlertCircle, Command, X } from 'lucide-react';
import { SiteDefinition } from '../types';
import { getOverlaySites, subscribeOverlaySites, focusOverlaySite, OverlaySite } from '../services/overlayBridge';

interface OmniSearchProps {
  sites: SiteDefinition[];
  onSelectSite: (id: string) => void;
  // Called when the user selects an overlay (demo) search result. The parent
  // (App.tsx) is responsible for ensuring MAP view; SiteMapView itself
  // handles the fly-to + popup via the overlay bridge.
  onSelectOverlaySite?: (id: string) => void;
}

function toTitleCase(input: string): string {
  return input.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

const OmniSearch: React.FC<OmniSearchProps> = ({ sites, onSelectSite, onSelectOverlaySite }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlaySites, setOverlaySitesState] = useState<OverlaySite[]>(() => getOverlaySites());

  useEffect(() => subscribeOverlaySites(setOverlaySitesState), []);

  const filteredSites = query.trim() === '' ? [] : sites.filter(site => {
    const s = query.toLowerCase();
    return (
      site.name.toLowerCase().includes(s) ||
      site.id.toLowerCase().includes(s) ||
      site.customerId.toLowerCase().includes(s) ||
      (site.digitizedStatus?.toLowerCase().includes(s))
    );
  });

  // Additive: overlay (demo) sites are searchable by code and city.
  const filteredOverlaySites = query.trim() === '' ? [] : overlaySites.filter(site => {
    const s = query.toLowerCase();
    return (
      site.code.toLowerCase().includes(s) ||
      site.city.toLowerCase().includes(s)
    );
  }).slice(0, 8);

  const handleSelectOverlaySite = (id: string) => {
    if (onSelectOverlaySite) {
      onSelectOverlaySite(id);
    } else {
      focusOverlaySite(id);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md group">
      <div className={`relative flex items-center transition-all duration-300 ${isOpen ? 'scale-[1.02]' : ''}`}>
        <div className="absolute left-4 text-slate-500 group-focus-within:text-blue-500 transition-colors">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Omni-Search sites, IDs, or status..."
          className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-12 pr-10 text-[11px] font-bold text-white placeholder:text-slate-600 outline-none focus:bg-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
        <div className="absolute right-4 flex items-center gap-1 opacity-40 group-focus-within:opacity-0 transition-opacity pointer-events-none">
          <Command size={10} />
          <span className="text-[9px] font-black">K</span>
        </div>
        {query && (
            <button 
                onClick={() => { setQuery(''); setIsOpen(false); }}
                className="absolute right-3 p-1 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-all"
            >
                <X size={14} />
            </button>
        )}
      </div>

      {isOpen && (filteredSites.length > 0 || filteredOverlaySites.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[500] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {filteredSites.map(site => (
              <button
                key={site.id}
                onClick={() => {
                  onSelectSite(site.id);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-left group/item transition-all border border-transparent hover:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all">
                    <MapPin size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white tracking-tight">{site.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">{site.customerId} • {site.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${site.digitizedStatus === 'Digitized' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {site.digitizedStatus}
                  </span>
                </div>
              </button>
            ))}
            {filteredOverlaySites.map(site => (
              <button
                key={site.id}
                onClick={() => {
                  handleSelectOverlaySite(site.id);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-left group/item transition-all border border-transparent hover:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-500 group-hover/item:bg-purple-600 group-hover/item:text-white transition-all">
                    <MapPin size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white tracking-tight">{toTitleCase(site.city)}</span>
                    <span className="text-[9px] font-mono text-slate-500">{site.code} • {toTitleCase(site.city)}, {site.state}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400">
                    Demo Site
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 py-3 bg-white/5 border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-500 tracking-normal">{filteredSites.length + filteredOverlaySites.length} Results Found</span>
            <span className="text-[9px] text-slate-600 font-bold">Press Enter to jump</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OmniSearch;
