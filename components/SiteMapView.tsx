import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Building, BuildingDefinition, SiteDefinition, Status4D } from '../types';
import { ArrowRight, X } from 'lucide-react';
import { setOverlaySites, onFocusOverlaySite, OverlaySite } from '../services/overlayBridge';
import SitePlanner2D from './SitePlanner2D';

interface SiteMapViewProps {
  sites: SiteDefinition[];
  onOpenSite: (id: string) => void;
  focusSiteId: string | null;
  // Which dataset to show. Chosen at the login screen and fixed for the
  // session — DEMO shows the 787 demo overlay, LUMEN shows the 3 real sites.
  overlayCustomer: OverlayCustomer;
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

const OVERLAY_LABEL_ZOOM_THRESHOLD = 7;

// --- Demo 3D Viewer: synthetic site-plan data ---------------------------
// Read-only lookalike of the real SITE-level view (SitePlanner2D), fed with
// in-memory-only data structurally cloned from the real Plateville site's
// four Type D buildings (see backups/LATEST_STABLE_BACKUP.json). This data
// never touches App state, workspace localStorage, or Supabase — it lives
// entirely in this module's scope and is only ever passed as read-only
// props into SitePlanner2D (appMode="VIEW", all mutation callbacks no-op).
const DEMO_3D_BUILDING_DEF: BuildingDefinition = {
  id: 'DEMO_TYPE_D',
  name: 'Type D (36 x 12)',
  width: 36,
  depth: 12,
  height: 10,
  color: '#a29260',
  svgPath: 'M -18,-6 L 18,-6 L 18,6 L -18,6 Z',
  roofColor: '#e1e1e1'
};

const DEMO_3D_BUILDING_DEFS: BuildingDefinition[] = [DEMO_3D_BUILDING_DEF];

// 2x2 block matching the real Plateville layout: 0004 top-left, 0002
// top-right, 0003 bottom-left, 0001 bottom-right.
const DEMO_3D_BUILDINGS: Building[] = [
  { id: 'DEMO-B-0004', siteId: 'DEMO', name: 'Building 0004', label: '0004', definitionId: 'DEMO_TYPE_D', x: 39, z: -7, lat: 0, lng: 0, racks: [], equipment: [], suites: [], auditStatus: 0, status: Status4D.RETAIN, ownerId: 'OWN_LUMEN' },
  { id: 'DEMO-B-0002', siteId: 'DEMO', name: 'Building 0002', label: '0002', definitionId: 'DEMO_TYPE_D', x: 75, z: -7, lat: 0, lng: 0, racks: [], equipment: [], suites: [], auditStatus: 0, status: Status4D.RETAIN, ownerId: 'OWN_LUMEN' },
  { id: 'DEMO-B-0003', siteId: 'DEMO', name: 'Building 0003', label: '0003', definitionId: 'DEMO_TYPE_D', x: 39, z: 4.5, lat: 0, lng: 0, racks: [], equipment: [], suites: [], auditStatus: 0, status: Status4D.RETAIN, ownerId: 'OWN_LUMEN' },
  { id: 'DEMO-B-0001', siteId: 'DEMO', name: 'Building 0001', label: '0001', definitionId: 'DEMO_TYPE_D', x: 75, z: 5, lat: 0, lng: 0, racks: [], equipment: [], suites: [], auditStatus: 0, status: Status4D.RETAIN, ownerId: 'OWN_LUMEN' }
];

// No-op handlers passed into the read-only SitePlanner2D instance — the demo
// 3D Viewer never mutates anything.
const demoNoOpSelectBuilding = (_id: string | null) => {};
const demoNoOpUpdateBuilding = (_id: string, _updates: Partial<Building>) => {};
const demoNoOpAddBuilding = (_x: number, _y: number, _defId: string) => {};
const demoNoOpSave = () => {};
const demoNoOpDeleteBuilding = (_id: string) => {};
const demoNoOpEnterBuilding = (_id: string) => {};

type OverlayCustomer = 'DEMO' | 'LUMEN';

const SiteMapView: React.FC<SiteMapViewProps> = ({ sites, onOpenSite, focusSiteId, overlayCustomer }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const realLayerRef = useRef<L.LayerGroup | null>(null);
  // Bumped every time the underlying Leaflet map instance is (re)created
  // (e.g. React StrictMode's dev-mode double-mount) so overlay-rendering
  // effects that need a live map instance know to re-attach.
  const [mapEpoch, setMapEpoch] = useState(0);

  // --- Overlay (demo) state ---
  // `overlayCustomer` arrives as a prop (chosen at login, fixed for the
  // session). The ref mirrors it so the imperative Leaflet effects can read
  // the current value without re-subscribing.
  const [demoSites, setDemoSites] = useState<DemoSite[]>([]);
  const overlayCustomerRef = useRef(overlayCustomer);
  const demoLayerRef = useRef<L.LayerGroup | null>(null);
  const [activeDemoSite, setActiveDemoSite] = useState<DemoSite | null>(null);
  const [show360Viewer, setShow360Viewer] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [showDocumentsCentre, setShowDocumentsCentre] = useState(false);

  // Whether the demo/overlay layer should be shown on the map.
  // Demo mode: on. Lumen mode: never — the two datasets are fully separate
  // (Lumen shows only the 3 real sites, Demo shows only the demo sites).
  const isOverlayEffectivelyVisible = useCallback(() => {
    return overlayCustomerRef.current === 'DEMO';
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
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

    // The customer (dataset) is chosen at the login screen and passed in as a
    // prop — there is no on-map selector. The map simply renders the dataset
    // for the current `overlayCustomer`.

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
          className="fixed inset-0 flex flex-col bg-slate-950"
          style={{ zIndex: 10000 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-md">
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#a855f7', display: 'inline-block' }} />
                    <span className="text-[9px] font-semibold text-purple-400 tracking-normal">Demo Site &middot; 3D Viewer</span>
                </div>
                <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">
                    {activeDemoSite.code} &mdash; 3D Viewer
                </h3>
            </div>
            <button
                onClick={() => setShow3DViewer(false)}
                aria-label="Close 3D viewer"
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-all"
            >
                <X size={20} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <SitePlanner2D
                buildings={DEMO_3D_BUILDINGS}
                buildingDefs={DEMO_3D_BUILDING_DEFS}
                selectedBuildingId={null}
                appMode="VIEW"
                colorMode="STATUS"
                colorCodingEnabled={false}
                onSelectBuilding={demoNoOpSelectBuilding}
                onUpdateBuilding={demoNoOpUpdateBuilding}
                onAddBuilding={demoNoOpAddBuilding}
                statuses={[]}
                owners={[]}
                isDirty={false}
                isSaving={false}
                saveSuccess={false}
                onSave={demoNoOpSave}
                onDeleteBuilding={demoNoOpDeleteBuilding}
                onEnterBuilding={demoNoOpEnterBuilding}
                showLabels={true}
                visibleStatuses={[Status4D.RETAIN]}
                alerts={[]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteMapView;
