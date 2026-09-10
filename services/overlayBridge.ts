// --- Overlay search bridge -------------------------------------------------
// A tiny module-scoped registry that lets the header OmniSearch component
// search over the map's demo/overlay sites without SiteMapView and OmniSearch
// needing to know about each other directly, and without the overlay data
// ever touching App.tsx state (per the "overlay sites must never enter
// persisted workspace state" rule).
//
// SiteMapView publishes its current overlay list here whenever it changes.
// OmniSearch subscribes to read it. Selecting an overlay result dispatches a
// window event that SiteMapView listens for to fly-to + open the popup.

export interface OverlaySite {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

const FOCUS_EVENT = 'lav:focus-overlay-site';

let overlaySites: OverlaySite[] = [];
type Listener = (sites: OverlaySite[]) => void;
const listeners = new Set<Listener>();

export function setOverlaySites(sites: OverlaySite[]): void {
  overlaySites = sites;
  listeners.forEach(fn => fn(overlaySites));
}

export function getOverlaySites(): OverlaySite[] {
  return overlaySites;
}

export function subscribeOverlaySites(fn: Listener): () => void {
  listeners.add(fn);
  fn(overlaySites);
  return () => {
    listeners.delete(fn);
  };
}

/** Request that the map view focus (fly to + open popup) an overlay site. */
export function focusOverlaySite(id: string): void {
  window.dispatchEvent(new CustomEvent<{ id: string }>(FOCUS_EVENT, { detail: { id } }));
}

/** Subscribe to focus requests. Returns an unsubscribe function. */
export function onFocusOverlaySite(fn: (id: string) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ id: string }>).detail;
    if (detail?.id) fn(detail.id);
  };
  window.addEventListener(FOCUS_EVENT, handler);
  return () => window.removeEventListener(FOCUS_EVENT, handler);
}
