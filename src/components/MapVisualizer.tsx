import { useState, useEffect, useRef, useMemo } from 'react';
import { Compass, MapPin, ExternalLink, HelpCircle, X, Calendar, User, Image as ImageIcon, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { MaintenanceRecord } from '../sheetsService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';

interface MapProps {
  records: MaintenanceRecord[];
  onSelectRecord: (record: MaintenanceRecord) => void;
  selectedRecord: MaintenanceRecord | null;
  theme: 'light' | 'dark';
  appName?: string;
  tableName?: string;
}

// Custom Marker creator using Leaflet divIcon to bypass default image path issues 
// and style the markers dynamically using standard css matching our state colors!
const createCustomMarker = (status: string, isSelected: boolean) => {
  let color = '#f43f5e'; // Pending: rose-500
  if (status === 'Completed') color = '#10b981'; // Completed: emerald-500
  else if (status === 'In Progress') color = '#3b82f6'; // In Progress: blue-500
  else if (status === 'Waiting for Parts') color = '#f97316'; // Waiting for parts: orange-500

  const size = isSelected ? 34 : 24;
  const dotSize = isSelected ? 16 : 10;

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      ${isSelected ? `
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: ${color};
          opacity: 0.4;
          animation: ping-pulse 1.6s infinite ease-in-out;
        "></div>
      ` : ''}
      <div style="
        position: relative;
        width: ${dotSize}px;
        height: ${dotSize}px;
        border-radius: 50%;
        background-color: ${color};
        border: 2.5px solid #ffffff;
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

export default function MapVisualizer({ records, onSelectRecord, selectedRecord, theme, appName = '', tableName = '' }: MapProps) {
  const [viewMode, setViewMode] = useState<'osm' | 'radar'>('osm');
  const [isPopupMinimized, setIsPopupMinimized] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Reset popup minimized status when a record is selected
  useEffect(() => {
    if (selectedRecord) {
      setIsPopupMinimized(false);
    }
  }, [selectedRecord]);

  // Look up Soi / alley name from raw sheet values
  const getSoiValue = (record: MaintenanceRecord) => {
    if (!record.raw) return '-';
    const keys = Object.keys(record.raw);
    const soiKey = keys.find(k => k.trim().includes('ซอย') || k.trim().toLowerCase() === 'soi');
    if (soiKey && record.raw[soiKey]) {
      return record.raw[soiKey];
    }
    return '-';
  };

  // Look up Community name from raw sheet values
  const getCommunityValue = (record: MaintenanceRecord) => {
    if (!record.raw) return '-';
    const keys = Object.keys(record.raw);
    const communityKey = keys.find(k => k.trim().includes('ชุมชน') || k.trim().toLowerCase().includes('community') || k.trim().includes('เขต'));
    if (communityKey && record.raw[communityKey]) {
      return record.raw[communityKey];
    }
    return '-';
  };

  // Look up repair action / maintenance details from raw sheet values or standard fields
  const getRepairAction = (record: MaintenanceRecord) => {
    if (record.repairAction) return record.repairAction;
    if (record.raw) {
      const keys = Object.keys(record.raw);
      const key = keys.find(k => k.includes('การซ่อมบำรุงแก้ไข') || k.includes('การแก้ไข') || k.includes('รายละเอียดการแก้ไขเพิ่มเติม'));
      if (key && record.raw[key]) return record.raw[key];
    }
    return record.remarks || '-';
  };

  // Safe Google Sheets & AppSheet image preview link converter
  const getImageUrl = (url: string) => {
    if (!url) return '';
    // Handle drive links and convert to previewable web Content links if needed
    if (url.includes('drive.google.com')) {
      const match = url.match(/id=([^&]+)/) || url.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        return `https://docs.google.com/uc?export=view&id=${match[1]}`;
      }
    }
    // If it's a relative path (AppSheet image) and appName is provided
    if (url && !url.startsWith('http') && appName) {
       return `https://www.appsheet.com/template/gettablefileurl?appName=${encodeURIComponent(appName)}&tableName=${encodeURIComponent(tableName)}&fileName=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Filter records with valid lat/lng coordinates
  const mappedRecords = useMemo(() => {
    return records.filter((r) => 
      r.lat !== null && r.lat !== undefined && !isNaN(r.lat) && 
      r.lng !== null && r.lng !== undefined && !isNaN(r.lng)
    );
  }, [records]);

  // Calculate default center coordinate
  const defaultCenter = useMemo(() => {
    const fallback = { lat: 12.6815, lng: 101.2813 }; // Rayong City default center
    if (mappedRecords.length === 0) {
      return fallback;
    }
    const lats = mappedRecords.map((r) => r.lat as number);
    const lngs = mappedRecords.map((r) => r.lng as number);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    
    if (isNaN(centerLat) || isNaN(centerLng) || !isFinite(centerLat) || !isFinite(centerLng)) {
      return fallback;
    }
    
    return { lat: centerLat, lng: centerLng };
  }, [mappedRecords]);

  // Status Colors Mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#10b981'; // emerald-500
      case 'In Progress':
        return '#3b82f6'; // blue-500
      case 'Waiting for Parts':
        return '#f97316'; // orange-500
      case 'Pending':
      default:
        return '#f43f5e'; // rose-500
    }
  };

  // Setup Leaflet Map Instance
  useEffect(() => {
    if (viewMode !== 'osm' || !mapContainerRef.current) {
      // Clean up map instance if switching view modes
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        tileLayerRef.current = null;
      }
      return;
    }

    // Initialize Leaflet Map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([Number(defaultCenter.lat) || 12.6815, Number(defaultCenter.lng) || 101.2813], 13);

      // Add customized Zoom Control to bottom-left (looks cleaner and avoids overlap with bottom-right popup)
      L.control.zoom({ position: 'bottomleft' }).addTo(mapRef.current);

      // Create Layer Group for markers
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // Update Tile style based on light/dark theme
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    // Standard OpenStreetMap tiles (free, no API key required)
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    // Clean up map on component unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [viewMode, theme, defaultCenter.lat, defaultCenter.lng]);

  // Update Map Markers on records change
  useEffect(() => {
    if (viewMode !== 'osm' || !mapRef.current || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Map each pole record to Leaflet marker
    mappedRecords.forEach((record) => {
      if (record.lat === null || record.lng === null || isNaN(Number(record.lat)) || isNaN(Number(record.lng))) return;

      const isSelected = selectedRecord?.id === record.id;
      const marker = L.marker([Number(record.lat), Number(record.lng)], {
        icon: createCustomMarker(record.status, isSelected)
      });

      // Simple click handler
      marker.on('click', () => {
        onSelectRecord(record);
      });

      // Compute image URL for popup thumbnail
      const previewImg = getImageUrl(record.imageUrl);
      const imgHTML = previewImg 
        ? `<div style="margin-top: 6px; border-radius: 6px; overflow: hidden; border: 1px solid #475569; height: 75px; background-color: #0f172a;">
             <img src="${previewImg}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" />
           </div>`
        : '';

      // Bind informative popup
      marker.bindPopup(`
        <div style="font-family: 'Prompt', sans-serif; font-size: 11px; line-height: 1.4; color: ${theme === 'light' ? '#0f172a' : '#f1f5f9'}; padding: 2px; width: 170px;">
          <strong style="color: #3b82f6; font-size: 12px; font-family: monospace; display: block; border-bottom: 1px solid #475569; padding-bottom: 3px; margin-bottom: 5px;">📍 ${record.poleId}</strong>
          <div style="margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>ตำแหน่ง:</strong> ${record.location || 'ไม่ระบุ'}</div>
          <div style="margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>อาการ:</strong> ${record.issue || 'ไม่ระบุ'}</div>
          <div style="margin-top: 2px; font-weight: bold; color: ${getStatusColor(record.status)};"><strong>สถานะ:</strong> ${record.statusThai || record.status}</div>
          ${imgHTML}
        </div>
      `, {
        closeButton: false,
        className: 'custom-map-popup'
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [viewMode, mappedRecords, selectedRecord, onSelectRecord, theme, appName, tableName]);

  // Handle flyTo when selectedRecord changes
  useEffect(() => {
    if (
      viewMode !== 'osm' || 
      !mapRef.current || 
      !selectedRecord || 
      selectedRecord.lat === null || 
      selectedRecord.lng === null ||
      isNaN(selectedRecord.lat) ||
      isNaN(selectedRecord.lng)
    ) return;

    mapRef.current.flyTo([Number(selectedRecord.lat), Number(selectedRecord.lng)], 16, {
      animate: true,
      duration: 1.2
    });
  }, [selectedRecord, viewMode]);

  if (mappedRecords.length === 0) {
    return (
      <div className="bg-[#1E293B] border border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center h-[320px]" id="no-coords-map">
        <div className="p-3 bg-slate-950 rounded-full border border-slate-800 mb-3 text-slate-500 animate-pulse">
          <Compass size={24} />
        </div>
        <h4 className="text-sm font-semibold text-slate-300">ไม่พบบันทึกที่มีพิกัด GPS</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs font-sans">
          กรุณากรอกข้อมูล ละติจูด, ลองจิจูด ใน Google Sheets / AppSheet เพื่อแสดงเสาไฟบนแผนที่นำทาง
        </p>
      </div>
    );
  }

  // Bounding box calculations for RADAR SVG Fallback
  const lats = mappedRecords.map((r) => r.lat as number);
  const lngs = mappedRecords.map((r) => r.lng as number);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = maxLat - minLat || 0.0001;
  const lngSpan = maxLng - minLng || 0.0001;

  // Add 10% padding to bounds
  const padLat = latSpan * 0.1;
  const padLng = lngSpan * 0.1;

  const latMinPadded = minLat - padLat;
  const latMaxPadded = maxLat + padLat;
  const lngMinPadded = minLng - padLng;
  const lngMaxPadded = maxLng + padLng;

  const paddedLatSpan = latMaxPadded - latMinPadded;
  const paddedLngSpan = lngMaxPadded - lngMinPadded;

  return (
    <div className="bg-[#1E293B] border border-slate-700 rounded-lg overflow-hidden flex flex-col h-[340px] relative shadow-lg" id="map-visualizer-container">
      {/* CSS injection for leaflet custom animations and dark mode tile adjustments */}
      <style>{`
        @keyframes ping-pulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .custom-map-popup .leaflet-popup-content-wrapper {
          background-color: ${theme === 'light' ? '#ffffff' : '#0f172a'} !important;
          border: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'} !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
        }
        .custom-map-popup .leaflet-popup-tip {
          background-color: ${theme === 'light' ? '#ffffff' : '#0f172a'} !important;
          border: 1px solid ${theme === 'light' ? '#e2e8f0' : '#334155'} !important;
        }
      `}</style>

      {/* Header controls */}
      <div className="flex justify-between items-center px-4 py-3 bg-slate-900/40 border-b border-slate-700 z-10 select-none">
        <div className="flex items-center gap-2">
          <Compass className="text-blue-500 animate-spin-slow" size={16} />
          <span className="text-base font-semibold text-slate-100 font-sans">
            พิกัดแผนที่ OpenStreetMap ({mappedRecords.length} จุด)
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('osm')}
            className={`px-2 py-0.5 text-[9px] font-sans rounded-md transition-all cursor-pointer ${
              viewMode === 'osm'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            แผนที่ถนน (OSM)
          </button>
          <button
            onClick={() => setViewMode('radar')}
            className={`px-2 py-0.5 text-[9px] font-sans rounded-md transition-all cursor-pointer ${
              viewMode === 'radar'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            เรดาร์ (GRID)
          </button>
        </div>
      </div>

      {viewMode === 'osm' ? (
        <div className="flex-1 w-full h-full relative bg-slate-950 min-h-[220px] z-0" ref={mapContainerRef} id="osm-map" />
      ) : (
        <div className="relative flex-1 bg-slate-950/80 flex items-center justify-center overflow-hidden p-4 min-h-[220px]">
          {/* Radar background grid lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80px] h-[80px] rounded-full border border-blue-500/5" />
            <div className="w-[160px] h-[160px] rounded-full border border-blue-500/5" />
            <div className="w-[240px] h-[240px] rounded-full border border-blue-500/5" />
            <div className="absolute h-full w-[1px] bg-blue-500/5" />
            <div className="absolute w-full h-[1px] bg-blue-500/5" />
          </div>

          {/* Interactive SVG plotting */}
          <svg className="w-full h-full relative z-10" id="radar-svg-grid">
            {mappedRecords.map((record) => {
              const xPercent = ((record.lng! - lngMinPadded) / paddedLngSpan) * 100;
              const yPercent = 100 - ((record.lat! - latMinPadded) / paddedLatSpan) * 100;

              const isSelected = selectedRecord?.id === record.id;
              const color = getStatusColor(record.status);

              return (
                <g key={record.id} className="cursor-pointer">
                  {/* Pulse ring for selected */}
                  {isSelected && (
                    <circle
                       cx={`${xPercent}%`}
                       cy={`${yPercent}%`}
                       r="12"
                       fill="none"
                       stroke={color}
                       strokeWidth="1.5"
                       className="animate-ping origin-center"
                       style={{ transformOrigin: `${xPercent}% ${yPercent}%` }}
                    />
                  )}

                  {/* Outer circle for hover/active */}
                  <circle
                    cx={`${xPercent}%`}
                    cy={`${yPercent}%`}
                    r={isSelected ? '8' : '5'}
                    fill={color}
                    fillOpacity={isSelected ? '0.3' : '0.15'}
                    stroke={color}
                    strokeWidth={isSelected ? '2' : '1'}
                    onClick={() => onSelectRecord(record)}
                    className="transition-all duration-300"
                  />

                  {/* Core dot */}
                  <circle
                    cx={`${xPercent}%`}
                    cy={`${yPercent}%`}
                    r="3.5"
                    fill={color}
                    onClick={() => onSelectRecord(record)}
                  />

                  {/* Label for ID */}
                  {(isSelected || mappedRecords.length < 15) && (
                    <text
                      x={`${xPercent}%`}
                      y={`${yPercent}%`}
                      dy="-10"
                      textAnchor="middle"
                      fill={isSelected ? '#f59e0b' : '#a3a3a3'}
                      className="text-[9px] font-mono font-bold select-none"
                    >
                      {record.poleId}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Active Record Detail Card Overlay */}
      <AnimatePresence mode="wait">
        {selectedRecord && (
          isPopupMinimized ? (
            <motion.button
              key="minimized-popup"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              onClick={() => setIsPopupMinimized(false)}
              className={`absolute bottom-2 right-2 backdrop-blur-md rounded-lg py-1.5 px-2.5 z-30 shadow-lg flex items-center gap-1.5 border text-[11px] font-semibold cursor-pointer select-none transition-all duration-200 ${
                theme === 'light'
                  ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/40 hover:bg-slate-50'
                  : 'bg-slate-900/95 border-slate-700 text-slate-100 hover:bg-slate-800'
              }`}
            >
              <MapPin size={11} className="text-blue-500 animate-bounce shrink-0" />
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">เสา {selectedRecord.poleId}</span>
              <span className="text-[9px] opacity-60">| คลิกเพื่อพับเปิด</span>
              <ChevronUp size={11} className="text-slate-400 shrink-0 ml-0.5" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded-popup"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`absolute bottom-2 right-2 w-[280px] sm:w-[320px] max-w-[95%] backdrop-blur-md rounded-xl p-3 z-30 shadow-2xl flex flex-col gap-2 transition-all duration-300 ${
                theme === 'light'
                  ? 'bg-white/95 border border-slate-200 text-slate-800 shadow-slate-300/40'
                  : 'bg-slate-900/95 border border-slate-700/80 text-slate-100'
              }`}
              id="map-active-detail-overlay"
            >
              {/* Header with Title, Status, and Fold/Close buttons */}
              <div className={`flex justify-between items-center border-b pb-1.5 ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}`}>
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-500 animate-bounce shrink-0" />
                  <span className={`font-mono font-bold text-xs sm:text-sm ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>{selectedRecord.poleId}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-sans font-semibold border shrink-0" style={{
                    backgroundColor: `${getStatusColor(selectedRecord.status)}15`,
                    borderColor: getStatusColor(selectedRecord.status),
                    color: getStatusColor(selectedRecord.status)
                  }}>
                    {selectedRecord.statusThai || selectedRecord.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Fold/Minimize Button */}
                  <button
                    onClick={() => setIsPopupMinimized(true)}
                    title="พับเก็บ"
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ChevronDown size={12} />
                  </button>
                  {/* Close Button */}
                  <button
                    onClick={() => onSelectRecord(null as any)}
                    title="ปิดรายละเอียด"
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Main compact content grid */}
              <div className="flex gap-2.5 items-start">
                {/* Image Preview Thumbnail */}
                {getImageUrl(selectedRecord.imageUrl) ? (
                  <div className={`relative w-[65px] h-[65px] rounded-lg overflow-hidden border shrink-0 group ${
                    theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-950'
                  }`}>
                    <img
                      src={getImageUrl(selectedRecord.imageUrl)}
                      alt={`Pole ${selectedRecord.poleId}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <a
                      href={getImageUrl(selectedRecord.imageUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <Eye size={11} className="text-white" />
                    </a>
                  </div>
                ) : (
                  <div className={`w-[65px] h-[65px] rounded-lg border flex flex-col items-center justify-center shrink-0 ${
                    theme === 'light' ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-slate-950/60 border-slate-800/80 text-slate-600'
                  }`}>
                    <ImageIcon size={14} className={`mb-0.5 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span className="text-[8px] font-sans">ไม่มีรูปภาพ</span>
                  </div>
                )}

                {/* Detailed Summary (ชุมชน, ซอย, วันที่เวลา, พิกัด, ปัญหาที่พบ, การแก้ไข) */}
                <div className="flex-1 min-w-0 space-y-0.5 text-[10px] leading-snug">
                  <p className="truncate">
                    <strong className={`${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} mr-1 font-sans`}>ชุมชน:</strong>
                    <span className={`${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>{getCommunityValue(selectedRecord)}</span>
                  </p>
                  <p className="truncate">
                    <strong className={`${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} mr-1 font-sans`}>ซอย:</strong>
                    <span className={`${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>{getSoiValue(selectedRecord)}</span>
                  </p>
                  <p className="truncate">
                    <strong className={`${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} mr-1 font-sans`}>วันที่เวลา:</strong>
                    <span className={`${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>{selectedRecord.fixedDate || selectedRecord.timestamp || '-'}</span>
                  </p>
                  <p className="truncate">
                    <strong className={`${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} mr-1 font-sans`}>พิกัด:</strong>
                    <span className={`${theme === 'light' ? 'text-slate-700' : 'text-slate-200'} font-mono text-[9px]`}>{selectedRecord.lat ? `${selectedRecord.lat}, ${selectedRecord.lng}` : 'ไม่มีพิกัด'}</span>
                  </p>
                  <p className="truncate">
                    <strong className={`${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} mr-1 font-sans`}>ปัญหาที่พบ:</strong>
                    <span className={`${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>{selectedRecord.issue || '-'}</span>
                  </p>
                  <p className="truncate">
                    <strong className={`${theme === 'light' ? 'text-slate-500' : 'text-slate-400'} mr-1 font-sans`}>การแก้ไข:</strong>
                    <span className={`${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>{getRepairAction(selectedRecord)}</span>
                  </p>
                </div>
              </div>

              {/* Navigation Action Footer */}
              {selectedRecord.lat && (
                <div className={`flex justify-end mt-0.5 border-t pt-1.5 ${theme === 'light' ? 'border-slate-100' : 'border-slate-800/60'}`}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.lat},${selectedRecord.lng}`}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-[9px] hover:bg-blue-500 transition-colors cursor-pointer shadow-sm w-full justify-center"
                  >
                    <ExternalLink size={9} />
                    เปิดแผนที่นำทาง (Google Maps)
                  </a>
                </div>
              )}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Helper Toast when nothing is selected */}
      {!selectedRecord && (
        <div className={`absolute bottom-3 left-3 right-3 backdrop-blur-md p-2.5 rounded-lg text-[10px] flex justify-between items-center z-10 shadow-lg select-none ${
          theme === 'light'
            ? 'bg-white/95 border border-slate-200 text-slate-700 shadow-slate-200/50'
            : 'bg-slate-950/90 border border-slate-700/80 text-slate-400'
        }`}>
          <span className="flex items-center gap-1.5 font-sans">
            <HelpCircle size={12} className="text-blue-500 animate-pulse shrink-0" />
            คลิกที่จุดพินเสาไฟบนแผนที่ เพื่อแสดงรายละเอียดพร้อมรูปภาพประกอบ และกดนำทางได้ทันที
          </span>
        </div>
      )}
    </div>
  );
}
