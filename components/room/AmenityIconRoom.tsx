"use client";

import React from 'react';
import { Wifi, Tv, Wind,  ConciergeBell, CircleCheckBigIcon, WashingMachineIcon, Wine, BrickWallIcon, Sun, Building} from 'lucide-react';
// Importa más iconos de lucide-react según necesites

interface AmenityIconRoomProps {
  amenityName: string;
  className?: string;
}

const AmenityIconRoom: React.FC<AmenityIconRoomProps> = ({ amenityName, className = "h-5 w-5" }) => {
  const normalizedName = amenityName.toLowerCase().replace(/\s+/g, '');

  switch (normalizedName) {
    case 'wifilibre':
    case 'internetinalámbrico':
      return <Wifi className={className} aria-label={amenityName} />;
    case 'tv':
    case 'televisión':
      return <Tv className={className} aria-label={amenityName} />;
    case 'airconditioning':
    case 'aireacondicionado':
      return <Wind className={className} aria-label={amenityName} />;
    
    case 'recepción24horas':
    case 'serviciodehabitación':
      return <ConciergeBell className={className} aria-label={amenityName} />;

    case 'balcon':
      return <BrickWallIcon className={className} aria-label={amenityName} />;  
    
    case 'minibar':
    return <Wine className={className} aria-label={amenityName} />;  
    
    case 'lavanderia':
      return <WashingMachineIcon className={className} aria-label={amenityName} />;

    case 'vistaalmar':
      return <Sun className={className} aria-label={amenityName} />;
     
    case 'vistaaciudad':
      return <Building className={className} aria-label={amenityName} />;

          
        
    // Añade más casos según tus comodidades
    default:
      // Un icono genérico o null si no se encuentra
      return <CircleCheckBigIcon className={className} aria-label={amenityName} />;
  }
};

export default AmenityIconRoom;