'use server'; // Marcar como Server Action

import { db } from '../prisma'; // Asegúrate de que la ruta a tu instancia de Prisma sea correcta
import { Prisma, UserRole, PropertyType, RoomType } from '@prisma/client'; // Asumiendo que Prisma genera este enum
import { z } from "zod"
import { revalidatePath } from "next/cache";
import type { Session } from '@/lib/type';
import { auth } from '@/lib/auth'; 
import { headers } from 'next/headers'; // Import headers

// Interfaz para los resultados de búsqueda de hoteles, adaptada a tu schema de Prisma y necesidades del frontend.
export interface HotelSearchResult {
  id: string;          // Corresponde a Hotel.id
  name: string;        // Corresponde a Hotel.name
  description?: string; // Corresponde a Hotel.description. Opcional, útil para mostrar un breve resumen.
  address: string;     // Corresponde a Hotel.address.
  city: string;        // Corresponde a Hotel.city
  country: string;     // Corresponde a Hotel.country // Prisma Float? se mapea a number | null
  latitude?: number | null;   // Corresponde a Hotel.latitude. Opcional, útil para mapas.
  longitude?: number | null;  // Corresponde a Hotel.longitude. Opcional, útil para mapas.
  imageUrl?: string;   // Derivado de Hotel.images (ej. la primera imagen). Si Hotel.images está vacío, se puede usar una imagen por defecto.
  starRating: number;  // Corresponde a Hotel.starRating
  reviewCount: number; // Se calcula contando las entradas en la relación Hotel.reviews (usando _count de Prisma).
  pricePerNight: number; // Puede derivarse del campo Hotel.pricePerNightMin si está disponible y es fiable,
                         // o calcularse como el precio mínimo de las habitaciones (Hotel.rooms), como en el código actual.
  amenities: string[]; // Se obtiene de la relación Hotel.hotelAmenities, mapeando los nombres de las comodidades.
  propertyType: string; // Representa el tipo de propiedad (ej. Hotel, Apartamento). Debería venir de Hotel.propertyType
}

// Define una interfaz para los filtros que la función puede aceptar
export interface HotelSearchQueryFilters {
  city?: string;
  checkInDate?: string; // Para la fecha de check-in (ej. formato ISO YYYY-MM-DD)
  checkOutDate?: string; // Para la fecha de check-out (ej. formato ISO YYYY-MM-DD)
  guests?: number;
  starRatings?: number[];
  propertyTypes?: (keyof typeof PropertyType)[]; // Espera los valores del enum
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
}


//Server Action de Next.js diseñada para obtener una lista de hoteles y, al mismo tiempo, las opciones de filtro disponibles para una interfaz de búsqueda.
/*
Buscar y filtrar hoteles según los criterios proporcionados.
Proporcionar las opciones de filtro dinámicas (como la lista de todas las comodidades,
 tipos de propiedad y el precio máximo) que se pueden usar para construir la interfaz de usuario de los filtros de búsqueda.
*/
export async function getHotelsAndFilterOptions(
  filters?: HotelSearchQueryFilters // Hacer los filtros opcionales
): Promise<{
  hotels: HotelSearchResult[];
  availableAmenities: string[];
  availablePropertyTypes: (keyof typeof PropertyType)[]; // Devuelve los valores del enum
  maxPrice: number;
}> {
  try {
    const whereClause: Prisma.HotelWhereInput = {}; // Construir la cláusula where dinámicamente

    if (filters?.city) whereClause.city = { contains: filters.city, mode: 'insensitive' };
    if (filters?.starRatings && filters.starRatings.length > 0) whereClause.starRating = { in: filters.starRatings };
    if (filters?.propertyTypes && filters.propertyTypes.length > 0) {
      // Asumiendo que propertyType en la DB es un enum y filters.propertyTypes contiene los valores del enum
      whereClause.propertyType = { in: filters.propertyTypes };
    }

    // Filtro de precio: puede ser pricePerNightMin del hotel o el precio de la habitación más barata
    // Esto es más complejo de filtrar directamente en la DB si el precio es derivado.
    // Por simplicidad, si tienes pricePerNightMin en Hotel, puedes filtrar por él.
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      whereClause.pricePerNightMin = {};
      if (filters?.minPrice !== undefined) whereClause.pricePerNightMin.gte = filters.minPrice;
      if (filters?.maxPrice !== undefined) whereClause.pricePerNightMin.lte = filters.maxPrice;
    }

    // Filtro de comodidades (requiere una subconsulta o un join más complejo)
    if (filters?.amenities && filters.amenities.length > 0) {
      whereClause.hotelAmenities = {
        some: { // 'some' para que tenga al menos una de las comodidades seleccionadas
              // o 'every' si debe tener TODAS las comodidades seleccionadas
          amenity: {
            name: { in: filters.amenities },
          },
        },
      };
    }

    const hotelsFromDb = await db.hotel.findMany({
      where: whereClause, // Aplicar la cláusula where
      include: {
        rooms: { // Para obtener el precio mínimo
          orderBy: {
            pricePerNight: 'asc',
          },
          take: 1,
        },
        _count: { // Para contar las reseñas de forma eficiente
          select: {
            reviews: true,
          },
        },
        hotelAmenities: { // Para obtener las comodidades del hotel
          include: {
            amenity: true,
          },
        },
      },
    });

    const amenitiesFromDb = await db.amenity.findMany({
      select: {
        name: true,
      },
    });
    const availableAmenities = amenitiesFromDb.map(a => a.name);

    // Los tipos de propiedad disponibles se obtienen del enum de Prisma
    const availablePropertyTypes = Object.values(PropertyType) as (keyof typeof PropertyType)[];
   
    // El maxPrice debería calcularse idealmente sobre los hoteles *sin filtrar por precio*
    // para dar un rango completo al usuario, o sobre los hoteles filtrados si es preferible.
    // Si no se pasan filtros (o solo filtros no de precio), se calcula sobre un conjunto más amplio.
    // Esta lógica podría necesitar una consulta separada si los filtros son muy restrictivos.
    let maxPrice = 0;

    const hotels: HotelSearchResult[] = hotelsFromDb.map(dbHotel => {
      // Priorizar pricePerNightMin del hotel, luego el precio de la habitación más barata.
      const priceFromRoom = dbHotel.rooms[0]?.pricePerNight ? parseFloat(dbHotel.rooms[0].pricePerNight.toString()) : null;
      const effectivePricePerNight = dbHotel.pricePerNightMin ?? priceFromRoom ?? 0;

      if (effectivePricePerNight > maxPrice) {
        maxPrice = effectivePricePerNight;
      }

      return {
        id: dbHotel.id,
        name: dbHotel.name,
        description: dbHotel.description, // Es String no opcional en Prisma, se mantiene como string o null si fuera opcional
        address: dbHotel.address,
        city: dbHotel.city,
        country: dbHotel.country,
        latitude: dbHotel.latitude, // Prisma devuelve null si no está definido
        longitude: dbHotel.longitude, // Prisma devuelve null si no está definido
        // Tomar la primera imagen del array 'images' o un placeholder
        imageUrl: dbHotel.images && dbHotel.images.length > 0 ? dbHotel.images[0] : '/images/placeholder-hotel.jpg',
        starRating: dbHotel.starRating,
        reviewCount: dbHotel._count.reviews,
        pricePerNight: effectivePricePerNight,
        amenities: dbHotel.hotelAmenities.map(ha => ha.amenity.name),
        propertyType: dbHotel.propertyType ? dbHotel.propertyType.toString() : 'Desconocido', // Usar el valor de la DB o un default
      };
    });

    return {
      hotels,
      availableAmenities,
      availablePropertyTypes,
      maxPrice: maxPrice > 0 ? Math.ceil(maxPrice / 100) * 100 : 1000, // Redondear al alza y asegurar un valor mínimo para el filtro
    };

  } catch (error) {
    console.error("Error fetching hotel data:", error);
    // Devolver un estado de error o valores por defecto podría ser una opción
    return {
      hotels: [],
      availableAmenities: [],
      availablePropertyTypes: [],
      maxPrice: 1000,
    };
  }
}

// Define el tipo para los detalles de una habitación dentro de HotelFullDetails
export interface RoomForHotelDetails {
  id: string;
  type: string;
  capacity: number;
  pricePerNight: number | string; // Puede ser número o string si es Prisma.Decimal
  // images: string[]; // Opcional: si también quieres las imágenes de la habitación
}

// --- Funciones para obtener detalles de un hotel específico ---

// Define el tipo de reseña que se espera para los detalles del hotel,
export interface HotelFullDetails {
  id: string;
  name: string;
  description: string;  // En tu esquema Prisma es String @db.Text, por lo que no debería ser null.
  address: string;
  city: string;
  country: string;
  latitude: number | null; // Prisma Float? se mapea a number | null
  longitude: number | null; // Prisma Float? se mapea a number | null
  images: string[]; // Array completo de URLs de imágenes del modelo Hotel
  starRating: number;
  pricePerNightMin: number | null; // Directamente del modelo Hotel (Float?)
  amenities: string[];
  propertyType: string;
  reviews: ReviewForHotelDetails[]; // Array completo de objetos de reseña
  rooms: RoomForHotelDetails[]; // Array de habitaciones con sus detalles
  roomInventories?: { roomType: RoomType; count: number; existingRooms: number; }[]; // Añadir inventario de habitaciones con conteo de existentes
}
// consistente con lo que podría necesitar un componente como ReviewCard.
export interface ReviewForHotelDetails {
  id: string;
  rating: number;
  userId: string; // <-- Añadir esta línea
  comment: string;
  createdAt: Date; // Prisma devuelve objetos Date para DateTime
  user: {
    name?: string | null;
    image?: string | null;
  };
}

// Server Action de Next.js diseñada para obtener y devolver los detalles completos de un hotel específico, basándose en su hotelId.

/**
 * Obtiene los detalles completos de un hotel por su ID.
 * @param hotelId El ID del hotel a buscar.
 * @returns Una promesa que se resuelve con los detalles del hotel o null si no se encuentra o hay un error.
 */
export async function getHotelById(hotelId: string): Promise<HotelFullDetails | null> {
  try {
    if (!hotelId) {
      console.warn("getHotelById fue llamado sin un hotelId.");
      return null;
    }

    const dbHotel = await db.hotel.findUnique({
      where: { id: hotelId },
      include: {
        reviews: { // Incluir todas las reseñas para este hotel
          include: {
            user: { // Detalles del usuario que hizo la reseña
              select: { name: true, image: true },
            },
          },
          orderBy: { createdAt: 'desc' }, // Mostrar las reseñas más recientes primero
        },
        hotelAmenities: { // Comodidades del hotel
          include: {
            amenity: { select: { name: true } }, // Solo necesitamos el nombre de la comodidad
          },
        },
        rooms: { // Incluir todas las habitaciones para este hotel
          select: {
            id: true,
            roomType: true,
            capacity: true,
            pricePerNight: true, // Prisma devolverá Decimal o Float según tu schema
          },
        },
        roomInventories: true, // Incluir el inventario de habitaciones
      },
    });

    if (!dbHotel) {
      return null; // Hotel no encontrado
    }

    // Contar las habitaciones existentes agrupadas por roomType para este hotel
    const existingRoomsCounts = await db.room.groupBy({
      by: ['roomType'],
      where: { hotelId: dbHotel.id },
      _count: {
        roomType: true,
      },
    });

    const existingRoomsMap = new Map(existingRoomsCounts.map(item => [item.roomType, item._count.roomType]));

    // Mapear el resultado de la base de datos a la estructura HotelFullDetails
    const hotelDetails: HotelFullDetails = {
      id: dbHotel.id,
      name: dbHotel.name,
      description: dbHotel.description, // El modelo Prisma define description como String no opcional
      address: dbHotel.address,
      city: dbHotel.city,
      country: dbHotel.country,
      latitude: dbHotel.latitude, // Prisma maneja Float? como number | null
      longitude: dbHotel.longitude, // Prisma maneja Float? como number | null
      images: dbHotel.images, // Array completo de imágenes directamente del modelo
      starRating: dbHotel.starRating,
      pricePerNightMin: dbHotel.pricePerNightMin, // Directamente del modelo Hotel (Float? -> number | null)
      amenities: dbHotel.hotelAmenities.map(ha => ha.amenity.name),
      propertyType: dbHotel.propertyType ? dbHotel.propertyType.toString() : 'Desconocido', // Manejar enum y posible nulidad
      reviews: dbHotel.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        userId: review.userId, // <-- Asegúrate de que review.userId exista y se mapee aquí
        comment: review.comment ?? '', // Fallback to an empty string if comment is null
        createdAt: review.createdAt, // Prisma devuelve un objeto Date
        user: {
          name: review.user?.name, // El usuario puede ser nulo si la relación es opcional
          image: review.user?.image,
        },
      })),
      rooms: dbHotel.rooms.map(room => ({
        id: room.id,
        type: room.roomType,
        capacity: room.capacity,
        // Convertir Prisma.Decimal a string o number según sea necesario
        pricePerNight: typeof room.pricePerNight === 'object' && room.pricePerNight !== null && 'toNumber' in room.pricePerNight ? room.pricePerNight.toNumber() : (room.pricePerNight as number | string),
        // images: room.images, // Descomentar si incluyes imágenes de habitación
      })),
      roomInventories: dbHotel.roomInventories.map(inv => ({
        roomType: inv.roomType,
        count: inv.count,
        existingRooms: existingRoomsMap.get(inv.roomType) || 0,
      })),
    };

    return hotelDetails;

  } catch (error) {
    console.error(`Error al obtener el hotel por ID (${hotelId}):`, error);
    return null; // Devolver null en caso de cualquier error
  }
}

//buscar y devolver una lista de hoteles que coincidan con un conjunto de criterios de filtro.
/**
 * Busca hoteles basados en un conjunto de criterios de filtro.
 * @param filters Objeto con los criterios de búsqueda.
 * @returns Una promesa que se resuelve con un array de objetos HotelSearchResult.
 */
export async function searchHotels(filters: HotelSearchQueryFilters): Promise<HotelSearchResult[]> {
  try {
    const whereClause: Prisma.HotelWhereInput = {};
    // ... (lógica para construir whereClause similar a la Opción 1) ...
    if (filters.city) whereClause.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.starRatings && filters.starRatings.length > 0) whereClause.starRating = { in: filters.starRatings };
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      whereClause.propertyType = { in: filters.propertyTypes }; // Asume que filters.propertyTypes ya son valores del enum
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.pricePerNightMin = {};
      if (filters.minPrice !== undefined) whereClause.pricePerNightMin.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) whereClause.pricePerNightMin.lte = filters.maxPrice;
    }
    if (filters.amenities && filters.amenities.length > 0) {
      whereClause.hotelAmenities = {
        some: {
          amenity: {
            name: { in: filters.amenities },
          },
        },
      };
    }

    const hotelsFromDb = await db.hotel.findMany({
      where: whereClause,
      include: {
        rooms: { orderBy: { pricePerNight: 'asc' }, take: 1 },
        _count: { select: { reviews: true } },
        hotelAmenities: { include: { amenity: true } },
      },
    });

    return hotelsFromDb.map(dbHotel => {
      const priceFromRoom = dbHotel.rooms[0]?.pricePerNight ? parseFloat(dbHotel.rooms[0].pricePerNight.toString()) : null;
      const effectivePricePerNight = dbHotel.pricePerNightMin ?? priceFromRoom ?? 0;
      return {
        id: dbHotel.id,
        name: dbHotel.name,
        description: dbHotel.description, // Mantener como string o null si es opcional en Prisma
        address: dbHotel.address,
        city: dbHotel.city,
        country: dbHotel.country,
        latitude: dbHotel.latitude, // Mantener como number | null
        longitude: dbHotel.longitude, // Mantener como number | null
        imageUrl: dbHotel.images && dbHotel.images.length > 0 ? dbHotel.images[0] : '/images/placeholder-hotel.jpg',
        starRating: dbHotel.starRating,
        reviewCount: dbHotel._count.reviews,
        pricePerNight: effectivePricePerNight,
        amenities: dbHotel.hotelAmenities.map(ha => ha.amenity.name),
        propertyType: dbHotel.propertyType ? dbHotel.propertyType.toString() : 'Desconocido',
      };
    });
  } catch (error) {
    console.error("Error searching hotels:", error);
    return [];
  }
}



// Reutiliza o define un esquema similar al del formulario para la validación en el servidor
// Es una buena práctica validar los datos también en el servidor.
// Podrías importar el hotelFormSchema si lo mueves a un lugar compartido,
// o definir uno específico para la acción. Por simplicidad, lo redefiniré aquí.
const createHotelSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  description: z.string().min(1, "La descripción es obligatoria."),
  address: z.string().min(1, "La dirección es obligatoria."),
  city: z.string().min(1, "La ciudad es obligatoria."),
  country: z.string().min(1, "El país es obligatorio."),
  images: z.string() // Ahora espera un solo string para la imagen
    .optional()      // Sigue siendo opcional
    .or(z.literal('')), // Permite una cadena vacía, igual que en el frontend
  starRating: z.number().int().min(1).max(5).optional(),
  pricePerNightMin: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      // Intenta convertir a número; si no es un número válido (NaN), devuelve el valor original
      // para que z.number() lo maneje y muestre un error de tipo adecuado.
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.number().positive("El precio debe ser un número positivo.").optional()
  ),
  amenities: z.array(z.string().cuid("Debe ser un CUID válido para el amenity.")).optional().default([]), // Asumiendo que los IDs de amenities son CUIDs
  // Añade otros campos que necesites, como latitude, longitude
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  propertyType: z.nativeEnum(PropertyType, { // Usar nativeEnum para enums de Prisma
    errorMap: () => ({ message: "Tipo de propiedad inválido." }),
  }).optional(), // Hacerlo opcional si puede no venir o ser "no especificado"

  // Añadir campo para el inventario de habitaciones
  roomInventories: z.array(z.object({
    roomType: z.nativeEnum(RoomType),
    count: z.number().int().min(0, "El conteo de habitaciones no puede ser negativo."),
  })).optional(),
});

// Definimos un tipo para el estado de la respuesta de la Server Action
export type CreateHotelActionState = {
  message: string;
  success: boolean;
  errors?: {
    [key: string]: string[] | undefined; // Para errores de validación por campo
  };
  hotelId?: string; // Opcional: devolver el ID del hotel creado
};



export async function createHotelAction(
  // prevState: CreateHotelActionState, // Para useFormState, si lo usaras
  formData: unknown // Los datos del formulario vendrán aquí
): Promise<CreateHotelActionState> {
  // Use the auth library to get the session
  const rawSession = await auth.api.getSession({ // Use the server-side session retrieval method
    headers: await headers(),
  });
  console.log("Raw session from auth.api.getSession:", JSON.stringify(rawSession, null, 2));
  const session = rawSession as Session; // Assert to your custom Session type
  console.log("Session after type assertion (lib/type.ts Session):", JSON.stringify(session, null, 2));

  // Primero, verifica si hay un usuario autenticado
  if (!session?.user?.id) {
    console.warn("Auth check failed: No session or user ID found.");
    return {
      message: 'Autenticación requerida.',
      success: false,
    };
  }

  // Obtener el rol del usuario directamente desde la base de datos
  let userFromDb;
  try {
    userFromDb = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }, // Solo necesitamos el rol para esta verificación
    });
  } catch (dbError) {
    console.error("Error fetching user role from DB:", dbError);
    return {
      message: 'Error al verificar los permisos del usuario.',
      success: false,
    };
  }

  if (!userFromDb) {
    console.warn(`User with ID ${session.user.id} not found in DB for role check.`);
    return {
      message: 'Usuario no encontrado para verificación de permisos.',
      success: false,
    };
  }

  // Ahora, verifica si el usuario autenticado tiene el rol de ADMIN usando el rol de la BD
  if (userFromDb.role !== UserRole.ADMIN) {
    console.warn(`Role check failed for user ${session.user.id}. Actual role from DB: '${userFromDb.role}', Expected role: '${UserRole.ADMIN}'.`);
    return {
      message: 'Permiso denegado. Se requiere rol de administrador para crear hoteles.',
      success: false,
    };
  }

  // 1. Validar los datos con Zod
  const validatedFields = createHotelSchema.safeParse(formData);

  if (!validatedFields.success) {
    console.error("Validation errors (server):", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Error de validación en el servidor.",
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  try {
    // 2. Lógica para crear el hotel en la base de datos
    const newHotel = await db.hotel.create({
      data: {
        name: data.name,
        city: data.city,
        country: data.country,
        address: data.address,
        description: data.description ?? '',
        images: data.images ? data.images.split(',').map(url => url.trim()) : [], // Divide por comas y elimina espacios
        pricePerNightMin: data.pricePerNightMin,
        starRating: data.starRating,
        latitude: data.latitude,
        longitude: data.longitude,
        propertyType: data.propertyType,
        // Manejo de amenities: conectar con amenities existentes
        ...(data.amenities && data.amenities.length > 0 && {
          hotelAmenities: {
            create: data.amenities.map((amenityId) => ({
              amenity: {
                connect: { id: amenityId },
              },
            })),
          },
        }),
        // Manejo del inventario de habitaciones si se proporciona
        ...(data.roomInventories && data.roomInventories.length > 0 && {
          roomInventories: {
            create: data.roomInventories.map((inventory) => ({
              roomType: inventory.roomType,
              count: inventory.count,
            })),
          },
        }),
      },
    });

    // 3. Revalidar rutas si es necesario (ej. la lista de hoteles)
    //revalidatePath("/admin/hotels"); // Revalida la página de listado de hoteles en admin
    revalidatePath("/hotels"); // Revalida la página pública de listado de hoteles

    return {
      message: "¡Hotel agregado exitosamente!",
      success: true,
      hotelId: newHotel.id,
    };
  } catch (error) {
    console.error("Error creating hotel:", error);
    let errorMessage = "Ocurrió un error inesperado al crear el hotel.";
    if (error instanceof Error) {
      // Podrías verificar errores específicos de Prisma aquí si es necesario
      // Por ejemplo, si hay un error de unicidad.
      errorMessage = error.message;
    }
    return {
      message: errorMessage,
      success: false,
    };
  }
}

// Interfaz para los filtros específicos de la función getHotels
interface GetHotelsFilters {
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  starRating?: number; // Calificación de estrellas mínima
}

// buscar y devolver una lista de hoteles, permitiendo filtrar por varios criterios y calculando la calificación promedio para cada hotel encontrado.
//Recibir parámetros de búsqueda opcionales desde la URL (ciudad, país, rango de precios, calificación de estrellas).
//Construir una consulta a la base de datos basada en esos filtros.
//Obtener una lista de hoteles que coincidan, incluyendo sus servicios y las calificaciones de sus reseñas.
//Calcular la calificación promedio y el número total de reseñas para cada hotel.
//Devolver la lista de hoteles procesada.
//Manejar errores si algo sale mal durante el proceso.
export async function getHotels(filters?: GetHotelsFilters): Promise<HotelSearchResult[]> {
  const where: Prisma.HotelWhereInput = {};

  if (filters?.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }
  if (filters?.country) {
    where.country = { contains: filters.country, mode: 'insensitive' };
  }

  const priceFilter: Prisma.FloatNullableFilter = {};
  let hasPriceFilter = false;
  if (filters?.minPrice !== undefined) {
    priceFilter.gte = filters.minPrice;
    hasPriceFilter = true;
  }
  if (filters?.maxPrice !== undefined) {
    priceFilter.lte = filters.maxPrice;
    hasPriceFilter = true;
  }
  if (hasPriceFilter) {
    // Aplicar filtro de precio a pricePerNightMin del hotel.
    // Si se requiere filtrar por precio de habitación, la lógica sería más compleja.
    where.pricePerNightMin = priceFilter;
  }

  if (filters?.starRating !== undefined) {
    where.starRating = { gte: filters.starRating };
  }

  try {
    const hotelsFromDb = await db.hotel.findMany({
      where,
      include: {
        reviews: { // Necesario para calcular avgRating y reviewCount
          select: {
            rating: true,
          },
        },
        hotelAmenities: {
          include: { amenity: true }, // Para obtener los nombres de los amenities
        },
        rooms: { // Para obtener el precio mínimo de habitación si pricePerNightMin no está disponible
          orderBy: {
            pricePerNight: 'asc',
          },
          take: 1,
        },
      },
    });
  
    const processedHotels: HotelSearchResult[] = hotelsFromDb.map(dbHotel => {
      const reviewCount = dbHotel.reviews.length;
      const totalRating = dbHotel.reviews.reduce((acc, review) => acc + review.rating, 0);
      // const avgRating = reviewCount > 0 ? parseFloat((totalRating / reviewCount).toFixed(1)) : 0;
      // avgRating se calcula pero no se incluye en HotelSearchResult ya que no tiene ese campo.

      const priceFromRoom = dbHotel.rooms[0]?.pricePerNight ? parseFloat(dbHotel.rooms[0].pricePerNight.toString()) : null;
      const effectivePricePerNight = dbHotel.pricePerNightMin ?? priceFromRoom ?? 0;

      return {
        id: dbHotel.id,
        name: dbHotel.name,
        description: dbHotel.description,
        address: dbHotel.address,
        city: dbHotel.city,
        country: dbHotel.country,
        latitude: dbHotel.latitude,
        longitude: dbHotel.longitude,
        imageUrl: dbHotel.images && dbHotel.images.length > 0 ? dbHotel.images[0] : '/images/placeholder-hotel.jpg',
        starRating: dbHotel.starRating,
        reviewCount: reviewCount,
        pricePerNight: effectivePricePerNight,
        amenities: dbHotel.hotelAmenities.map(ha => ha. amenity.name),
        propertyType: dbHotel.propertyType ? dbHotel.propertyType.toString() : 'Desconocido',
      };
    });

    return processedHotels;

  } catch (error) {
    console.error("Error fetching hotels in getHotels action:", error);
    return []; // Devolver un array vacío en caso de error
  }
}

// eliminar un hotel existente de la base de datos. Solo los usuarios con rol de ADMIN pueden realizar.
/*
Verifica que el usuario esté autenticado y sea un administrador.
Obtiene el ID del hotel a eliminar desde la URL.
Intenta eliminar el hotel de la base de datos.
Devuelve un mensaje de éxito o un mensaje de error apropiado si algo falla (no autorizado, hotel no encontrado, error del servidor).
*/

// Definimos un tipo para el estado de la respuesta de la Server Action de eliminación
export type DeleteHotelActionState = {
  message: string;
  success: boolean;
  errorType?: 'auth' | 'not_found' | 'server_error' | 'invalid_input';
};

export async function deleteHotelAction(hotelId: string): Promise<DeleteHotelActionState> {
  if (!hotelId) {
    return {
      message: 'Se requiere el ID del hotel.',
      success: false,
      errorType: 'invalid_input',
    };
  }

  const rawSession = await auth.api.getSession({
    headers: await headers(),
  });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return {
      message: 'Autenticación requerida.',
      success: false,
      errorType: 'auth',
    };
  }

  // Verificar el rol del usuario desde la base de datos para mayor seguridad
  const userFromDb = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!userFromDb || userFromDb.role !== UserRole.ADMIN) {
    return {
      message: 'Permiso denegado. Se requiere rol de administrador.',
      success: false,
      errorType: 'auth',
    };
  }

  try {
    await db.hotel.delete({
      where: { id: hotelId },
    });
    //revalidatePath("/admin/hotels"); // Revalidar la página de listado de hoteles en admin
    revalidatePath("/hotels"); // Revalidar la página pública de listado de hoteles
    return { message: 'Hotel eliminado correctamente.', success: true };
  } catch (error) {
    console.error(`Error deleting hotel ${hotelId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { message: `Hotel con ID ${hotelId} no encontrado para eliminar.`, success: false, errorType: 'not_found' };
    }
    return { message: 'Error al eliminar el hotel. Por favor, inténtalo de nuevo más tarde.', success: false, errorType: 'server_error' };
  }
}

// actualizar los detalles de un hotel existente. Solo los usuarios con rol de ADMIN pueden realizar esta acción.
/*
Verifica que el usuario esté autenticado y sea un administrador.
Obtiene el ID del hotel a actualizar desde la URL.
Recibe los nuevos datos para el hotel desde el cuerpo de la solicitud.
Construye un objeto solo con los campos que se van a modificar.
Actualiza el hotel en la base de datos con esos nuevos datos.
Devuelve el hotel actualizado o un mensaje de error apropiado si algo falla (no autorizado, hotel no encontrado, datos inválidos, error del servidor).
*/

// Esquema de validación para actualizar un hotel con Zod (puede ser el mismo que usabas en la API route)
const UpdateHotelSchema = z.object({
  name: z.string().min(1, "El nombre no puede estar vacío.").optional(),
  description: z.string().optional(), // Permitir descripción vacía o nula si es opcional en DB
  address: z.string().min(1, "La dirección no puede estar vacía.").optional(),
  city: z.string().min(1, "La ciudad no puede estar vacía.").optional(),
  country: z.string().min(1, "El país no puede estar vacío.").optional(),
  images: z.string() // Ahora espera un solo string para la imagen
    .optional()      // Sigue siendo opcional
    .or(z.literal('')), // Permite una cadena vacía, igual que en el frontend
  starRating: z.number().int().min(1).max(5).optional(),
  pricePerNightMin: z.number().positive("El precio debe ser un número positivo.").nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  // Añadir campo para actualizar amenities (array de IDs de amenity)
  amenities: z.array(z.string().cuid("Debe ser un CUID válido para el amenity.")).optional(), // Permite undefined o array
  // Añadir campo para actualizar el inventario de habitaciones
  roomInventories: z.array(z.object({
    roomType: z.nativeEnum(RoomType),
    count: z.number().int().min(0, "El conteo de habitaciones no puede ser negativo."),
  })).optional(), // Permite undefined o array
});

export type UpdateHotelActionState = {
  message: string;
  success: boolean;
  errors?: { [key: string]: string[] | undefined };
  hotel?: HotelFullDetails; // O el tipo de hotel que quieras devolver
};

export async function updateHotelAction(
  hotelId: string,
  formData: unknown // Los datos del formulario vendrán aquí
): Promise<UpdateHotelActionState> {
  if (!hotelId) {
    return {
      message: 'Se requiere el ID del hotel.',
      success: false,
    };
  }

  const rawSession = await auth.api.getSession({
    headers: await headers(),
  });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return {
      message: 'Autenticación requerida.',
      success: false,
    };
  }

  const userFromDb = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!userFromDb || userFromDb.role !== UserRole.ADMIN) {
    return {
      message: 'Permiso denegado. Se requiere rol de administrador.',
      success: false,
    };
  }
  console.log("Dentro del UpdateHotel")
  try {
    const validationResult = UpdateHotelSchema.safeParse(formData);

    if (!validationResult.success) {
      return {
        message: 'Datos inválidos.',
        success: false,
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // Validar que haya al menos un campo para actualizar
    if (Object.keys(validationResult.data).length === 0) {
      return { message: 'No se proporcionaron campos para actualizar.', success: false };
    }

    // Separar las amenities de otros datos para manejarlas explícitamente
    const { amenities, roomInventories, images: imagesStringInput, ...otherValidatedData } = validationResult.data;
    
    // Construir el objeto de datos para la actualización de Prisma.
    // Los campos opcionales que no estén en formData serán undefined aquí,
    // y Prisma los ignorará en la actualización.
    const prismaUpdateData: Prisma.HotelUpdateInput = {
      ...otherValidatedData,
    };

    // Procesar el campo 'images' solo si fue proporcionado y validado.
    if (imagesStringInput !== undefined) {
      // Si imagesStringInput es una cadena (incluida una cadena vacía), la transformamos.
      // Si era undefined (no se proporcionó en el formulario), no se incluye en prismaUpdateData,
      // por lo que Prisma no intentará actualizar el campo 'images'.
      prismaUpdateData.images = imagesStringInput.trim() !== ''
        ? imagesStringInput.split(',').map(img => img.trim()).filter(img => img.trim() !== '')
        : []; // Si se proporcionó una cadena vacía, se establece como un array vacío.
    }

    // Actualización principal: campos escalares del hotel.
    const updatedHotel = await db.hotel.update({
      where: { id: hotelId },
      data: prismaUpdateData,
    });

    // Manejar la actualización de amenities si se proporcionó el campo
    // 'amenities' aquí es el array de CUIDs de validationResult.data.amenities (o undefined si no se envió)
    if (amenities !== undefined) { 
      await db.hotel.update({
        where: { id: hotelId },
        data: {
          hotelAmenities: {
            deleteMany: {}, // Elimina todas las conexiones HotelAmenity existentes para este hotel
            create: amenities.map(amenityId => ({ // Crea nuevas conexiones HotelAmenity
              amenity: {        // Dentro de cada nuevo registro HotelAmenity, conecta a una Amenity existente
                connect: { id: amenityId }, // amenityId es el ID de la Amenity a conectar
              },
            })),
          },
        },
      });
    }
    
    // Manejar la actualización del inventario de habitaciones si se proporcionó el campo
    // El enfoque aquí es eliminar todas las entradas de inventario existentes para este hotel
    // y luego crear las nuevas basadas en los datos proporcionados.
    if (roomInventories !== undefined) {
        await db.hotelRoomInventory.deleteMany({
            where: { hotelId: hotelId },
        });
        if (roomInventories.length > 0) {
            await db.hotelRoomInventory.createMany({
                data: roomInventories.map(inventory => ({
                    hotelId: hotelId,
                    roomType: inventory.roomType,
                    count: inventory.count,
                })),
            });
        }
    }

    revalidatePath("/hotels");

    // Podrías llamar a getHotelById para devolver el hotel completo si es necesario
    return { message: 'Hotel actualizado correctamente.', success: true, hotel: await getHotelById(updatedHotel.id) ?? undefined };
  } catch (error) {
    console.error(`Error updating hotel ${hotelId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { message: `Hotel con ID ${hotelId} no encontrado para actualizar.`, success: false };
    }
    return { message: 'Error al actualizar el hotel. Por favor, inténtalo de nuevo más tarde.', success: false };
  }
}


// Esquema de validación para crear una reseña
const CreateReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, 'La calificación debe ser como mínimo 1.')
    .max(5, 'La calificación debe ser como máximo 5.'),
  comment: z
    .string()
    .max(1000, 'El comentario no puede exceder los 1000 caracteres.')
    .optional(),
 
});

// Tipo para el estado de la respuesta de la Server Action de creación de reseña
export type CreateReviewActionState = {
  message: string;
  success: boolean;
  errors?: { [key: string]: string[] | undefined };
  review?: ReviewForHotelDetails; // O el tipo de reseña que quieras devolver
};

//////////////////////////          Review       ///////////////////////////////////////////////

//permitir que un usuario autenticado cree una nueva reseña para un hotel específico.
/*
Asegura que el usuario esté logueado.
Recibe los datos de la reseña (ID del hotel, calificación, comentario).
Valida que estos datos sean correctos y cumplan con el formato esperado.
Verifica que el hotel al que se refiere la reseña realmente exista.
Guarda la nueva reseña en la base de datos, asociándola con el usuario y el hotel.
Devuelve la reseña recién creada (incluyendo algunos datos del autor) o un mensaje de error si algo sale mal.
*/
export async function createReviewAction(
  hotelId: string,
  formData: unknown // Los datos del formulario (rating, comment)
): Promise<CreateReviewActionState> {
  if (!hotelId) {
    return {
      message: 'Se requiere el ID del hotel.',
      success: false,
    };
  }

  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return {
      message: 'No autorizado. Debes iniciar sesión para dejar una reseña.',
      success: false,
    };
  }

  const validationResult = CreateReviewSchema.safeParse(formData);

  if (!validationResult.success) {
    return {
      message: 'Datos inválidos.',
      success: false,
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { rating, comment } = validationResult.data;
  const userId = session.user.id;

  try {
    // Opcional: Verificar si el hotel existe
    const hotelExists = await db.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotelExists) {
      return {
        message: 'Hotel no encontrado. No se puede crear la reseña.',
        success: false,
      };
    }

    // Opcional: Verificar si el usuario ya ha dejado una reseña para este hotel
    // Podrías permitir múltiples reseñas o solo una. Por ahora, permitiremos múltiples.
    // const existingReview = await db.review.findFirst({
    //   where: {
    //     hotelId,
    //     userId,
    //   },
    // });
    // if (existingReview) {
    //   return NextResponse.json({ message: 'Ya has reseñado este hotel' }, { status: 409 });
    // }

    const newReview = await db.review.create({
      data: {
        hotelId,
        userId,
        rating,
        comment,
      },
      include: {
        user: { // Incluir información básica del usuario que hizo la reseña
          select: {
            name: true,
            image: true,
          }
        }
      }
    });

    revalidatePath(`/hotels/${hotelId}`); // Revalidar la página del hotel para mostrar la nueva reseña

    return {
      message: 'Reseña creada exitosamente.',
      success: true,
      review: { // Mapear a ReviewForHotelDetails si es necesario
        id: newReview.id,
        rating: newReview.rating,
        userId: newReview.userId, // Add the missing userId property
        comment: newReview.comment ?? '',
        createdAt: newReview.createdAt,
        user: {
          name: newReview.user?.name,
          image: newReview.user?.image,
        },
      },
    };
  } catch (error) {
    console.error('Error al crear la reseña:', error);
    return { message: 'Error interno del servidor al crear la reseña.', success: false };
  }
}


//diseñado para obtener y devolver todas las reseñas asociadas a un hotel específico.
/*
Recibir un hotelId como parámetro en la URL.
Buscar en la base de datos todas las reseñas que pertenezcan a ese hotel.
Incluir el nombre y la imagen del usuario que escribió cada reseña.
Ordenar las reseñas para mostrar las más nuevas primero.
Devolver la lista de reseñas al cliente.
Manejar errores si el hotelId no se proporciona o si ocurre un problema en el servidor.
*/
//dbHotel.rooms
export type GetHotelReviewsActionState = {
  success: boolean;
  message?: string;
  reviews?: ReviewForHotelDetails[];
  errorType?: 'invalid_input' | 'not_found' | 'server_error';
};

export async function getHotelReviewsAction(hotelId: string): Promise<GetHotelReviewsActionState> {
  if (!hotelId) {
    return { success: false, message: 'Se requiere el ID del hotel.', errorType: 'invalid_input' };
  }

  try {
    // Opcional pero recomendado: Verificar primero si el hotel existe
    const hotelExists = await db.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true }, // Solo necesitamos saber si existe, no todos los datos
    });

    if (!hotelExists) {
      return { success: false, message: `Hotel con ID ${hotelId} no encontrado.`, errorType: 'not_found' };
    }

    // Si el hotel existe, proceder a buscar sus reseñas
    const reviews = await db.review.findMany({
      where: {
        hotelId: hotelId,
      },
      include: {
        user: { // Incluir información básica del usuario que hizo la reseña
          select: {
            name: true,
            image: true, // Asumiendo que tienes un campo 'image' en tu modelo User
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Mostrar las reseñas más recientes primero
      },
    });

    const formattedReviews: ReviewForHotelDetails[] = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      userId: review.userId, // Include the userId property
      comment: review.comment ?? '',
      createdAt: review.createdAt,
      user: {
        name: review.user?.name,
        image: review.user?.image,
      },
    }));

    return {
      success: true,
      reviews: formattedReviews,
    };

  } catch (error) {
    console.error('Error al obtener las reseñas:', error);
    return {
      success: false,
      message: 'Error interno del servidor al obtener las reseñas.',
      errorType: 'server_error',
    };
  }
}

//Eliminiar una reseña existente de un hotel específico.
export type DeleteReviewActionState = {
  message: string;
  success: boolean;
  errorType?: 'auth' | 'not_found' | 'forbidden' | 'server_error' | 'invalid_input';
};

export async function deleteReviewAction(
  reviewId: string
): Promise<DeleteReviewActionState> {
  if (!reviewId) {
    return {
      message: 'Se requiere el ID de la reseña.',
      success: false,
      errorType: 'invalid_input',
    };
  }

  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return {
      message: 'No autorizado. Debes iniciar sesión para eliminar una reseña.',
      success: false,
      errorType: 'auth',
    };
  }

  const userId = session.user.id;

  try {
    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return { message: 'Reseña no encontrada.', success: false, errorType: 'not_found' };
    }

    if (review.userId !== userId) {
      return { message: 'No tienes permiso para eliminar esta reseña.', success: false, errorType: 'forbidden' };
    }

    await db.review.delete({
      where: { id: reviewId },
    });

    revalidatePath(`/hotels/${review.hotelId}`); // Revalidar la página del hotel
    // También podrías querer revalidar una página de "mis reseñas" si existe

    return { message: 'Reseña eliminada exitosamente.', success: true };
  } catch (error) {
    console.error(`Error al eliminar la reseña ${reviewId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { message: `Reseña con ID ${reviewId} no encontrada para eliminar.`, success: false, errorType: 'not_found' };
    }
    return { message: 'Error interno del servidor al eliminar la reseña.', success: false, errorType: 'server_error' };
  }
}

// Esquema de validación para una sola habitación
const SingleRoomSchema = z.object({
  hotelId: z.string().cuid("El ID del hotel debe ser un CUID válido."),
  type: z.nativeEnum(RoomType, { // Cambiado de roomType a type para coincidir con RoomSubmitData y datos del cliente
    errorMap: () => ({ message: "Tipo de habitación inválido." }),
  }),
  description: z.string().optional(),
  pricePerNight: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '') ? parseFloat(val) : undefined,
    z.number().positive("El precio por noche debe ser un número positivo.")
  ),
  capacity: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '') ? parseInt(val, 10) : undefined,
    z.number().int().positive("La capacidad debe ser un entero positivo.")
  ),
  beds: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '') ? parseInt(val, 10) : undefined,
    z.number().int().positive("El número de camas debe ser un entero positivo.")
  ),
  images: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s) : []), // Transforma string a array
  amenities: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s) : []), // Transforma string a array
  count: z.preprocess( // Añadir el campo count para el lote
    (val) => (typeof val === 'string' && val.trim() !== '') ? parseInt(val, 10) : 1, // Default a 1 si no se provee o es inválido
    z.number().int().min(1, "La cantidad de habitaciones debe ser al menos 1.")
  ),
});

// Esquema para validar un array de habitaciones
const CreateMultipleRoomsSchema = z.array(SingleRoomSchema).min(1, "Se debe proporcionar al menos una habitación.");

export interface RoomSubmitData {
  hotelId: string;
  type: string;
  description?: string;
  pricePerNight: string;
  capacity: string;
  beds: string;
  images: string;
  amenities: string; // Nota: amenities es un string aquí, no un array
  count: string; // El frontend enviará count como string
}

export interface ClientSafeRoomOutput {
  id: string;
  hotelId: string;
  roomType: RoomType;
  description: string | null;
  pricePerNight: number; // Convertido de Decimal
  capacity: number;
  beds: number;
  images: string[];
  amenities: string[];
  createdAt: string; // Convertido de Date
  updatedAt: string; // Convertido de Date
}

export type AddRoomActionState = {
  message: string;
  success: boolean;
  errors?: { [key: string]: string[] | undefined } | { index: number, errors: { [key: string]: string[] | undefined }, message: string }[]; // Errores generales o por habitación
  // Cambiado para que coincida con la estructura de errores de AddRoomActionState en la solicitud original
  // errors?: Array<{
  //   index: number;
  //   fieldErrors?: Record<string, string[]>;
  //   message?: string;
  // }> | string;
  createdRooms?: ClientSafeRoomOutput[]; // Renombrado para claridad y consistencia
};

export async function addRoomAction(
  prevState: AddRoomActionState, // Para useFormState, si lo usaras
  roomsData: RoomSubmitData[]
): Promise<AddRoomActionState> {
  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return { message: 'Autenticación requerida.', success: false };
  }

  // Verificar si el usuario es ADMIN
  const userFromDb = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!userFromDb || userFromDb.role !== UserRole.ADMIN) {
    return { message: 'Permiso denegado. Se requiere rol de administrador.', success: false };
  }

  const validationResult = CreateMultipleRoomsSchema.safeParse(roomsData);

  if (!validationResult.success) {
    // Aplanar errores para un array de objetos puede ser más complejo.
    // Zod devuelve un array de errores, cada uno con una propiedad 'path' que indica el índice.
    // Aquí un ejemplo simplificado de cómo podrías estructurar los errores.
    const formattedErrors = validationResult.error.issues.map(issue => ({
      path: issue.path.join('.'), // ej. "0.type"
      message: issue.message,
    }));
    return {
      message: 'Datos inválidos para crear la habitación.',
      success: false,
      // Podrías necesitar una estructura de error más detallada si quieres mostrar errores por campo por habitación
      errors: { general: [`Error de validación general. Detalles: ${JSON.stringify(formattedErrors)}`] },
    };
  }

  const validatedRoomsData = validationResult.data;
  const createdRoomsDb: Prisma.RoomGetPayload<{ include: { hotel: false } }>[] = []; // Almacenar temporalmente los objetos de DB
  const actionErrors: { index: number, errors?: { [key: string]: string[] | undefined }, message: string }[] = [];

  try {
    for (const [index, roomData] of validatedRoomsData.entries()) { // 
      // Verificar si el hotel existe para cada habitación (o asumir que es el mismo y verificar una vez)
      const hotelExists = await db.hotel.findUnique({
        where: { id: roomData.hotelId },
      });

      if (!hotelExists) {
        actionErrors.push({ index, errors: { hotelId: ["Hotel no encontrado."] }, message: `Hotel con ID ${roomData.hotelId} no encontrado para la habitación ${index + 1}.` });
        continue; // Saltar a la siguiente habitación
      }

      // Validación de Inventario
      const inventoryEntry = await db.hotelRoomInventory.findUnique({
        where: { 
          hotel_roomtype_inventory_unique: { // Asegúrate que este es el nombre correcto de tu índice único
            hotelId: roomData.hotelId, 
            roomType: roomData.type 
          }
        }
      });

      if (!inventoryEntry) {
        actionErrors.push({ 
          index, 
          message: `No se ha definido un inventario para el tipo de habitación '${roomData.type}' en el hotel ${hotelExists.name} (Lote ${index + 1}). Por favor, defínelo primero.`  
        });
        continue;
      }

      const existingRoomsOfTypeCount = await db.room.count({
        where: { hotelId: roomData.hotelId, roomType: roomData.type }
      });

      if ((existingRoomsOfTypeCount + roomData.count) > inventoryEntry.count) {
        actionErrors.push({ 
          index, 
          message: `No se pueden agregar ${roomData.count} habitaciones de tipo '${roomData.type}' para el hotel ${hotelExists.name} (Lote ${index + 1}). El inventario definido es de ${inventoryEntry.count}, ya existen ${existingRoomsOfTypeCount}, y se excedería el límite.` 
        });
        continue;
      }

      // Iterar 'count' veces para crear las habitaciones individuales del lote
      for (let i = 0; i < roomData.count; i++) {
        try {
          const newRoom = await db.room.create({
            data: {
              hotelId: roomData.hotelId,
              roomType: roomData.type,
              description: roomData.description,
              pricePerNight: new Prisma.Decimal(roomData.pricePerNight),
              capacity: roomData.capacity,
              beds: roomData.beds,
              images: roomData.images,
              amenities: roomData.amenities,
            },
          });
          createdRoomsDb.push(newRoom);
        } catch (roomCreationError) {
           console.error(`Error al crear la habitación individual ${i + 1} del lote ${index + 1}:`, roomCreationError);
           // Podrías decidir si un error aquí detiene todo el lote o solo esta habitación.
           // Por simplicidad, continuamos pero registramos el error para el lote.
           actionErrors.push({ index, message: `Error interno al crear la habitación individual ${i + 1} del lote ${index + 1}.` });
           break; // Detener la creación de más habitaciones para este lote si una falla.
        }
      }
    }
    

    const clientSafeCreatedRooms: ClientSafeRoomOutput[] = createdRoomsDb.map(room => ({
      id: room.id,
      hotelId: room.hotelId,
      roomType: room.roomType,
      description: room.description,
      pricePerNight: room.pricePerNight.toNumber(), // Convertir Decimal a number
      capacity: room.capacity,
      beds: room.beds,
      images: room.images,
      amenities: room.amenities,
      createdAt: room.createdAt.toISOString(), // Convertir Date a string ISO
      updatedAt: room.updatedAt.toISOString(), // Convertir Date a string ISO
    }));

    // Revalidar rutas después de que todas las operaciones de base de datos hayan intentado completarse
    if (createdRoomsDb.length > 0 && validatedRoomsData.length > 0) { // Asegurarse que hay datos para obtener hotelId
      revalidatePath(`/hotels/${validatedRoomsData[0].hotelId}`); // Asume que todas las habitaciones son del mismo hotel
  }

    if (actionErrors.length > 0) {
      return {
        message: `Se procesaron ${validatedRoomsData.length} lotes. ${clientSafeCreatedRooms.length} habitaciones creadas en total. ${actionErrors.length > 0 ? `${actionErrors.length} lotes tuvieron errores.` : ''}`,
        success: clientSafeCreatedRooms.length > 0, // Éxito parcial si alguna se creó
        createdRooms: clientSafeCreatedRooms.length > 0 ? clientSafeCreatedRooms : undefined,
        errors: actionErrors.map(error => ({
          ...error,
          errors: error.errors || {}, // Ensure errors is always an object
        })),
      };
    }

    return {
      message: `${clientSafeCreatedRooms.length} habitaciones agregadas exitosamente de ${validatedRoomsData.length} lotes.`,
      success: true,
      createdRooms: clientSafeCreatedRooms,
    };
  } catch (error) {
    console.error("Error al agregar la habitación:", error);
    return { message: 'Error interno general del servidor al procesar las habitaciones.', success: false };
  }
}