import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';

interface LocationPickerMapProps {
  initialLat: number;
  initialLng: number;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

type Libraries = ("places" | "drawing" | "geometry" | "visualization")[];
const libraries: Libraries = ['places'];

export default function LocationPickerMap({
  initialLat,
  initialLng,
  onLocationSelect,
  height = "300px"
}: LocationPickerMapProps) {
  // Use the same ID and libraries as GoogleMapsAutocomplete to share the script
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Update center when props change
  useEffect(() => {
    if (initialLat && initialLng) {
      setCenter({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng]);

  // Memoize options to prevent re-renders that could freeze the map
  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    draggable: true,
    gestureHandling: "greedy", // Ensures map handles gestures aggressively
  }), []);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  const onCenterChanged = useCallback(() => {
    if (map && markerRef.current) {
      const currentCenter = map.getCenter();
      if (currentCenter) {
        markerRef.current.setPosition(currentCenter);
      }
    }
  }, [map]);

  const onMarkerLoad = useCallback((marker: google.maps.Marker) => {
    markerRef.current = marker;
  }, []);

  const onIdle = useCallback(() => {
    if (map) {
      const newCenter = map.getCenter();
      if (newCenter) {
        const lat = parseFloat(newCenter.lat().toFixed(6));
        const lng = parseFloat(newCenter.lng().toFixed(6));
        onLocationSelect(lat, lng);
      }
    }
  }, [map, onLocationSelect]);

  if (!isLoaded) {
    return (
      <div
        className="w-full bg-neutral-100 animate-pulse rounded-lg border border-neutral-300"
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
          Loading Map...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-neutral-300 shadow-sm" style={{ height }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={17}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={onIdle}
        onCenterChanged={onCenterChanged}
        options={mapOptions}
      >
        <MarkerF
          position={center}
          onLoad={onMarkerLoad}
          options={{
            clickable: false,
            draggable: false,
          }}
        />
      </GoogleMap>
    </div>
  );
}
