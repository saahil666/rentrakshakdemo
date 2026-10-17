"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

interface LiveMapProps {
  propertyCoords: { lat: number; lon: number; label: string };
  userCoords: { lat: number; lon: number; accuracy?: number } | null;
  onMapClick?: (lat: number, lon: number) => void;
}

export default function LiveMap({ propertyCoords, userCoords, onMapClick }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const propertyMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Fix leaflet's default icon paths in Next.js
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current, {
        center: [propertyCoords.lat, propertyCoords.lon],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (onMapClick) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update Property Marker
    if (propertyMarkerRef.current) {
      propertyMarkerRef.current.setLatLng([propertyCoords.lat, propertyCoords.lon]);
      propertyMarkerRef.current.bindPopup(`<b>Target Listing:</b><br/>${propertyCoords.label}`).openPopup();
    } else {
      const pIcon = L.divIcon({
        className: "custom-property-pin",
        html: `
          <div style="background:#9333ea;color:#ffffff;padding:6px;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(147,51,234,0.7);border:2px solid #ffffff;">
            🏠
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      propertyMarkerRef.current = L.marker([propertyCoords.lat, propertyCoords.lon], { icon: pIcon })
        .addTo(map)
        .bindPopup(`<b>Target Listing:</b><br/>${propertyCoords.label}`);
    }

    // Update 500m Verification Geofence Circle
    if (circleRef.current) {
      circleRef.current.setLatLng([propertyCoords.lat, propertyCoords.lon]);
    } else {
      circleRef.current = L.circle([propertyCoords.lat, propertyCoords.lon], {
        radius: 500,
        color: "#9333ea",
        fillColor: "#a855f7",
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: "4, 6",
      }).addTo(map);
    }

    // Update User GPS Marker
    if (userCoords) {
      const uIcon = L.divIcon({
        className: "custom-user-pin",
        html: `
          <div style="background:#10b981;color:#ffffff;padding:6px;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(16,185,129,0.9);border:2px solid #ffffff;animation:pulse 2s infinite;">
            📍
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lon]);
        userMarkerRef.current.bindPopup("<b>Your Current GPS Device Location</b>");
      } else {
        userMarkerRef.current = L.marker([userCoords.lat, userCoords.lon], { icon: uIcon })
          .addTo(map)
          .bindPopup("<b>Your Current GPS Device Location</b>");
      }

      // Fit bounds to show both property and user
      const bounds = L.latLngBounds([
        [propertyCoords.lat, propertyCoords.lon],
        [userCoords.lat, userCoords.lon],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      map.setView([propertyCoords.lat, propertyCoords.lon], 14);
    }
  }, [propertyCoords, userCoords, onMapClick]);

  return (
    <div className="w-full h-72 rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-800 pointer-events-none">
        Purple: Listing (500m geofence) • Green: Your Live GPS
      </div>
    </div>
  );
}
