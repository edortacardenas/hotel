import { Room as PrismaRoom, RoomType as PrismaRoomType} from '@prisma/client';
import { BedDouble, Users, DollarSign, Image as ImageIcon, CheckCircle, Info, CalendarRange, UserCircle, Hash, Building, Tag, ListChecks, Eye } from 'lucide-react';
import { getBookingById } from '@/lib/data/booking-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


/**
 * Define una interfaz para las props del componente.
 * Prisma Decimal puede ser un objeto con toNumber() o ya un número si se transforma antes.
 */
interface RoomDetailsDisplayProps {
  room: Omit<PrismaRoom, 'pricePerNight' | 'roomType'> & {
    pricePerNight: number | { toNumber: () => number };
    roomType: PrismaRoomType | string; // Permitir string para flexibilidad si el enum se pasa como string
  };
}

/**
 * Formatea el precio a una cadena de moneda en EUR.
 */
const formatPrice = (price: number | { toNumber: () => number }): string => {
  const numericPrice = typeof price === 'number' ? price : price.toNumber();
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(numericPrice);
};


const formatRoomType = (roomType: PrismaRoomType | string): string => {
  const roomTypeStr = typeof roomType === 'string' ? roomType : PrismaRoomType[roomType];
  return roomTypeStr
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

// Este componente se mantiene para mostrar específicamente los detalles de la habitación.
// Podría moverse a su propio archivo si se reutiliza en otros lugares.
const RoomDetailsDisplayComponent: React.FC<RoomDetailsDisplayProps> = ({ room }) => {
  // Si 'room' es undefined, el componente no puede renderizar los detalles.
  // Esto previene el error de desestructuración y muestra un mensaje útil.
  if (!room) {
    return (
      <Card className="md:max-w-4xl mx-auto my-8 text-center">
        <Info size={48} className="mx-auto mb-4 text-yellow-500" />
        <p className="text-xl text-gray-700">Información de la habitación no disponible.</p>
        <p className="text-sm text-gray-500">No se pudieron cargar los detalles de la habitación.</p>
      </Card>
    );
  }
  const {
    roomType,
    description,
    pricePerNight,
    capacity,
    beds,
    images: originalImages, // Renombrar para procesar
    amenities,
  } = room;

  let processedImages: string[] = [];
  if (originalImages && Array.isArray(originalImages)) {
    originalImages.forEach(imageEntry => {
      if (typeof imageEntry === 'string') {
        // Si el string de la imagen contiene comas, dividirlo en URLs individuales
        if (imageEntry.includes(',')) {
          processedImages.push(...imageEntry.split(',').map(img => img.trim()).filter(img => img.length > 0));
        } else if (imageEntry.trim().length > 0) {
          // Si es una URL única (sin comas) y no está vacía después de quitar espacios
          processedImages.push(imageEntry.trim());
        }
      }
    });
    // Eliminar duplicados que podrían surgir del proceso de split
    processedImages = [...new Set(processedImages)];
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 md:p-0"> {/* Ajustar padding si es necesario, o quitarlo para que las imágenes toquen los bordes */}
      {/* Sección de Imágenes */}
      {processedImages.length > 0 ? (
        <div className="mb-8">
          {/* <h2 className="text-2xl font-semibold text-gray-800 mb-4 px-6 pt-6">Galería</h2> */}
          <div className={`grid grid-cols-1 ${processedImages.length > 1 ? 'sm:grid-cols-2' : ''} ${processedImages.length > 2 ? 'md:grid-cols-3' : ''} gap-0`}>
            {processedImages.map((image, index) => (
              <div key={`${image}-${index}`} className="aspect-video overflow-hidden group">
                <img 
                  src={image} 
                  alt={`${formatRoomType(roomType)} - Imagen ${index + 1}`} 
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
          <ImageIcon size={40} className="mb-2" />
          <p>No hay imágenes disponibles para esta habitación.</p>
        </div>
      )}

      <div className="p-6 md:p-8">
        {/* Sección Principal de Detalles */}
        <div className="grid md:grid-cols-3 gap-x-8 gap-y-6 mb-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-3">{formatRoomType(roomType)}</h1>
            <p className="text-muted-foreground leading-relaxed">{description || 'No hay descripción detallada disponible para esta habitación.'}</p>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg border">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              <ListChecks size={22} className="mr-2 text-primary" />
              Características Clave
            </h3>
            <div className="space-y-3 text-sm text-foreground">
              <div className="flex items-start">
                <DollarSign size={18} className="mr-3 mt-0.5 text-primary flex-shrink-0" />
                <div>Precio por noche: <strong className="font-semibold">{formatPrice(pricePerNight)}</strong></div>
              </div>
              <div className="flex items-start">
                <Users size={18} className="mr-3 mt-0.5 text-primary flex-shrink-0" />
                <div>Capacidad: <strong className="font-semibold">{capacity} persona(s)</strong></div>
              </div>
              <div className="flex items-start">
                <BedDouble size={18} className="mr-3 mt-0.5 text-primary flex-shrink-0" />
                <div>Camas: <strong className="font-semibold">{beds}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Comodidades */}
        <div>
          <h3 className="text-2xl font-semibold text-foreground mb-4">Comodidades Incluidas</h3>
          {amenities && amenities.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {amenities.map((amenity, index) => (
                <li key={index} className="flex items-center text-muted-foreground bg-muted/50 p-3 rounded-md border text-sm">
                  <CheckCircle size={16} className="mr-2.5 text-green-500 flex-shrink-0" />
                  <span>{amenity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 border-2 border-dashed rounded-md flex items-center text-muted-foreground bg-muted/30">
              <Info size={20} className="mr-2 flex-shrink-0" />
              <p>No hay comodidades específicas listadas para esta habitación.</p>
            </div>
          )}
        </div>
      </div>
      </CardContent>
    </Card>
  );
};

// Esta es la página principal que se exporta.
export default async function BookingDetailsPage({ params }: {params: Promise<{ bookingsId: string }>}) {
  const { bookingsId } = await params; // Es necesario 'await' para params

  if (!bookingsId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto p-8">
          <Info size={48} className="mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground">ID de reserva no proporcionado.</p>
        </Card>
      </div>
    );
  }

  const booking = await getBookingById(bookingsId); // getBookingById ya debería tener el tipo BookingWithDetails

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto p-8">
          <Info size={48} className="mx-auto mb-4 text-yellow-500" />
          <h1 className="text-2xl font-semibold mb-2">Reserva no Encontrada</h1>
          <p className="text-muted-foreground">No se pudo encontrar una reserva con el ID: {bookingsId}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/bookings">Ver mis reservas</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!booking.room) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto p-8">
          <Info size={48} className="mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-semibold mb-2">Error en la Reserva</h1>
          <p className="text-muted-foreground">Los detalles de la habitación no están disponibles para esta reserva.</p>
        </Card>
      </div>
    );
  }

  const { room, checkInDate, checkOutDate, totalPrice, status, numberOfGuests, id: bookingId, user } = booking;

  // Determinar el color del badge de estado
  let statusBadgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  if (status === 'CONFIRMED') statusBadgeVariant = 'default'; // Verde (por defecto de shadcn)
  else if (status === 'PENDING') statusBadgeVariant = 'secondary'; // Amarillo/Naranja
  else if (status === 'CANCELLED' || status === 'REJECTED') statusBadgeVariant = 'destructive'; // Rojo

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Detalles de tu Reserva
        </h1>
        <Badge variant={statusBadgeVariant} className="text-sm px-4 py-1.5 self-start sm:self-center">
          {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
        </Badge>
      </div>

      <Card className="shadow-lg border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-2xl font-semibold text-primary flex items-center">
                <Hash size={24} className="mr-2 opacity-70" />
                Reserva #{bookingId.substring(0, 8)}...
              </CardTitle>
              <CardDescription className="mt-1">
                <Link href={`/hotels/${room.hotel.id}`} className="hover:underline font-medium flex items-center text-muted-foreground">
                  <Building size={16} className="mr-1.5" /> {room.hotel.name}
                </Link>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6 pt-2 text-sm">
          <div className="space-y-3">
            <div className="flex items-start">
              <CalendarRange size={18} className="mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div><span className="font-medium text-foreground">Check-in:</span> {new Date(checkInDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div className="flex items-start">
              <CalendarRange size={18} className="mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div><span className="font-medium text-foreground">Check-out:</span> {new Date(checkOutDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            {user?.name && (
              <div className="flex items-start">
                <UserCircle size={18} className="mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div><span className="font-medium text-foreground">Reservado por:</span> {user.name} {user.email && `(${user.email})`}</div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <Users size={18} className="mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div><span className="font-medium text-foreground">Huéspedes:</span> {numberOfGuests}</div>
            </div>
            <div className="flex items-start">
              <Tag size={18} className="mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div><span className="font-medium text-foreground">Tipo de Habitación:</span> {formatRoomType(room.roomType)}</div>
            </div>
            <div className="flex items-start">
              <DollarSign size={18} className="mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div><span className="font-medium text-foreground">Precio Total:</span> <strong className="text-lg">{formatPrice(totalPrice)}</strong></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4 mt-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Información de la Habitación
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/hotels/${room.hotel.id}#room-${room.id}`}> 
              <Eye size={16} className="mr-2" /> Ver en Hotel
            </Link>
          </Button>
        </div>
        {/* 
          Aquí pasamos el objeto 'room' (que es parte de 'booking') al componente 
          RoomDetailsDisplayComponent.
          Asegúrate de que el tipo de 'booking.room' coincida con lo que espera RoomDetailsDisplayComponent.
          Específicamente, pricePerNight y roomType.
        */}
        <RoomDetailsDisplayComponent room={room as RoomDetailsDisplayProps['room']} />
      </div>
    </div>
  );
}
