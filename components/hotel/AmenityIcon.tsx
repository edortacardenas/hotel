"use client";

import React from 'react';
import { Wifi, ParkingCircle, Utensils, Dumbbell, Droplets, SunMedium, Coffee, Users, ShieldCheck, ConciergeBell, ShoppingBag, Wine, LucideHandPlatter, CircleCheckBigIcon } from 'lucide-react';
// Importa más iconos de lucide-react según necesites

interface AmenityIconProps {
  amenityName: string;
  className?: string;
}

const AmenityIcon: React.FC<AmenityIconProps> = ({ amenityName, className = "h-5 w-5" }) => {
  const normalizedName = amenityName.toLowerCase().replace(/\s+/g, '');

  switch (normalizedName) {
    case 'wifilibre':
    case 'wifi':
    case 'internetinalámbrico':
      return <Wifi className={className} aria-label={amenityName} />;
    case 'parkinggratuito':
    case 'estacionamiento':
      return <ParkingCircle className={className} aria-label={amenityName} />;
    case 'restaurant':
    case 'restaurante':
      return <Utensils className={className} aria-label={amenityName} />;
    case 'gym':
    case 'gimnasio':
      return <Dumbbell className={className} aria-label={amenityName} />;
    case 'almuerzo':
    case 'almuerzobuffet':
      return <LucideHandPlatter className={className} aria-label={amenityName} />;
    case 'pool':
    case 'piscina':
      return <Droplets className={className} aria-label={amenityName} />;
    case 'spa':
      return <SunMedium className={className} aria-label={amenityName} />;
    case 'breakfast':
    case 'desayuno':
      return <Coffee className={className} aria-label={amenityName} />;
    case 'familyservices':
    case 'serviciosfamiliares':
      return <Users className={className} aria-label={amenityName} />;
    case 'safetyfeatures':
    case 'seguridad':
      return <ShieldCheck className={className} aria-label={amenityName} />;
    case 'frontdesk':
    case 'recepción24horas':
    case 'serviciodehabitación':
      return <ConciergeBell className={className} aria-label={amenityName} />;
    case 'shopping':
    case 'tiendas':
      return <ShoppingBag className={className} aria-label={amenityName} />;
    case 'bar':
      return <Wine className={className} aria-label={amenityName} />;
    // Añade más casos según tus comodidades
    default:
      // Un icono genérico o null si no se encuentra
      return <CircleCheckBigIcon className={className} aria-label={amenityName} />;
  }
};

export default AmenityIcon;