"use server";

import { RoomType } from '@prisma/client'; // Asegúrate que RoomType esté exportado por Prisma Client

export interface FormattedRoomType {
  value: RoomType; // O string, si prefieres enviar el string directamente
  label: string;
}

function formatRoomTypeLabel(roomTypeValue: string): string {
  // Convierte STANDARD_SINGLE a "Standard Single"
  return roomTypeValue
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function getRoomTypes(): Promise<FormattedRoomType[]> {
  try {
    return Object.values(RoomType).map(value => ({
      value: value,
      label: formatRoomTypeLabel(value),
    }));
  } catch (error) {
    console.error("Error fetching room types from enum:", error);
    return [];
  }
}