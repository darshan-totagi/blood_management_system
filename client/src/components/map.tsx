import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { useCallback, useMemo } from "react";
import type { Donor } from "@shared/schema";

interface InteractiveMapProps {
  center: [number, number];
  donors: (Donor & { distance: number })[];
  onDonorSelect: (donor: Donor) => void;
  selectedDonor?: Donor | null;
  showUserLocation?: boolean;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

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

  const normalizedCenter = useMemo<[number, number]>(() => {
    const lat = Number(center?.[0]) || 17.385044;
    const lng = Number(center?.[1]) || 78.486671;
    return [lat, lng];
  }, [center]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    map?.panTo({ lat: normalizedCenter[0], lng: normalizedCenter[1] });
  }, [normalizedCenter]);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={13}
      center={{ lat: normalizedCenter[0], lng: normalizedCenter[1] }}
      onLoad={onMapLoad}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {/* User Location */}
      {showUserLocation && (
        <Marker
          position={{ lat: normalizedCenter[0], lng: normalizedCenter[1] }}
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          }}
        />
      )}

      

      {/* Donor Markers */}
      {donors.map((donor) => {
        const lat = Number(donor.latitude);
        const lng = Number(donor.longitude);

        if (!lat || !lng) return null;

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
