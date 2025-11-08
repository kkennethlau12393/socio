// src/components/EventMap.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, ArrowLeft, Crosshair } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Event } from "../types";

interface EventMapProps {
  onEventClick: (event: Event) => void;
  onBack?: () => void;
}

type GMap = google.maps.Map;

const SOCIO_GREEN = "#45C4A0";
const SOCIO_SLATE = "#0f172a";

// --- Helpers ---------------------------------------------------------------

const getCategoryEmoji = (category?: string) => {
  const m: Record<string, string> = {
    social: "🎉",
    gaming: "🎮",
    study: "📚",
    sports: "⚽",
    music: "🎵",
    food: "🍕",
    arts: "🎨",
    tech: "💻",
  };
  return m[(category || "").toLowerCase()] || "📍";
};

// Outer container for marker (big pin + label under). Return an HTMLElement.
function makeSocioMarker(category: string, title: string) {
  const emoji = getCategoryEmoji(category);

  const root = document.createElement("div");
  root.style.cssText = `
    display:flex; flex-direction:column; align-items:center;
    transform: translateY(-6px);
  `;

  // Pin bubble
  const pin = document.createElement("div");
  pin.style.cssText = `
    width: 68px; height: 68px; border-radius: 20px;
    background: ${SOCIO_SLATE};
    box-shadow: 0 6px 18px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.18);
    display:flex; align-items:center; justify-content:center;
    position: relative; 
  `;

  // little pointer
  const nose = document.createElement("div");
  nose.style.cssText = `
    position:absolute; bottom:-8px; left:50%; transform:translateX(-50%);
    width: 0; height: 0; border-left: 8px solid transparent;
    border-right: 8px solid transparent; border-top: 10px solid ${SOCIO_SLATE};
    filter: drop-shadow(0 2px 2px rgba(0,0,0,.18));
  `;

  // inner green circle with emoji
  const badge = document.createElement("div");
  badge.style.cssText = `
    width: 52px; height: 52px; border-radius: 16px;
    background: ${SOCIO_GREEN};
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:26px; line-height:1;
  `;
  badge.textContent = emoji;

  pin.appendChild(badge);
  pin.appendChild(nose);

  // Label
  const label = document.createElement("div");
  label.style.cssText = `
    max-width: 200px;
    margin-top: 8px; padding: 6px 10px;
    background: rgba(255,255,255,.96);
    border-radius: 12px;
    color:#1f2937; font-weight: 800; font-size: 14px;
    border: 1px solid rgba(0,0,0,.06);
    box-shadow: 0 4px 10px rgba(0,0,0,.08);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  `;
  label.textContent = title;

  root.appendChild(pin);
  root.appendChild(label);

  return root;
}

// Pulsing user location dot
function makeUserDot() {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:relative; width:16px; height:16px; transform:translate(-8px,-8px);";
  const core = document.createElement("div");
  core.style.cssText =
    "position:absolute; inset:0; border-radius:50%; background:#3b82f6; box-shadow:0 0 0 2px #fff;";
  const ring = document.createElement("div");
  ring.style.cssText =
    "position:absolute; inset:-8px; border-radius:50%; border:2px solid #93c5fd; animation:pulse 1.8s ease-out infinite;";
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse { 
      0%{ transform:scale(0.6); opacity:.7 } 
      70%{ transform:scale(1.3); opacity:0 } 
      100%{ transform:scale(1.3); opacity:0 }
    }
  `;
  wrap.appendChild(style);
  wrap.appendChild(ring);
  wrap.appendChild(core);
  return wrap;
}

// --- Component -------------------------------------------------------------

export function EventMap({ onEventClick, onBack }: EventMapProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GMap | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const advMarkerCtor = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e: any) => {
      const t = (e.title || "").toLowerCase();
      const addr =
        (e.location_name || e.place_name || e.formatted_address || "").toLowerCase();
      return t.includes(q) || addr.includes(q);
    });
  }, [events, query]);

  // Init map
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // ensure google loaded
        let retries = 0;
        while (!(window as any).google?.maps && retries < 20) {
          await new Promise((r) => setTimeout(r, 100));
          retries++;
        }
        if (!(window as any).google?.maps) throw new Error("Google Maps not loaded");

        const center = await new Promise<google.maps.LatLngLiteral>((resolve) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve({ lat: 51.5072, lng: -0.1276 })
            );
          } else resolve({ lat: 51.5072, lng: -0.1276 });
        });

        if (cancelled || !mapDivRef.current) return;

        mapRef.current = new google.maps.Map(mapDivRef.current, {
          center,
          zoom: 13,
          mapId: import.meta.env.VITE_GOOGLE_MAPS_ID, // your vector Map ID
          disableDefaultUI: true,
          gestureHandling: "greedy",
          tilt: 45,
          heading: 0,
        });

        infoRef.current = new google.maps.InfoWindow();
        advMarkerCtor.current = (google.maps as any).marker?.AdvancedMarkerElement || null;

        // Watch + draw user position
        const drawUser = (pos: GeolocationPosition) => {
          const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (userMarkerRef.current) {
            userMarkerRef.current.position = ll;
            userMarkerRef.current.map = mapRef.current;
          } else if (advMarkerCtor.current) {
            userMarkerRef.current = new advMarkerCtor.current({
              map: mapRef.current,
              position: ll,
              content: makeUserDot(),
              zIndex: 9999,
            });
          } else {
            userMarkerRef.current = new google.maps.Marker({
              map: mapRef.current!,
              position: ll,
            });
          }
        };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(drawUser);
          watchIdRef.current = navigator.geolocation.watchPosition(drawUser);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      markersRef.current.forEach((m) => {
        if (m?.setMap) m.setMap(null);
        else if (m?.map) m.map = null;
      });
      markersRef.current = [];
      infoRef.current?.close();
    };
  }, []);

  // Fetch events (non-demo with coords)
  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_demo", false)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching events:", error);
        return;
      }

      const cleaned = (data || []).filter((e: any) => {
        // prefer place_lat/place_lng if present, else latitude/longitude
        const lat = Number(
          e.place_lat ?? e.latitude ?? Number.NaN
        );
        const lng = Number(
          e.place_lng ?? e.longitude ?? Number.NaN
        );
        const ok = Number.isFinite(lat) && Number.isFinite(lng);
        if (ok) {
          (e as any).__lat = lat;
          (e as any).__lng = lng;
        }
        return ok;
      });

      setEvents(cleaned as any);
    };
    run();
  }, []);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear previous
    markersRef.current.forEach((m) => (m?.setMap ? m.setMap(null) : (m.map = null)));
    markersRef.current = [];

    if (filtered.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    filtered.forEach((ev: any) => {
      const pos = { lat: ev.__lat, lng: ev.__lng };
      bounds.extend(pos);

      const content = makeSocioMarker(ev.category || "social", ev.title || "Event");

      let marker: any;
      if (advMarkerCtor.current) {
        marker = new advMarkerCtor.current({
          map,
          position: pos,
          content,
        });
      } else {
        // Fallback: plain marker (SVG data URL from the content)
        marker = new google.maps.Marker({
          map,
          position: pos,
        });
      }

      const timeText = new Date(ev.start_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const html = `
        <div style="padding:8px; max-width:300px">
          ${
            ev.image_url
              ? `<img src="${ev.image_url}" style="width:100%; height:120px; object-fit:cover; border-radius:12px; margin-bottom:8px;" />`
              : ""
          }
          <h3 style="margin:0 0 4px; font-weight:800; color:#111827">${ev.title}</h3>
          <div style="font-size:13px; color:#6b7280; margin-bottom:8px">
            ${(ev.location_name || ev.place_name || ev.formatted_address || "").toString()}
          </div>
          <div style="font-size:13px; color:#6b7280; margin-bottom:10px">${timeText}</div>
          <button id="open-${ev.id}" style="width:100%; padding:10px 12px; background:${SOCIO_GREEN}; color:#fff; font-weight:700; border:none; border-radius:10px; cursor:pointer">
            View Details
          </button>
        </div>`;

      const openPopup = () => {
        infoRef.current!.setContent(html);
        infoRef.current!.open({ map, anchor: marker });
        queueMicrotask(() => {
          const btn = document.getElementById(`open-${ev.id}`);
          if (btn) btn.onclick = () => onEventClick(ev);
        });
      };

      // AdvancedMarker: listen on its DOM
      content.addEventListener("click", openPopup);

      markersRef.current.push(marker);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80 });
      google.maps.event.addListenerOnce(map, "idle", () => {
        if ((map.getZoom() || 0) > 16) map.setZoom(16);
      });
    }
  }, [filtered, onEventClick]);

  // Places Search + re-center
  useEffect(() => {
    if (!mapRef.current) return;
    const input = document.getElementById("socio-map-search") as HTMLInputElement | null;
    if (!input) return;

    const ac = new (google.maps as any).places.Autocomplete(input, {
      fields: ["geometry", "name", "formatted_address"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const ll = place?.geometry?.location;
      if (!ll) return;
      mapRef.current!.panTo(ll);
      mapRef.current!.setZoom(15);
    });

    return () => {
      // @ts-ignore – Autocomplete has no explicit destroy
    };
  }, [loading]);

  const recenterToUser = () => {
    if (!mapRef.current || !userMarkerRef.current) return;
    // AdvancedMarker stores position as .position
    const pos =
      userMarkerRef.current.position ||
      userMarkerRef.current.getPosition?.() ||
      null;
    if (pos) {
      const ll =
        typeof pos.lat === "function" ? { lat: pos.lat(), lng: pos.lng() } : pos;
      mapRef.current.panTo(ll);
      mapRef.current.setZoom(15);
    }
  };

  return (
    <div className="fixed inset-0">
      {/* Map canvas */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* Top overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 flex items-start gap-2">
        {/* Back */}
        <button
          onClick={onBack}
          className="pointer-events-auto w-10 h-10 rounded-2xl bg-white/95 shadow-lg border border-black/5 flex items-center justify-center"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>

        {/* Search */}
        <div className="pointer-events-auto flex-1">
          <input
            id="socio-map-search"
            type="text"
            placeholder="Search events & places…"
            className="w-full rounded-2xl bg-white/95 border border-black/5 shadow-lg px-4 py-2 text-[15px] outline-none"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Recenter */}
        <button
          onClick={recenterToUser}
          className="pointer-events-auto w-10 h-10 rounded-2xl bg-white/95 shadow-lg border border-black/5 flex items-center justify-center"
          title="My location"
        >
          <Crosshair className="w-5 h-5 text-gray-800" />
        </button>
      </div>

      {/* Loading veil */}
      {loading && (
        <div className="absolute inset-0 bg-white/90 z-[1000] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <MapPin className="w-8 h-8 text-[#45C4A0] animate-bounce" />
            <p className="text-sm text-gray-600 font-medium">Loading map…</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 rounded-2xl p-6 shadow-xl text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-700 font-semibold">No events with location data</p>
            <p className="text-sm text-gray-500 mt-1">Try another search</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventMap;
