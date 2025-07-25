// Esta página será un Server Component para obtener datos inicialmente
import Image from 'next/image';
import { Star, MapPin} from 'lucide-react';
import { getHotelById, HotelFullDetails } from '@/lib/data/hotel-actions'; // Asumimos que HotelWithRoomsAndReviews incluye rooms
import AmenityIcon from '@/components/hotel/AmenityIcon'; 
import ReviewCard, { Review } from '../../../../components/hotel/ReviewCard'; // Asegúrate de que ReviewCard sea un Client Component si usa hooks de cliente

import AddReviewModal from '../../../../components/hotel/AddReviewModal';
import { auth } from '@/lib/auth'; // Tu instancia de better-auth
import type { Session } from '@/lib/type'; // Tu tipo de sesión
import { headers } from 'next/headers'; // Para obtener la sesión en Server Component
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"; // Para galería de imágenes
import ClientMapView from '../../../../components/hotel/ClientMapView';
import BookingForm from '@/components/hotel/BookingForm'; // Importar el nuevo formulario
import { RoomType } from '@prisma/client'; // Importar RoomType


interface HotelDetailsPageProps {
  params: {
    hotelId: string;
  };
}

interface DisplayableRoomType {
  id: string; // ID de una habitación representativa de este tipo
  type: RoomType; // El tipo de habitación (enum)
  typeName: string; // Nombre legible del tipo de habitación
  capacity: number;
  pricePerNight: number;
  totalConfiguredCount?: number; // Opcional: para mostrar el total de habitaciones de este tipo
}

export default async function HotelDetailsPage({ params }: HotelDetailsPageProps) {
  const { hotelId } = await params; 

  // Obtener la sesión del usuario actual en el Server Component
  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;
  const currentUserId = session?.user?.id || null;

  const hotel = await getHotelById(hotelId) as HotelFullDetails | null; 
  
  if (!hotel) {
    return <div className="container mx-auto px-4 py-8 text-center text-gray-100 ">Hotel no encontrado.</div>;
  }

  const amenities: string[] = hotel.amenities || [];
  const reviews: Review[] = hotel.reviews || [];
  
  // Procesar el inventario de habitaciones para obtener tipos únicos para el desplegable.
  // Se asume que getHotelById incluye 'roomInventories' y 'rooms' en su consulta a Prisma.
  const uniqueRoomTypesForDisplay: DisplayableRoomType[] = [];
  if (hotel.roomInventories && hotel.roomInventories.length > 0 && hotel.rooms) {
    hotel.roomInventories.forEach(inventory => {
      // Solo procesar si hay habitaciones de este tipo configuradas en el inventario (count > 0)
      if (inventory.count > 0) {
        // Encontrar una habitación representativa de este tipo en hotel.rooms
        // para obtener detalles como ID específico para el formulario, capacidad y precio.
        const representativeRoom = hotel.rooms.find(room => room.type === inventory.roomType);

        if (representativeRoom) {
          uniqueRoomTypesForDisplay.push({
            id: representativeRoom.id, // ID de una habitación real de este tipo
            type: inventory.roomType,
            typeName: inventory.roomType.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
            capacity: representativeRoom.capacity,
            pricePerNight: typeof representativeRoom.pricePerNight === 'number' 
              ? representativeRoom.pricePerNight 
              : parseFloat(representativeRoom.pricePerNight.toString()),
            totalConfiguredCount: inventory.count, // El total de habitaciones de este tipo según el inventario
          });
        }
      }
    });
    // Opcional: Ordenar los tipos de habitación, por ejemplo, por precio o nombre
    uniqueRoomTypesForDisplay.sort((a, b) => a.pricePerNight - b.pricePerNight);
  }

  // Para la lógica de deshabilitar el botón de reserva si no hay habitaciones.
  // Esto podría necesitar una lógica más compleja si "disponibilidad" significa algo más que "configuradas".
   // Actualizar hasConfiguredRooms para basarse en la nueva lógica
   const hasConfiguredRooms = uniqueRoomTypesForDisplay.length > 0;


  return (
    <div className="container mx-auto px-4 py-8">
      {/* Sección de Encabezado: Nombre y Calificación */}
      <section className="mb-6">
        <h1 className="text-4xl font-semibold text-gray-100 mb-2">{hotel.name}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-100">
          <div className="flex items-center">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 mr-1" />
            {/* 2. Manejo más seguro de starRating */}
            <span className='text-gray-100'>
              {typeof hotel.starRating === 'number' ? hotel.starRating.toFixed(1) : 'N/A'} ({reviews.length} reseñas)
            </span>
          </div>
          <div className="flex items-center text-gray-100">
            <MapPin className="h-5 w-5 mr-1 text-gray-100" />
            <span>{hotel.address}, {hotel.city}, {hotel.country}</span>
          </div>
        </div>
      </section>

      {/* Galería de Imágenes */}
      <section className="mb-8">
        {hotel.images && hotel.images.length > 0 ? (
          <Carousel className="w-full rounded-lg overflow-hidden shadow-lg">
            <CarouselContent>
              {hotel.images.map((imgUrl, index) => (
                <CarouselItem key={index}>
                  {/* Reducir la altura del contenedor de la imagen */}
                  <div className="relative h-60 md:h-80 lg:h-[740px]"> 
                    <Image
                      src={imgUrl}
                      alt={`${hotel.name} - Imagen ${index + 1}`}
                      // Use fill again to make the image fill the fixed-height container
                      fill
                      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 33vw" // Ajusta sizes para un mejor rendimiento
                      className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out" // Use w-full and h-auto, keep object-cover
                      priority={index === 0} // Añade priority a la primera imagen del carrusel
                    />
                  </div>
                </CarouselItem> // Keep object-cover to ensure it fills without distortion
              ))}
            </CarouselContent>
            {hotel.images.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
                <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="relative h-64 md:h-96 bg-gray-200 rounded-lg flex items-center justify-center">
            <Image
              src="/images/placeholder-hotel-large.jpg"
              alt="Placeholder de imagen de hotel"
              // Keep fill for the placeholder as it doesn't have a natural aspect ratio to maintain
              fill // Nueva prop que reemplaza layout="fill"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 33vw" // Ajusta sizes para un mejor rendimiento
              className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out" // Cambiado a object-cover para llenar el contenedor
            />
          </div>
        )}
      </section>

      {/* Contenido Principal: Descripción, Comodidades, Formulario de Reserva (placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Descripción */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-3 text-gray-100">Descripción</h2>
            <p className="text-gray-100 leading-relaxed whitespace-pre-line">
              {hotel.description || 'No hay descripción disponible para este hotel.'}
            </p>
          </section>

          <Separator className="my-8" />
 
          {/* Comodidades */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-100 mb-4">Comodidades</h2>
            {amenities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {amenities.map((amenity) => ( // Usar 'amenity' como key si son únicos, o amenity + index
                  <div key={amenity} className="flex items-center space-x-2 text-sm text-gray-100">
                    <AmenityIcon amenityName={amenity} className="h-5 w-5 text-gray-100" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-100">No se especificaron comodidades para este hotel.</p>
            )}
          </section>
        </div>

        {/* Sidebar: Formulario de Reserva (Placeholder) y Precio */}
        <aside className="lg:col-span-1">
          <BookingForm
            hotelId={hotel.id}
            pricePerNightMin={hotel.pricePerNightMin}
            uniqueRoomTypesForDisplay={uniqueRoomTypesForDisplay}
            currentUserId={currentUserId}
            hasConfiguredRooms={hasConfiguredRooms}
          />
        </aside>
      </div> {/* Asegurar que el texto del aside sea claro */}

      <Separator className="my-12" />

      {/* Sección de Reseñas */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-100">Reseñas de Huéspedes ({reviews.length})</h2>
          {/* Botón para abrir el modal de agregar reseña, h2 con texto claro */}
          <AddReviewModal hotelId={hotel.id} />
        </div>
        {reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.slice(0, 5).map(review => ( // Mostrar solo las primeras 5, por ejemplo
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={currentUserId} // Pasar el ID del usuario actual
              />
            ))}
            {reviews.length > 5 && (
              <Button variant="link" className="w-full mt-4">Mostrar todas las reseñas</Button> 
            )}
          </div>
        ) : (
          <p className="text-gray-100 text-center py-4">Este hotel aún no tiene reseñas. ¡Sé el primero en dejar una!</p>
        )}
      </section>

      <Separator className="my-12" />

      {/* Sección de Ubicación y Mapa */}
      <section className="text-center"> {/* Centrar todo el contenido de la sección */}
        <h2 className="text-2xl font-semibold mb-2 text-gray-100">Ubicación</h2>
        <p className="text-gray-100 mb-6">{hotel.address}, {hotel.city}, {hotel.country}</p>
        {hotel.latitude && hotel.longitude ? (
          // Contenedor del mapa: centrado (mx-auto), con ancho completo hasta un máximo (w-full max-w-5xl)
          // y una altura más proporcionada (h-[500px])
          <div className="h-[500px] w-full max-w-5xl mx-auto rounded-lg overflow-hidden shadow-md bg-gray-100">
            <ClientMapView latitude={hotel.latitude} longitude={hotel.longitude} popupText={hotel.name} />
          </div>
        ) : (
          <p className="text-muted-foreground">La ubicación exacta no está disponible en el mapa.</p>
        )}
      </section>
    </div>
  );
}