import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { SiteDefinition } from '../types';
import { ArrowRight } from 'lucide-react';

interface SiteMapViewProps {
  sites: SiteDefinition[];
  onOpenSite: (id: string) => void;
  focusSiteId: string | null;
}

const SiteMapView: React.FC<SiteMapViewProps> = ({ sites, onOpenSite, focusSiteId }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
        center: [39.0, -98.0],
        zoom: 4,
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = {};

    sites.forEach(site => {
        const isDigitized = site.digitizedStatus === 'Digitized';
        const color = isDigitized ? '#10b981' : '#f59e0b';
        
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="flex items-center" style="width: max-content; transform: translateY(-50%);">
                    <div class="w-4 h-4 rounded-full border-2 border-white shadow-xl flex-shrink-0" style="background-color: ${color}"></div>
                    <div class="ml-2 px-2 py-0.5 rounded-md bg-slate-900/90 border border-white/10 backdrop-blur-md whitespace-nowrap shadow-lg">
                        <span class="text-[10px] font-black text-white uppercase tracking-tighter">${site.name}</span>
                    </div>
                </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [8, 0]
        });

        const marker = L.marker([site.lat, site.lng], { icon }).addTo(map);
        markersRef.current[site.id] = marker;

        const popupDiv = document.createElement('div');
        popupDiv.className = "p-0 w-full font-sans overflow-hidden bg-slate-950";
        popupDiv.innerHTML = `
            <div class="p-6 border-b border-white/5 bg-slate-900/40">
                <h4 class="text-lg font-black text-white uppercase tracking-tight leading-tight">${site.name}</h4>
            </div>
            <div class="p-6 space-y-2">
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Site ID</span>
                    <span class="text-[10px] font-black text-slate-200 uppercase tracking-tight">${site.customerId}</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ambiflo ID</span>
                    <span class="text-[10px] font-black text-blue-400 uppercase tracking-tight">${site.id}</span>
                </div>
                <div class="pt-4">
                  <button id="open-site-${site.id}" class="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                      Open Site <ArrowRight size={14} />
                  </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupDiv, { maxWidth: 300, minWidth: 300 });
        marker.on('popupopen', () => {
            const btn = document.getElementById(`open-site-${site.id}`);
            if (btn) btn.onclick = () => onOpenSite(site.id);
        });
    });

    if (sites.length > 1) {
        const group = L.featureGroup(Object.values(markersRef.current));
        map.fitBounds(group.getBounds().pad(0.2));
    } else if (sites.length === 1) {
        map.setView([sites[0].lat, sites[0].lng], 10);
    }

    return () => {
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [sites, onOpenSite]);

  // Handle programmatic focus/zoom
  useEffect(() => {
    if (focusSiteId && markersRef.current[focusSiteId] && mapRef.current) {
        const marker = markersRef.current[focusSiteId];
        const map = mapRef.current;
        
        map.flyTo(marker.getLatLng(), 14, {
            duration: 1.5,
            easeLinearity: 0.25
        });
        
        // Slight delay to ensure animation has started/completed for better UX
        setTimeout(() => {
            marker.openPopup();
        }, 100);
    }
  }, [focusSiteId]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full z-0" />
    </div>
  );
};

export default SiteMapView;