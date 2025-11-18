import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { useCallback, useEffect, useState } from "react";
import type { Donor } from "@shared/schema";

interface InteractiveMapProps {
  center: [number, number] | string; // <-- NOW SUPPORTS CITY NAME
  donors: (Donor & { distance: number })[];
  onDonorSelect: (donor: Donor) => void;
  selectedDonor?: Donor | null;
  showUserLocation?: boolean;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

// 🔥 Convert city name → coordinates using Google Geocoding API
async function geocodeCity(city: string) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    city
  )}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status === "OK") {
    return {
      lat: data.results[0].geometry.location.lat,
      lng: data.results[0].geometry.location.lng,
    };
  }

  console.error("Geocoding failed:", data);
  return null;
}

export default function InteractiveMap({
  center,
  donors,
  onDonorSelect,
  selectedDonor,
  showUserLocation = true,
}: InteractiveMapProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  const [resolvedCenter, setResolvedCenter] = useState<[number, number] | null>(null);

  // AUTO-RESOLVE CENTER (city name → lat/lng)
  useEffect(() => {
    async function resolveCenter() {
      // Case 1: Center is a city name string
      if (typeof center === "string") {
        const loc = await geocodeCity(center);
        if (loc) setResolvedCenter([loc.lat, loc.lng]);
        else setResolvedCenter([17.385044, 78.486671]); // fallback
      }

      // Case 2: Center is lat/lng array
      else if (Array.isArray(center)) {
        const lat = Number(center[0]);
        const lng = Number(center[1]);

        if (!isNaN(lat) && !isNaN(lng)) {
          setResolvedCenter([lat, lng]);
        } else {
          setResolvedCenter([17.385044, 78.486671]); // fallback
        }
      }
    }

    resolveCenter();
  }, [center]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      if (!resolvedCenter) return;
      map.panTo({ lat: resolvedCenter[0], lng: resolvedCenter[1] });
    },
    [resolvedCenter]
  );

  if (!isLoaded || !resolvedCenter) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={13}
      center={{ lat: resolvedCenter[0], lng: resolvedCenter[1] }}
      onLoad={onMapLoad}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {/* User Location Marker */}
      {showUserLocation && (
        <Marker
          position={{ lat: resolvedCenter[0], lng: resolvedCenter[1] }}
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          }}
        />
      )}

      {/* Donor Markers */}
      {donors.map((donor) => {
        const lat = Number(donor.latitude);
        const lng = Number(donor.longitude);

        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <Marker
            key={donor.id}
            position={{ lat, lng }}
            onClick={() => onDonorSelect(donor)}
            icon={{
              url:
                selectedDonor?.id === donor.id
                  ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                  : "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            }}
          />
        );
      })}
    </GoogleMap>
  );
}
