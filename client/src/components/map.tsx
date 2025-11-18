import { GoogleMap, MarkerF, useLoadScript, OverlayView } from "@react-google-maps/api";
import { useCallback, useEffect, useState } from "react";
import type { Donor } from "@shared/schema";

interface InteractiveMapProps {
  center: [number, number] | string;
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

  // ⭐ Inject pulse animation CSS only once
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .pulse-dot {
        width: 16px;
        height: 16px;
        background-color: #ef4444;
        border-radius: 50%;
        position: relative;
        box-shadow: 0 0 10px rgba(239,68,68,0.6);
      }

      .pulse-dot::after {
        content: "";
        position: absolute;
        width: 16px;
        height: 16px;
        top: 0;
        left: 0;
        border-radius: 50%;
        background-color: #ef4444;
        opacity: 0.6;
        animation: pulse 1.5s infinite ease-out;
      }

      .pulse-selected {
        transform: scale(1.4);
      }

      .pulse-selected::after {
        animation-duration: 1s;
      }

      @keyframes pulse {
        0%   { transform: scale(1); opacity: 0.7; }
        70%  { transform: scale(2.5); opacity: 0; }
        100% { transform: scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    return () => document.head.removeChild(style);
  }, []);

  // AUTO-RESOLVE CENTER (city name → lat/lng or number array)
  useEffect(() => {
    async function resolve() {
      if (typeof center === "string") {
        const c = await geocodeCity(center);
        if (c) setResolvedCenter([c.lat, c.lng]);
      } else if (Array.isArray(center)) {
        setResolvedCenter([Number(center[0]), Number(center[1])]);
      }
    }
    resolve();
  }, [center]);

  if (!isLoaded || !resolvedCenter) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={13}
      center={{ lat: resolvedCenter[0], lng: resolvedCenter[1] }}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >

      {/* USER LOCATION MARKER (blue dot) */}
      {showUserLocation && (
        <OverlayView
          position={{ lat: resolvedCenter[0], lng: resolvedCenter[1] }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        </OverlayView>
      )}

      {/* DONOR MARKERS WITH ANIMATION */}
      {donors.map((donor) => {
        const lat = Number(donor.latitude);
        const lng = Number(donor.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;

        const isSelected = selectedDonor?.id === donor.id;

        return (
          <OverlayView
            key={donor.id}
            position={{ lat, lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              className={
                isSelected
                  ? "pulse-dot pulse-selected cursor-pointer"
                  : "pulse-dot cursor-pointer"
              }
              onClick={() => onDonorSelect(donor)}
            />
          </OverlayView>
        );
      })}
    </GoogleMap>
  );
}
