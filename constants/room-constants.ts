import { RoomType } from '@prisma/client';

interface RoomDetails {
    personCapacity: number;
    bedCount: number;
    // Opcional: podrías añadir más detalles como el tipo de cama
    // bedType?: string | string[];
  }
  
export const ROOM_CONFIG: Record<RoomType, RoomDetails> = {
    [RoomType.STANDARD_SINGLE]: { personCapacity: 1, bedCount: 1 },
    [RoomType.STANDARD_DOUBLE]: { personCapacity: 2, bedCount: 2 }, // o 1 cama doble
    [RoomType.DELUXE_KING]: { personCapacity: 2, bedCount: 1 }, // Cama King
    [RoomType.DELUXE_QUEEN]: { personCapacity: 2, bedCount: 1 }, // Cama Queen
    [RoomType.SUITE]: { personCapacity: 2, bedCount: 1 }, // Típicamente una cama King, puede variar
  };
  
  // Ejemplo de uso:
  const singleRoomCapacity = ROOM_CONFIG[RoomType.STANDARD_SINGLE].personCapacity;
  console.log(`La habitación STANDARD_SINGLE tiene capacidad para ${singleRoomCapacity} persona(s).`);
  
  const suiteBedCount = ROOM_CONFIG[RoomType.SUITE].bedCount;
  console.log(`La SUITE tiene ${suiteBedCount} cama(s).`);