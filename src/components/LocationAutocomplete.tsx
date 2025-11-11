import { useEffect, useRef, useState } from "react";

export type PickedPlace = {
  provider: "google";
  place_id: string;
  place_name: string;
  formatted_address: string;
  lat: number;
  lng: number;
  raw?: any;
};

function formatDistance(m?: number) {
  if (typeof m !== "number") return "";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function LocationAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = "Search a place..."
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSelect: (p: PickedPlace) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [q, setQ] = useState(value);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location (for distance + bias)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setOrigin({ lat: latitude, lng: longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // Debounce text input into q
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setQ(value.trim()), 250) as unknown as number;
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Autocomplete session
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  useEffect(() => {
    sessionRef.current = new google.maps.places.AutocompleteSessionToken();
  }, []);

  // Fetch predictions
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const s = q;
      if (!s || s.length < 2) {
        setResults([]);
        setOpen(!!s);
        return;
      }

      // Ensure Places API is loaded
      // @ts-ignore
      await google.maps.importLibrary?.("places");
      setLoading(true);

      const service = new google.maps.places.AutocompleteService();

      const opts: google.maps.places.AutocompletionRequest = {
        input: s,
        sessionToken: sessionRef.current ?? undefined,
      };

      if (origin) {
        const center = new google.maps.LatLng(origin.lat, origin.lng);
        opts.locationBias = new google.maps.Circle({ center, radius: 50000 });
        (opts as any).origin = center; // origin is not in public TS types but allowed at runtime
      }

      service.getPlacePredictions(
        opts,
        (
          preds: google.maps.places.AutocompletePrediction[] | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (cancelled) return;

          if (status === google.maps.places.PlacesServiceStatus.OK && Array.isArray(preds)) {
            let list = preds;

            // Only documented key is distance_meters
            const hasDistanceMeters =
              typeof preds[0]?.distance_meters === "number";

            const dmKey: "distance_meters" | null = hasDistanceMeters
              ? "distance_meters"
              : null;

            if (origin && dmKey) {
              list = [...preds].sort((a, b) => {
                const av = (a as any)[dmKey] ?? Infinity;
                const bv = (b as any)[dmKey] ?? Infinity;
                return av - bv;
              });
            }

            setResults(list);
          } else {
            setResults([]);
          }

          setLoading(false);
        }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [q, origin]);

  const pick = (pred: google.maps.places.AutocompletePrediction) => {
    const placeId =
      pred.place_id ||
      (pred as any).placeId ||
      (pred as any)?.placePrediction?.placeId;

    if (!placeId) return;

    const el = document.createElement("div");
    const ps = new google.maps.places.PlacesService(el);

    ps.getDetails(
      {
        placeId,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "business_status",
        ],
        sessionToken: sessionRef.current ?? undefined,
      },
      (d, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !d) return;
        if (d.business_status === "CLOSED_PERMANENTLY") return;

        const lat = d.geometry?.location?.lat();
        const lng = d.geometry?.location?.lng();
        if (typeof lat !== "number" || typeof lng !== "number") return;

        onSelect({
          provider: "google",
          place_id: d.place_id!,
          place_name: d.name || d.formatted_address || "",
          formatted_address: d.formatted_address || d.name || "",
          lat,
          lng,
          raw: d,
        });
        setOpen(false);
      }
    );
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChangeText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value && setOpen(true)}
        placeholder={placeholder}
        className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#45C4A0]/20 focus:border-[#45C4A0] transition-all"
      />

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
          )}

          {results.map((p) => {
            const dm = (p as any).distance_meters as number | undefined;
            return (
              <button
                key={p.place_id}
                type="button"
                onClick={() => pick(p)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
              >
                <div className="text-sm font-medium text-gray-900 flex items-center space-x-1">
                  <span>
                    {p.structured_formatting?.main_text || p.description}
                  </span>
                  {dm != null && (
                    <>
                      <span className="text-gray-400 relative top-[1px]">
                        •
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {formatDistance(dm)}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {p.structured_formatting?.secondary_text || ""}
                </div>
              </button>
            );
          })}

          <div className="px-4 py-2 text-[10px] text-gray-400 border-t">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
