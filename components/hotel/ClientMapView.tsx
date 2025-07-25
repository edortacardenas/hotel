/*
  Este es un componente de cliente que envuelve MapView.
  Permite importar MapView dinámicamente con ssr: false,
  ya que MapView probablemente usa APIs del navegador (como 'window').
*/
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Importar MapView dinámicamente para que solo se renderice en el cliente
const MapView = dynamic(() => import('@/components/common/MapView'), {
  ssr: false, // Deshabilitar Server-Side Rendering para este componente
  loading: () => <p className="text-center text-muted-foreground">Cargando mapa...</p>, // Opcional: un indicador de carga
});

interface ClientMapViewProps {
  latitude: number;
  longitude: number;
  popupText?: string;
}

const ClientMapView: React.FC<ClientMapViewProps> = ({ latitude, longitude, popupText }) => {
  // Renderiza el MapView importado dinámicamente
  return <MapView latitude={latitude} longitude={longitude} popupText={popupText} className='h-[600px] rounded-lg overflow-hidden shadow-md bg-gray-100'/>;
};

export default ClientMapView;