// src/components/LocationAutocomplete.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";

export type PickedPlace = {
  provider: "google";
  place_id: string;
  place_name: string;
  formatted_address: string;
  lat: number;
  lng: number;
  raw?: any;
};

interface LocationAutocompleteProps {
  value: string;
  onChangeText: (v: string) => void;
  onSelect: (p: PickedPlace) => void;
  placeholder?: string;
}

type GoogleAutocompletePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  distance_meters?: number;
};

const PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  "";

// simple km/m formatting
function formatDistance(m?: number) {
  if (typeof m !== "number") return "";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChangeText,
  onSelect,
  placeholder = "Search a place...",
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GoogleAutocompletePrediction[]>([]);
  const [q, setQ] = useState(value);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [hasPicked, setHasPicked] = useState(false); // track "just selected"

  const sessionRef = useRef<string | null>(null);
  useEffect(() => {
    sessionRef.current = Math.random().toString(36).slice(2);
  }, []);

  // Get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setOrigin({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch (err) {
        console.log("Location error (non-fatal):", err);
      }
    })();
  }, []);

  // Debounce -> q
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setQ(value.trim());
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Fetch predictions
  useEffect(() => {
    let cancelled = false;

    // ⛔ If user just picked a place, do NOT fetch or reopen dropdown
    if (hasPicked) {
      setResults([]);
      setOpen(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const s = q;

      if (!s || s.length < 2 || !PLACES_API_KEY) {
        setResults([]);
        setOpen(false);
        return;
      }

      setLoading(true);

      try {
        const params: Record<string, string> = {
          input: s,
          key: PLACES_API_KEY,
          sessiontoken: sessionRef.current || "",
          // components: "country:gb", // optional region filter
        };

        if (origin) {
          params.origin = `${origin.lat},${origin.lng}`;
          params.location = `${origin.lat},${origin.lng}`;
          params.radius = "50000";
        }

        const qs = Object.entries(params)
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
          )
          .join("&");

        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?${qs}`
        );
        const json = await res.json();

        if (cancelled) return;

        if (json.status === "OK" && Array.isArray(json.predictions)) {
          let preds = json.predictions as GoogleAutocompletePrediction[];

          if (typeof preds[0]?.distance_meters === "number") {
            preds = [...preds].sort(
              (a, b) =>
                (a.distance_meters ?? Infinity) -
                (b.distance_meters ?? Infinity)
            );
          }

          setResults(preds);
          setOpen(true);
        } else {
          setResults([]);
          setOpen(false);
        }
      } catch (err) {
        console.error("Places autocomplete error:", err);
        if (!cancelled) {
          setResults([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q, origin, hasPicked]); // 👈 add hasPicked

  const pick = async (pred: GoogleAutocompletePrediction) => {
    if (!PLACES_API_KEY || !pred.place_id) return;

    try {
      const fields =
        "place_id,name,formatted_address,geometry,business_status";
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        pred.place_id
      )}&fields=${encodeURIComponent(
        fields
      )}&key=${encodeURIComponent(
        PLACES_API_KEY
      )}&sessiontoken=${encodeURIComponent(
        sessionRef.current || ""
      )}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status !== "OK" || !json.result) return;

      const d = json.result;
      if (d.business_status === "CLOSED_PERMANENTLY") return;

      const lat = d.geometry?.location?.lat;
      const lng = d.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return;

      onSelect({
        provider: "google",
        place_id: d.place_id,
        place_name: d.name || d.formatted_address || "",
        formatted_address: d.formatted_address || d.name || "",
        lat,
        lng,
        raw: d,
      });

      // mark as picked + fully close
      setHasPicked(true);
      setOpen(false);
      setResults([]);
    } catch (err) {
      console.error("Place details error:", err);
    }
  };

  return (
    <View
      className="relative"
      style={{ position: "relative", zIndex: 40 }}
    >
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          // user is editing again -> allow suggestions again
          setHasPicked(false);
          setOpen(true);
        }}
        onFocus={() => {
          if (!hasPicked && value.trim().length > 0) {
            setOpen(true);
          }
        }}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 text-sm"
      />

      {open && results.length > 0 && (
        <View
          className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72"
          style={{
            top: "100%",
            marginTop: 8,
            zIndex: 50,
          }}
        >
          {loading && (
            <View className="px-4 py-3 flex-row items-center">
              <ActivityIndicator />
              <Text className="ml-2 text-sm text-gray-500">
                Searching…
              </Text>
            </View>
          )}

          {!loading && (
            <ScrollView
              className="max-h-56"
              keyboardShouldPersistTaps="handled"
            >
              {results.map((p) => {
                const dm = p.distance_meters;
                const distanceLabel =
                  typeof dm === "number" && origin
                    ? formatDistance(dm)
                    : "";

                return (
                  <Pressable
                    key={p.place_id}
                    onPress={() => pick(p)}
                    className="w-full px-4 py-3 border-b border-gray-50"
                  >
                    <View className="flex-row items-center">
                      <Text className="flex-1 text-sm font-medium text-gray-900">
                        {p.structured_formatting?.main_text ||
                          p.description}
                      </Text>
                      {distanceLabel ? (
                        <Text className="ml-2 text-[10px] text-gray-500">
                          {distanceLabel}
                        </Text>
                      ) : null}
                    </View>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {p.structured_formatting?.secondary_text || ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View className="px-4 py-2 border-t border-gray-100">
            <Text className="text-[9px] text-gray-400">
              Powered by Google
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
