import type { Libraries } from '@react-google-maps/api';

// useJsApiLoader throws if it is called again with different options, so every
// component must share this exact config (same id, key and libraries).
const libraries: Libraries = ['places'];

export const GOOGLE_MAPS_LOADER_OPTIONS = {
  id: 'google-map-script',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  libraries,
};
