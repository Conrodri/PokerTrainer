import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ZoomLevel = 90 | 100 | 110 | 125 | 150;

export const ZOOM_LEVELS: { value: ZoomLevel; labelFr: string; labelEn: string; hint: string }[] = [
  { value: 90,  labelFr: 'Petit',          labelEn: 'Small',          hint: '90%'  },
  { value: 100, labelFr: 'Normal',          labelEn: 'Normal',         hint: '100%' },
  { value: 110, labelFr: 'Grand',           labelEn: 'Large',          hint: '110%' },
  { value: 125, labelFr: 'Très grand',      labelEn: 'X-Large',        hint: '125%' },
  { value: 150, labelFr: 'Maxi',            labelEn: 'Maximum',        hint: '150%' },
];

interface ZoomState {
  zoom: ZoomLevel;
  setZoom: (z: ZoomLevel) => void;
}

export const useZoomStore = create<ZoomState>()(
  persist(
    (set) => ({
      zoom: 100,
      setZoom: (zoom) => {
        set({ zoom });
        document.documentElement.style.fontSize = `${zoom}%`;
      },
    }),
    { name: 'poker-zoom' }
  )
);

/** Call once on app boot to apply persisted zoom */
export function applyStoredZoom() {
  try {
    const raw = localStorage.getItem('poker-zoom');
    const zoom: ZoomLevel = raw ? (JSON.parse(raw)?.state?.zoom ?? 100) : 100;
    document.documentElement.style.fontSize = `${zoom}%`;
  } catch {
    // silently ignore
  }
}
