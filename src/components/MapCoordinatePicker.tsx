import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Layers, Check, X, RotateCcw, Crosshair, ChevronDown, ChevronUp } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapCoordinatePickerProps {
  value: string;
  onChange: (value: string) => void;
  theme?: 'light' | 'dark';
  label?: string;
  placeholder?: string;
  defaultCenter?: { lat: number; lng: number };
}

// Custom Leaflet DivIcon for pin marker
const createPickerPinIcon = () => {
  const html = `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: grab;">
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: #2563eb;
        opacity: 0.35;
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 26px;
        height: 26px;
        background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
        border: 2.5px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-picker-pin-wrapper',
    iconSize: [36, 36],
    iconAnchor: [18, 32],
    popupAnchor: [0, -32],
  });
};

// Helper: parse string to {lat, lng}
const parseCoordinates = (str: string): { lat: number; lng: number } | null => {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split(/[\s,]+/);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
};

export default function MapCoordinatePicker({
  value,
  onChange,
  theme = 'dark',
  label = 'พิกัดซ่อมบำรุง (GPS)',
  placeholder = 'เช่น 12.682379, 101.246283',
  defaultCenter = { lat: 12.6815, lng: 101.2813 }, // เทศบาลนครระยอง
}: MapCoordinatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');
  const [isLocating, setIsLocating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const currentCoords = parseCoordinates(value);

  // Switch tile layer
  const applyTileLayer = useCallback((map: L.Map, layerType: 'street' | 'satellite') => {
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    const tileUrl =
      layerType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const maxZoom = layerType === 'satellite' ? 19 : 19;
    const attribution =
      layerType === 'satellite'
        ? '&copy; Esri World Imagery'
        : '&copy; OpenStreetMap contributors';

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom, attribution }).addTo(map);
  }, []);

  // Update location and synchronize marker & input
  const setPoint = useCallback(
    (lat: number, lng: number, shouldPan = true, zoomLevel?: number) => {
      const fixedLat = Number(lat.toFixed(6));
      const fixedLng = Number(lng.toFixed(6));
      const formatted = `${fixedLat.toFixed(6)}, ${fixedLng.toFixed(6)}`;
      onChange(formatted);

      if (mapRef.current) {
        if (!markerRef.current) {
          const marker = L.marker([fixedLat, fixedLng], {
            icon: createPickerPinIcon(),
            draggable: true,
          }).addTo(mapRef.current);

          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            setPoint(pos.lat, pos.lng, false);
          });

          markerRef.current = marker;
        } else {
          markerRef.current.setLatLng([fixedLat, fixedLng]);
        }

        if (shouldPan) {
          if (zoomLevel) {
            mapRef.current.setView([fixedLat, fixedLng], zoomLevel, { animate: true });
          } else {
            mapRef.current.panTo([fixedLat, fixedLng], { animate: true });
          }
        }
      }
    },
    [onChange]
  );

  // Initialize Leaflet map when opened
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Destroy prior map instance if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    }

    const initialCenter = currentCoords
      ? [currentCoords.lat, currentCoords.lng]
      : [defaultCenter.lat, defaultCenter.lng];
    const initialZoom = currentCoords ? 16 : 14;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: false,
    });

    mapRef.current = map;
    applyTileLayer(map, mapLayer);

    // If coordinates already exist, place initial marker
    if (currentCoords) {
      const marker = L.marker([currentCoords.lat, currentCoords.lng], {
        icon: createPickerPinIcon(),
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setPoint(pos.lat, pos.lng, false);
      });

      markerRef.current = marker;
    }

    // Map Click Handler -> Move/Place Pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      setPoint(e.latlng.lat, e.latlng.lng, false);
    });

    // Invalidate size to ensure tiles render immediately when expanded
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [isOpen]); // Only initialize on open

  // Switch layer on state change
  useEffect(() => {
    if (mapRef.current) {
      applyTileLayer(mapRef.current, mapLayer);
    }
  }, [mapLayer, applyTileLayer]);

  // Sync external value changes (e.g. user typed into text input)
  useEffect(() => {
    if (!mapRef.current) return;
    if (currentCoords) {
      if (!markerRef.current) {
        const marker = L.marker([currentCoords.lat, currentCoords.lng], {
          icon: createPickerPinIcon(),
          draggable: true,
        }).addTo(mapRef.current);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setPoint(pos.lat, pos.lng, false);
        });

        markerRef.current = marker;
      } else {
        const cur = markerRef.current.getLatLng();
        if (Math.abs(cur.lat - currentCoords.lat) > 0.00001 || Math.abs(cur.lng - currentCoords.lng) > 0.00001) {
          markerRef.current.setLatLng([currentCoords.lat, currentCoords.lng]);
        }
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value, currentCoords, setPoint]);

  // Device GPS
  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์หรือเบราว์เซอร์ไม่รองรับการดึงพิกัด GPS');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPoint(lat, lng, true, 17);
        if (!isOpen) {
          setIsOpen(true);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('ไม่สามารถดึงตำแหน่งพิกัด GPS ได้ กรุณาเปิดการเข้าถึงตำแหน่ง หรือคลิกเลือกจุดบนแผนที่แทน');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Clear point
  const handleClear = () => {
    onChange('');
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  return (
    <div className="space-y-2">
      {/* Label and Actions Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <MapPin size={13} className="text-rose-400 shrink-0" />
          <span>{label}</span>
          {currentCoords && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded">
              ระบุแล้ว
            </span>
          )}
        </label>

        <div className="flex items-center gap-1.5 text-xs">
          {/* Toggle Map View Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
              isOpen
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/25'
            }`}
            title={isOpen ? 'ซ่อนแผนที่' : 'เปิดแผนที่เพื่อคลิกปักหมุด'}
          >
            <MapPin size={11} className={isOpen ? 'text-white' : 'text-blue-400'} />
            <span>{isOpen ? 'ซ่อนแผนที่' : 'ปักหมุดบนแผนที่'}</span>
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {/* Device Location Button */}
          <button
            type="button"
            onClick={handleGetDeviceLocation}
            disabled={isLocating}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            title="ดึงพิกัดจากตำแหน่งปัจจุบันของอุปกรณ์ (GPS)"
          >
            <Navigation size={11} className={isLocating ? 'animate-spin' : ''} />
            <span>{isLocating ? 'กำลังค้นหา...' : 'พิกัดปัจจุบัน'}</span>
          </button>
        </div>
      </div>

      {/* Coordinate Input Field */}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-16 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors cursor-pointer"
            title="ล้างค่าพิกัด"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Interactive Map Box (Collapsible) */}
      {isOpen && (
        <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-lg space-y-0 animate-in fade-in zoom-in-95 duration-200">
          <style>{`
            .custom-picker-pin-wrapper {
              background: transparent !important;
              border: none !important;
            }
            .leaflet-control-zoom {
              border: none !important;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3) !important;
              border-radius: 8px !important;
              overflow: hidden;
            }
            .leaflet-control-zoom a {
              background-color: #1e293b !important;
              color: #f8fafc !important;
              border-color: #334155 !important;
            }
            .leaflet-control-zoom a:hover {
              background-color: #2563eb !important;
              color: #ffffff !important;
            }
          `}</style>

          {/* Map Top Floating Controls Bar */}
          <div className="absolute top-2 left-2 right-2 z-[400] flex items-center justify-between gap-2 pointer-events-none">
            {/* Layer switcher */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 shadow-md flex items-center gap-0.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => setMapLayer('street')}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  mapLayer === 'street'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                แผนที่ถนน
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('satellite')}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  mapLayer === 'satellite'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                ดาวเทียม
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1 pointer-events-auto">
              {currentCoords && (
                <button
                  type="button"
                  onClick={() => {
                    if (mapRef.current && currentCoords) {
                      mapRef.current.setView([currentCoords.lat, currentCoords.lng], 17, { animate: true });
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-blue-400 hover:text-blue-300 text-[10px] font-semibold shadow-md flex items-center gap-1 cursor-pointer"
                  title="เลื่อนแผนที่ไปที่หมุด"
                >
                  <Crosshair size={11} />
                  <span>จุดหมุด</span>
                </button>
              )}
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div
            ref={mapContainerRef}
            className="w-full h-64 sm:h-72 z-0 cursor-crosshair"
            style={{ minHeight: '250px' }}
          />

          {/* Bottom Info Banner */}
          <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-medium">
                {currentCoords
                  ? `พิกัดที่เลือก: ${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`
                  : 'คลิกบนแผนที่ หรือลากหมุดเพื่อระบุตำแหน่ง'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
              >
                <Check size={12} />
                <span>ใช้พิกัดนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
