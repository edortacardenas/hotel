"use server"; // Opcional, si la llamas directamente como Server Action

import { db } from '@/lib/prisma'; // Asegúrate que esta sea la ruta correcta a tu cliente Prisma
import { Amenity, Prisma, AmenityRoom} from '@prisma/client'; // Importa el tipo Amenity de Prisma

// --- Funciones para Amenities Generales (Hotel) ---

export async function getAllAmenities(): Promise<Amenity[]> { // Usada para amenities de Hotel
  try {
    const amenities = await db.amenity.findMany({
      orderBy: {
        name: 'asc', // Opcional: ordenar por nombre para una mejor UI
      },
    });
    return amenities;
  } catch (error) {
    console.error("Error fetching amenities:", error);
    // Podrías retornar un array vacío o lanzar el error dependiendo de cómo quieras manejarlo
    return [];
    // throw new Error("Could not fetch amenities.");
  }
}

//Agregar una nueva amenity (general/hotel)
export async function addAmenity(name: string): Promise<Amenity> {
  try {
    const newAmenity = await db.amenity.create({
      data: {
        name,
      },
    });
    return newAmenity;
  } catch (error) {
    console.error("Error adding amenity:", error);
    throw new Error("Could not add amenity.");
  }
}

//Eliminar una amenity (general/hotel)
export async function deleteAmenity(id: string): Promise<void> {
  try {
    await db.amenity.delete({
      where: {
        id: id,
      },
    });
  } catch (error) {
    console.error("Error deleting amenity:", error);
    throw new Error("Could not delete amenity.");
  }
}  
// --- Funciones para Amenities de Habitación ---

// Obtener todas las "amenities de habitación" (actualmente obtiene todas las amenities)
// Si necesitas distinguir entre tipos de amenity (hotel vs habitación) a nivel de DB,
// deberías añadir un campo 'type' al modelo Amenity y filtrar aquí.
export async function getAllRoomAmenities(): Promise<AmenityRoom[]> {
  try {
    const amenities = await db.amenityRoom.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return amenities;
  } catch (error) {
    console.error("Error fetching room amenities:", error);
    return [];
  }
}

// Agregar una nueva "amenity de habitación" (actualmente la agrega a la tabla general de amenities)
export async function addRoomAmenity(name: string): Promise<AmenityRoom> {
  if (!name || name.trim() === "") {
    throw new Error("El nombre de la amenity de habitación no puede estar vacío.");
  }
  try {
    const newAmenity = await db.amenityRoom.create({
      data: {
        name: name.trim(),
      },
    });
    return newAmenity;
  } catch (error) {
    console.error("Error adding room amenity:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error de restricción única (P2002)
      if (error.code === 'P2002') {
        throw new Error(`La amenity de habitación con el nombre "${name.trim()}" ya existe.`);
      }
    }
    throw new Error("No se pudo agregar la amenity de habitación.");
  }
}

// Eliminar una "amenity de habitación"
export async function deleteRoomAmenity(id: string): Promise<{ success: boolean, message: string }> {
  if (!id) {
    return { success: false, message: "Se requiere el ID de la amenity de habitación." };
  }
  try {
    await db.amenityRoom.delete({
      where: {
        id: id,
      },
    });
    return { success: true, message: "Amenity de habitación eliminada exitosamente." };
  } catch (error) {
    console.error("Error deleting room amenity:", error);
    // Podrías verificar error.code === 'P2025' (Registro no encontrado) para un mensaje más específico
    return { success: false, message: "No se pudo eliminar la amenity de habitación. Es posible que ya no exista o esté en uso." };
  }
}
