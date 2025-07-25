"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; // Importar L para el icono personalizado

// Arreglo para el problema del icono por defecto de Leaflet con Webpack/Next.js
// Asegúrate de tener estos iconos en tu carpeta public/images/leaflet/
const customIcon = new L.Icon({
  iconUrl: '/images/leaflet/marker-icon.png',
  //iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  //shadowUrl: '/images/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapViewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  popupText?: string;
  className?: string;
}

// Componente para recentrar el mapa si las coordenadas cambian
const ChangeView: React.FC<{ center: L.LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({
  latitude,
  longitude,
  zoom = 13,
  popupText = "Ubicación del Hotel",
  className = "h-[400px] w-full rounded-lg shadow-md",
}) => {
  // Evitar renderizado en el servidor (SSR) ya que Leaflet depende de `window`
  if (typeof window === 'undefined') {
    return <div className={className}><p className="text-center pt-10">Cargando mapa...</p></div>;
  }

  const position: L.LatLngExpression = [latitude, longitude];

  return (
    <MapContainer center={position} zoom={zoom} scrollWheelZoom={false} className={className}>
      <ChangeView center={position} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={customIcon}>
        <Popup>{popupText}</Popup>
      </Marker>
    </MapContainer>
  );
};

export default MapView;