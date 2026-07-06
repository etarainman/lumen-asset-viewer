import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { SiteDefinition } from '../types';
import { ArrowRight, X } from 'lucide-react';
import { setOverlaySites, onFocusOverlaySite, OverlaySite } from '../services/overlayBridge';

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
type DemoSite = OverlaySite;

// Title Case helper — used for the customer's `city` value on pin labels,
// and for any other lowercase-source strings that need to read as headings.
function toTitleCase(input: string): string {
  return input.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

const DEMO_SITES_VISIBLE_KEY = 'LAV_DEMO_SITES_VISIBLE';
const OVERLAY_CUSTOMER_KEY = 'LAV_OVERLAY_CUSTOMER';
const OVERLAY_LABEL_ZOOM_THRESHOLD = 7;

type OverlayCustomer = 'DEMO' | 'LUMEN';

const SiteMapView: React.FC<SiteMapViewProps> = ({ sites, onOpenSite, focusSiteId }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const realLayerRef = useRef<L.LayerGroup | null>(null);
  // Bumped every time the underlying Leaflet map instance is (re)created
  // (e.g. React StrictMode's dev-mode double-mount) so overlay-rendering
  // effects that need a live map instance know to re-attach.
  const [mapEpoch, setMapEpoch] = useState(0);

  // --- Overlay (demo) state ---
  const [demoSites, setDemoSites] = useState<DemoSite[]>([]);
  const [overlayCustomer, setOverlayCustomer] = useState<OverlayCustomer>(() => {
    try {
      const stored = localStorage.getItem(OVERLAY_CUSTOMER_KEY);
      return stored === 'LUMEN' ? 'LUMEN' : 'DEMO';
    } catch {
      return 'DEMO';
    }
  });
  const overlayCustomerRef = useRef(overlayCustomer);
  // "Demo Sites" toggle only applies in Lumen mode (the overlay is always-on
  // in Demo Customer mode). Preserves the pre-existing toggle behaviour.
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
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [showDocumentsCentre, setShowDocumentsCentre] = useState(false);

  // Whether the demo/overlay layer should actually be shown on the map.
  // Demo Customer: always on. Lumen: follows the on/off toggle.
  const isOverlayEffectivelyVisible = useCallback(() => {
    return overlayCustomerRef.current === 'DEMO' ? true : demoVisibleRef.current;
  }, []);

  // Fetch the overlay sites at runtime. If it fails, fail silently — real
  // map behaviour must be completely unaffected. There is a single dataset
  // (787 jittered sites) shared by both customer modes.
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

  // Publish the overlay list to the search bridge whenever it changes.
  useEffect(() => {
    setOverlaySites(demoSites);
    return () => setOverlaySites([]);
  }, [demoSites]);

  useEffect(() => {
    overlayCustomerRef.current = overlayCustomer;
    try {
      localStorage.setItem(OVERLAY_CUSTOMER_KEY, overlayCustomer);
    } catch {
      // ignore storage failures (e.g. private browsing)
    }
    // Toggle real workspace pin visibility (render-time only).
    if (realLayerRef.current && mapRef.current) {
      const map = mapRef.current;
      const shouldShowReal = overlayCustomer === 'LUMEN';
      if (shouldShowReal) {
        if (!map.hasLayer(realLayerRef.current)) realLayerRef.current.addTo(map);
      } else {
        if (map.hasLayer(realLayerRef.current)) map.removeLayer(realLayerRef.current);
      }
    }
    // Overlay visibility depends on customer mode too.
    if (demoLayerRef.current && mapRef.current) {
      const map = mapRef.current;
      if (isOverlayEffectivelyVisible()) {
        if (!map.hasLayer(demoLayerRef.current)) demoLayerRef.current.addTo(map);
      } else {
        if (map.hasLayer(demoLayerRef.current)) map.removeLayer(demoLayerRef.current);
      }
    }
  }, [overlayCustomer, isOverlayEffectivelyVisible]);

  useEffect(() => {
    demoVisibleRef.current = demoVisible;
    try {
      localStorage.setItem(DEMO_SITES_VISIBLE_KEY, String(demoVisible));
    } catch {
      // ignore storage failures (e.g. private browsing)
    }
    if (demoLayerRef.current && mapRef.current) {
      const map = mapRef.current;
      if (isOverlayEffectivelyVisible()) {
        if (!map.hasLayer(demoLayerRef.current)) demoLayerRef.current.addTo(map);
      } else {
        if (map.hasLayer(demoLayerRef.current)) map.removeLayer(demoLayerRef.current);
      }
    }
  }, [demoVisible, isOverlayEffectivelyVisible]);

  const handleOpen360Viewer = useCallback((site: DemoSite) => {
    setActiveDemoSite(site);
    setShow360Viewer(true);
  }, []);

  const handleOpen3DViewer = useCallback((site: DemoSite) => {
    setActiveDemoSite(site);
    setShow3DViewer(true);
  }, []);

  const handleOpenDocumentsCentre = useCallback((site: DemoSite) => {
    setActiveDemoSite(site);
    setShowDocumentsCentre(true);
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
    setMapEpoch(e => e + 1);
    markersRef.current = {};

    const realLayer = L.layerGroup();

    sites.forEach(site => {
        const isDigitized = site.digitizedStatus === 'Digitized';
        const color = isDigitized ? '#10b981' : '#f59e0b';

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="flex items-center" style="width: max-content; transform: translateY(-50%);">
                    <div class="w-4 h-4 rounded-full border-2 border-white shadow-xl flex-shrink-0" style="background-color: ${color}"></div>
                    <div class="ml-2 px-2 py-0.5 rounded-md bg-slate-900/90 border border-white/10 backdrop-blur-md whitespace-nowrap shadow-lg">
                        <span class="text-[10px] font-black text-white tracking-tight">${site.name}</span>
                    </div>
                </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [8, 0]
        });

        const marker = L.marker([site.lat, site.lng], { icon });
        markersRef.current[site.id] = marker;
        realLayer.addLayer(marker);

        const popupDiv = document.createElement('div');
        popupDiv.className = "p-0 w-full font-sans overflow-hidden bg-slate-950";
        popupDiv.innerHTML = `
            <div class="p-6 border-b border-white/5 bg-slate-900/40">
                <h4 class="text-lg font-black text-white tracking-tight leading-tight">${site.name}</h4>
            </div>
            <div class="p-6 space-y-2">
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-black text-slate-500 tracking-tight">Site ID</span>
                    <span class="text-[10px] font-black text-slate-200 tracking-tight">${site.customerId}</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-black text-slate-500 tracking-tight">Ambiflo ID</span>
                    <span class="text-[10px] font-black text-blue-400 tracking-tight">${site.id}</span>
                </div>
                <div class="pt-4">
                  <button id="open-site-${site.id}" class="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center gap-2">
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

    realLayerRef.current = realLayer;
    if (overlayCustomerRef.current === 'LUMEN') {
        realLayer.addTo(map);
    }

    if (sites.length > 1) {
        const group = L.featureGroup(Object.values(markersRef.current));
        map.fitBounds(group.getBounds().pad(0.2));
    } else if (sites.length === 1) {
        map.setView([sites[0].lat, sites[0].lng], 10);
    }

    // --- Customer selector control (top-right) ---
    const CustomerSelectorControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control customer-selector-control');
            container.style.background = 'rgba(15, 23, 42, 0.9)';
            container.style.border = '1px solid rgba(255,255,255,0.1)';
            container.style.borderRadius = '10px';
            container.style.padding = '4px 8px';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '6px';
            container.style.userSelect = 'none';
            container.style.backdropFilter = 'blur(6px)';

            const label = L.DomUtil.create('span', '', container);
            label.textContent = 'Customer';
            label.style.fontSize = '10px';
            label.style.color = '#94a3b8';
            label.style.whiteSpace = 'nowrap';

            const select = L.DomUtil.create('select', '', container) as HTMLSelectElement;
            select.style.background = '#1e293b';
            select.style.color = '#ffffff';
            select.style.border = '1px solid rgba(255,255,255,0.15)';
            select.style.borderRadius = '8px';
            select.style.padding = '6px 8px';
            select.style.fontSize = '11px';
            select.style.fontWeight = '700';
            select.style.outline = 'none';
            select.style.cursor = 'pointer';

            const optionDefs: Array<[OverlayCustomer, string]> = [['DEMO', 'Demo Customer'], ['LUMEN', 'Lumen']];
            optionDefs.forEach(([value, text]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = text;
                select.appendChild(option);
            });
            select.value = overlayCustomerRef.current;

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.on(select, 'change', () => {
                const value = select.value as OverlayCustomer;
                if (value === overlayCustomerRef.current) return;
                setOverlayCustomer(value);
                overlayCustomerRef.current = value;
            });

            return container;
        }
    });
    const customerSelectorControl = new CustomerSelectorControl();
    customerSelectorControl.addTo(map);

    // --- Demo sites on/off toggle (Lumen mode only) ---
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
            button.style.letterSpacing = 'normal';
            button.style.whiteSpace = 'nowrap';

            const renderLabel = () => {
                const on = demoVisibleRef.current;
                button.innerHTML = `
                    <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${on ? '#a855f7' : '#475569'};box-shadow:${on ? '0 0 6px #a855f7' : 'none'};"></span>
                    <span>Demo Sites ${on ? 'On' : 'Off'}</span>
                `;
            };
            const renderVisibility = () => {
                container.style.display = overlayCustomerRef.current === 'LUMEN' ? '' : 'none';
            };
            renderLabel();
            renderVisibility();

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

    // Track zoom level for the overlay pin label threshold.
    const applyLabelZoomClass = () => {
        const el = containerRef.current;
        if (!el) return;
        if (map.getZoom() >= OVERLAY_LABEL_ZOOM_THRESHOLD) {
            el.classList.add('overlay-labels-visible');
        } else {
            el.classList.remove('overlay-labels-visible');
        }
    };
    applyLabelZoomClass();
    map.on('zoomend', applyLabelZoomClass);

    return () => {
        map.off('zoomend', applyLabelZoomClass);
        customerSelectorControl.remove();
        demoToggleControl.remove();
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [sites, onOpenSite]);

  // Re-sync the demo-toggle control's visibility whenever customer mode changes
  // (the control itself is only created once, in the effect above).
  useEffect(() => {
    const toggleEl = containerRef.current?.parentElement?.querySelector('.demo-toggle-control') as HTMLElement | null;
    if (toggleEl) {
        toggleEl.style.display = overlayCustomer === 'LUMEN' ? '' : 'none';
    }
    const selectorButtons = containerRef.current?.parentElement?.querySelectorAll('.customer-selector-control button');
    selectorButtons?.forEach((btn) => {
        const el = btn as HTMLButtonElement;
        const active = el.dataset.value === overlayCustomer;
        el.style.background = active ? '#a855f7' : 'transparent';
        el.style.color = active ? '#ffffff' : '#e2e8f0';
        el.style.boxShadow = active ? '0 0 8px rgba(168,85,247,0.5)' : 'none';
    });
  }, [overlayCustomer]);

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

  // --- Render demo/overlay sites as a separate Leaflet layerGroup ---
  // Kept entirely independent of the real `sites` marker code path above.
  const demoMarkersRef = useRef<Record<string, L.Marker>>({});
  useEffect(() => {
    const map = mapRef.current;
    if (!map || demoSites.length === 0) return;

    const layer = L.layerGroup();
    demoMarkersRef.current = {};

    demoSites.forEach(site => {
        const cityLabel = toTitleCase(site.city || '');
        const icon = L.divIcon({
            className: 'demo-div-icon',
            html: `
                <div class="flex items-center" style="width: max-content; transform: translateY(-50%);">
                    <div style="width:9px;height:9px;border-radius:9999px;background:#a855f7;border:1.5px solid rgba(255,255,255,0.85);box-shadow:0 0 4px rgba(168,85,247,0.8);flex-shrink:0;"></div>
                    <div class="demo-pin-label ml-2 px-2 py-0.5 rounded-md bg-slate-900/90 border border-white/10 backdrop-blur-md whitespace-nowrap shadow-lg">
                        <span class="text-[10px] font-black text-white tracking-tight">${cityLabel}</span>
                    </div>
                </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [4, 0]
        });

        const marker = L.marker([site.lat, site.lng], { icon });
        demoMarkersRef.current[site.id] = marker;

        const popupDiv = document.createElement('div');
        popupDiv.className = "p-0 w-full font-sans overflow-hidden bg-slate-950";
        popupDiv.innerHTML = `
            <div class="p-6 border-b border-white/5 bg-slate-900/40">
                <h4 class="text-lg font-black text-white tracking-tight leading-tight">${site.name}</h4>
            </div>
            <div class="p-6 space-y-2">
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-black text-slate-500 tracking-tight">Site ID</span>
                    <span class="text-[10px] font-black text-slate-200 tracking-tight">${site.code}</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-black text-slate-500 tracking-tight">Ambiflo ID</span>
                    <span class="text-[10px] font-black text-blue-400 tracking-tight">${site.id}</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span class="text-[9px] font-black text-slate-500 tracking-tight">Location</span>
                    <span class="text-[10px] font-black text-slate-200 tracking-tight">${toTitleCase(site.city)}, ${site.state}</span>
                </div>
                <div class="pt-4 space-y-2">
                  <button id="demo-360-${site.id}" class="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center gap-2">
                      360&deg; Viewer
                  </button>
                  <button id="demo-3d-${site.id}" class="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center gap-2">
                      3D Viewer
                  </button>
                  <button id="demo-docs-${site.id}" class="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-[10px] font-black tracking-tight transition-all flex items-center justify-center gap-2">
                      Documents Centre
                  </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupDiv, { maxWidth: 300, minWidth: 300 });
        marker.on('popupopen', () => {
            const btn360 = document.getElementById(`demo-360-${site.id}`);
            if (btn360) btn360.onclick = () => handleOpen360Viewer(site);
            const btn3d = document.getElementById(`demo-3d-${site.id}`);
            if (btn3d) btn3d.onclick = () => handleOpen3DViewer(site);
            const btnDocs = document.getElementById(`demo-docs-${site.id}`);
            if (btnDocs) btnDocs.onclick = () => handleOpenDocumentsCentre(site);
        });

        layer.addLayer(marker);
    });

    demoLayerRef.current = layer;
    if (isOverlayEffectivelyVisible()) {
        layer.addTo(map);
    }

    return () => {
        layer.remove();
        if (demoLayerRef.current === layer) {
            demoLayerRef.current = null;
        }
    };
  }, [demoSites, mapEpoch, handleOpen360Viewer, handleOpen3DViewer, handleOpenDocumentsCentre, isOverlayEffectivelyVisible]);

  // Listen for omni-search focus requests targeting overlay sites.
  useEffect(() => {
    return onFocusOverlaySite((id) => {
        const map = mapRef.current;
        const marker = demoMarkersRef.current[id];
        if (!map || !marker) return;

        map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), OVERLAY_LABEL_ZOOM_THRESHOLD), {
            duration: 1.5,
            easeLinearity: 0.25
        });

        setTimeout(() => {
            marker.openPopup();
        }, 100);
    });
  }, []);

  // Dismiss modals on Escape
  useEffect(() => {
    if (!show360Viewer && !show3DViewer && !showDocumentsCentre) return;
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShow360Viewer(false);
            setShow3DViewer(false);
            setShowDocumentsCentre(false);
        }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show360Viewer, show3DViewer, showDocumentsCentre]);

  const documentsCentreUrl = activeDemoSite
    ? `/dcv/documents.html?site=${encodeURIComponent(activeDemoSite.code)}&city=${encodeURIComponent(activeDemoSite.city)}&state=${encodeURIComponent(activeDemoSite.state)}`
    : '';

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
                    {activeDemoSite.code} &mdash; {toTitleCase(activeDemoSite.name)}
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

      {showDocumentsCentre && activeDemoSite && (
        <div
          className="fixed inset-0 flex flex-col bg-slate-950"
          style={{ zIndex: 10000 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-md">
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#a855f7', display: 'inline-block' }} />
                    <span className="text-[9px] font-semibold text-purple-400 tracking-normal">Demo Site &middot; Documents Centre</span>
                </div>
                <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">
                    {activeDemoSite.code} &mdash; Documents Centre
                </h3>
            </div>
            <button
                onClick={() => setShowDocumentsCentre(false)}
                aria-label="Close documents centre"
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-all"
            >
                <X size={20} />
            </button>
          </div>
          <div className="flex-1">
            <iframe
                title="Documents Centre"
                src={documentsCentreUrl}
                className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {show3DViewer && activeDemoSite && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ zIndex: 10000 }}
          onClick={() => setShow3DViewer(false)}
        >
          <div
            className="w-full max-w-md mx-4 bg-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 bg-slate-900/40 flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#a855f7', display: 'inline-block' }} />
                        <span className="text-[9px] font-semibold text-purple-400 tracking-normal">Demo Site &middot; 3D Viewer</span>
                    </div>
                    <h4 className="text-lg font-semibold text-white tracking-tight leading-tight">
                        {activeDemoSite.code} &mdash; {toTitleCase(activeDemoSite.name)}
                    </h4>
                </div>
                <button
                    onClick={() => setShow3DViewer(false)}
                    aria-label="Close 3D viewer"
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-all shrink-0"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="p-6 space-y-2">
                <p className="text-[12px] font-medium text-slate-300 leading-relaxed">
                    The 3D site model is generated from the survey point cloud and inventory. The interactive viewer arrives with the BIM integration phase.
                </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteMapView;
