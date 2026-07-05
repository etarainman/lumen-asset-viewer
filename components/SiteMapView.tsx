import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { SiteDefinition } from '../types';
import { ArrowRight, X } from 'lucide-react';

interface SiteMapViewProps {
  sites: SiteDefinition[];
  onOpenSite: (id: string) => void;
  focusSiteId: string | null;
}

// --- Demo overlay types & constants -----------------------------------
// NOTE: Demo sites are a render-time-only overlay. They are fetched at
// runtime from a static JSON file, held purely in local component state,
// and drawn on a separate Leaflet layer. They are never merged into the
// `sites` prop, never touch App.tsx state, and are never persisted to
// localStorage or Supabase.
interface DemoSite {
  id: string; // e.g. "DEMO_8SCRCA03"
  code: string; // e.g. "8SCRCA03"
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

const DEMO_SITES_VISIBLE_KEY = 'LAV_DEMO_SITES_VISIBLE';

const SiteMapView: React.FC<SiteMapViewProps> = ({ sites, onOpenSite, focusSiteId }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  // --- Demo overlay state ---
  const [demoSites, setDemoSites] = useState<DemoSite[]>([]);
  const [demoVisible, setDemoVisible] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(DEMO_SITES_VISIBLE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const demoLayerRef = useRef<L.LayerGroup | null>(null);
  const demoVisibleRef = useRef(demoVisible);
  const [activeDemoSite, setActiveDemoSite] = useState<DemoSite | null>(null);
  const [show360Viewer, setShow360Viewer] = useState(false);

  // Fetch the demo sites overlay at runtime. If it fails, fail silently —
  // real map behaviour must be completely unaffected.
  useEffect(() => {
    let cancelled = false;
    fetch('/demo/sites.json')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('not ok'))))
      .then((data: DemoSite[]) => {
        if (!cancelled && Array.isArray(data)) {
          setDemoSites(data);
        }
      })
      .catch(() => {
        // Silently ignore - demo overlay is optional and must never break the real map.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    demoVisibleRef.current = demoVisible;
    try {
      localStorage.setItem(DEMO_SITES_VISIBLE_KEY, String(demoVisible));
    } catch {
      // ignore storage failures (e.g. private browsing)
    }
    if (demoLayerRef.current && mapRef.current) {
      if (demoVisible) {
        if (!mapRef.current.hasLayer(demoLayerRef.current)) {
          demoLayerRef.current.addTo(mapRef.current);
        }
      } else {
        if (mapRef.current.hasLayer(demoLayerRef.current)) {
          mapRef.current.removeLayer(demoLayerRef.current);
        }
      }
    }
  }, [demoVisible]);

  const handleOpen360Viewer = useCallback((site: DemoSite) => {
    setActiveDemoSite(site);
    setShow360Viewer(true);
  }, []);

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

    // --- Demo sites toggle control (top-right) ---
    const DemoToggleControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control demo-toggle-control');
            container.style.background = 'rgba(15, 23, 42, 0.9)';
            container.style.border = '1px solid rgba(255,255,255,0.1)';
            container.style.borderRadius = '10px';
            container.style.padding = '2px';
            container.style.cursor = 'pointer';
            container.style.userSelect = 'none';
            container.style.backdropFilter = 'blur(6px)';

            const button = L.DomUtil.create('button', '', container);
            button.type = 'button';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.gap = '6px';
            button.style.padding = '8px 12px';
            button.style.background = 'transparent';
            button.style.border = 'none';
            button.style.color = '#e2e8f0';
            button.style.fontSize = '10px';
            button.style.fontWeight = '900';
            button.style.textTransform = 'uppercase';
            button.style.letterSpacing = '0.1em';
            button.style.whiteSpace = 'nowrap';

            const renderLabel = () => {
                const on = demoVisibleRef.current;
                button.innerHTML = `
                    <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${on ? '#a855f7' : '#475569'};box-shadow:${on ? '0 0 6px #a855f7' : 'none'};"></span>
                    <span>Demo Sites ${on ? 'ON' : 'OFF'}</span>
                `;
            };
            renderLabel();

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.on(button, 'click', (e) => {
                L.DomEvent.stop(e);
                setDemoVisible(prev => {
                    const next = !prev;
                    demoVisibleRef.current = next;
                    renderLabel();
                    return next;
                });
            });

            return container;
        }
    });
    const demoToggleControl = new DemoToggleControl();
    demoToggleControl.addTo(map);

    return () => {
        demoToggleControl.remove();
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

  // --- Render demo sites as a separate Leaflet layerGroup ---
  // Kept entirely independent of the real `sites` marker code path above.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || demoSites.length === 0) return;

    const layer = L.layerGroup();

    demoSites.forEach(site => {
        const icon = L.divIcon({
            className: 'demo-div-icon',
            html: `<div style="width:9px;height:9px;border-radius:9999px;background:#a855f7;border:1.5px solid rgba(255,255,255,0.85);box-shadow:0 0 4px rgba(168,85,247,0.8);"></div>`,
            iconSize: [9, 9],
            iconAnchor: [4.5, 4.5]
        });

        const marker = L.marker([site.lat, site.lng], { icon });
        marker.bindTooltip(site.name, { direction: 'top', offset: [0, -4], opacity: 0.9 });

        const popupDiv = document.createElement('div');
        popupDiv.className = "p-0 w-full font-sans overflow-hidden bg-slate-950";
        popupDiv.innerHTML = `
            <div class="p-6 border-b border-white/5 bg-slate-900/40">
                <div class="flex items-center gap-2 mb-1">
                    <span style="width:6px;height:6px;border-radius:9999px;background:#a855f7;display:inline-block;"></span>
                    <span class="text-[9px] font-semibold text-purple-400 tracking-normal">Demo Site</span>
                </div>
                <h4 class="text-lg font-semibold text-white tracking-tight leading-tight">${site.code}</h4>
            </div>
            <div class="p-6 space-y-2">
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-semibold text-slate-500 tracking-normal">Location</span>
                    <span class="text-[10px] font-semibold text-slate-200 tracking-tight">${site.city}, ${site.state}</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-semibold text-slate-500 tracking-normal">Status</span>
                    <span class="text-[10px] font-semibold text-emerald-400 tracking-tight">Surveyed</span>
                </div>
                <div class="pt-4 space-y-2">
                  <button id="demo-360-${site.id}" class="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-semibold tracking-normal transition-all flex items-center justify-center gap-2">
                      360&deg; Viewer
                  </button>
                  <button disabled title="Coming soon" class="w-full py-4 bg-white/[0.03] text-slate-600 rounded-2xl text-[10px] font-semibold tracking-normal flex items-center justify-center gap-2 cursor-not-allowed border border-white/[0.05]">
                      3D Viewer
                  </button>
                  <button disabled title="Coming soon" class="w-full py-4 bg-white/[0.03] text-slate-600 rounded-2xl text-[10px] font-semibold tracking-normal flex items-center justify-center gap-2 cursor-not-allowed border border-white/[0.05]">
                      Documents Centre
                  </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupDiv, { maxWidth: 300, minWidth: 300 });
        marker.on('popupopen', () => {
            const btn = document.getElementById(`demo-360-${site.id}`);
            if (btn) btn.onclick = () => handleOpen360Viewer(site);
        });

        layer.addLayer(marker);
    });

    demoLayerRef.current = layer;
    if (demoVisibleRef.current) {
        layer.addTo(map);
    }

    return () => {
        layer.remove();
        if (demoLayerRef.current === layer) {
            demoLayerRef.current = null;
        }
    };
  }, [demoSites, handleOpen360Viewer]);

  // Dismiss the 360 viewer modal on Escape
  useEffect(() => {
    if (!show360Viewer) return;
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShow360Viewer(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show360Viewer]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full z-0" />

      {show360Viewer && activeDemoSite && (
        <div
          className="fixed inset-0 flex flex-col bg-slate-950"
          style={{ zIndex: 10000 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-md">
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#a855f7', display: 'inline-block' }} />
                    <span className="text-[9px] font-semibold text-purple-400 tracking-normal">Demo Site &middot; 360&deg; Viewer</span>
                </div>
                <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">
                    {activeDemoSite.code} &mdash; {activeDemoSite.name}
                </h3>
            </div>
            <button
                onClick={() => setShow360Viewer(false)}
                aria-label="Close 360 viewer"
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-all"
            >
                <X size={20} />
            </button>
          </div>
          <div className="flex-1">
            <iframe
                title="360 Rack Viewer"
                src="/dcv/rack_review.html"
                className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteMapView;
