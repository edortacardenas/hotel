// This page will be a Server Component to fetch initial booking data
import Link from 'next/link';
import Image from 'next/image';
import { getUserBookingsAction } from '@/lib/data/booking-actions'; // Server Action to get user's bookings
import { auth } from '@/lib/auth'; // To get the current session
import type { Session } from '@/lib/type';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, BedDouble, Users, MapPin, AlertTriangle } from 'lucide-react';
import { headers } from 'next/headers';

// Import the type for user bookings, ensure it expects numbers for prices
import { UserBookingDetails } from '@/lib/data/booking-actions'; 
// Import Decimal for type checking during transformation
import { Decimal } from '@prisma/client/runtime/library'; 
import CancelBookingButton from '@/components/booking/CancelBookingButton'; // Update the path to the correct location
import PaymentButton from '@/components/booking/PaymentButton'; // Asumo que este componente ya existe
import { redirect } from 'next/navigation'; // Import redirect

/**
 * Define el tipo de retorno para la Server Action.
 * Esto permite al cliente manejar los errores de forma explícita.
 */
type PaymentActionResult = {
  success: boolean;
  message?: string;
};

/**
 * Server Action para iniciar el proceso de pago.
 * Llama a nuestra API interna que a su vez crea una sesión de checkout en Stripe.
 * Finalmente, redirige al usuario a la URL de pago de Stripe si es exitoso.
 * @param bookingData - Los detalles de la reserva que se va a pagar.
 */
async function handlePaymentAction(bookingData: UserBookingDetails) {
  "use server"; // This directive marks the function as a Server Action

  const requestHeaders = headers(); // Get headers from the incoming request to forward cookies

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    console.error("Environment variable NEXT_PUBLIC_BASE_URL is not set. Payment initiation will likely fail.");
    return { success: false, message: "Error de configuración: La URL base para pagos no está definida. Por favor, contacta al soporte." };
  }

  // La URL debe ser absoluta cuando se hace fetch desde el servidor en producción
  const apiEndpoint = `${baseUrl}/api/payments`;

  // Extract and validate the hotel image URL
  const hotelImageToSend = (() => {
    const images = bookingData.hotel.images;
    let firstImage = '/public/images/Hotelsa.webp'; // Default fallback image

    if (Array.isArray(images) && images.length > 0) {
      const potentialImage = images[0];
      // Ensure the first element is a string before attempting to trim it
      if (typeof potentialImage === 'string') {
        firstImage = potentialImage.trim();
      } else {
        // Log a warning if the first element is not a string (e.g., an array or object)
        console.warn("DEBUG: bookingData.hotel.images[0] is not a string. Type:", typeof potentialImage, "Value:", potentialImage);
      }
    }
    return firstImage;
  })();

  console.log("DEBUG: hotelImageToSend type:", typeof hotelImageToSend, "value:", hotelImageToSend);

  try {
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the cookie from the original request to the API route for authentication
        'Cookie': (await requestHeaders).get('Cookie') || '',
      },
      body: JSON.stringify({
        bookingIds: [bookingData.id], // La API espera un array de IDs
        totalPrice: bookingData.totalPrice,
        currency: 'eur', // O la moneda que corresponda
        hotelName: bookingData.hotel.name,
        hotelImage: hotelImageToSend, // Use the pre-calculated and validated value
      }),
    });

    const contentType = res.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!res.ok) {
      let errorMessage = "Failed to initiate payment. Please try again.";
      if (isJson) {
        const errorData = await res.json();
        errorMessage = errorData.error?.message || errorMessage;
        console.error("Error from /api/payments (JSON):", errorData);
      } else {
        const errorText = await res.text();
        console.error(`Error from /api/payments (Non-JSON). Status: ${res.status}. Body:`, errorText);
      }
      return { success: false, message: errorMessage };
    }

    if (!isJson) {
      const responseText = await res.text();
      console.error(`API response was not JSON, but status was OK. Status: ${res.status}. Body:`, responseText);
      return { success: false, message: "Received an invalid response from the payment server." };
    }

    const paymentSession = await res.json();

    if (paymentSession.url) {
      // Esta es la forma correcta de redirigir desde una Server Action.
      redirect(paymentSession.url);
    } else {
      // Esto debería ser raro si `res.ok` es true, pero es un fallback seguro.
      console.error("API did not return a payment URL:", paymentSession);
      return { success: false, message: "Failed to get payment URL from Stripe. Please try again." };
    }
  // @ts-ignore  
  } catch (error: any) {
    // El redirect() de Next.js funciona lanzando un error especial.
    // Debemos detectar este error y volver a lanzarlo para que Next.js pueda completar la redirección.
    if (error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Error in handlePaymentAction:", error); // Loguear solo errores reales
    // Captura otros errores (de red, etc.) y devuelve un mensaje al cliente.
    return { success: false, message: "An unexpected error occurred during payment initiation. Please try again." };
  }
}


function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function MyBookingsPage() {
  const rawSession = await auth.api.getSession({ headers: await headers() }); // Pass empty headers or actual headers if needed
  const session = rawSession as Session;

  if (!session?.user?.id) {
    // Or redirect to login page
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
        <h1 className="mt-4 text-2xl font-semibold">Acceso Denegado</h1>
        <p className="mt-2 text-gray-100">Por favor, inicia sesión para ver tus reservas.</p>
        <Button asChild className="mt-6">
          <Link href="/sign-in">Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  const actionResult = await getUserBookingsAction();

  if ('error' in actionResult && actionResult.error) { // Verifica si 'error' existe en actionResult
    console.error("Error fetching bookings:", actionResult.error);
    // Muestra un mensaje de error al usuario dentro de la misma estructura de página
    return (
      <div className="w-full min-h-screen bg-transparent">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-background/90 dark:bg-background/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-2xl">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h1 className="mt-4 text-2xl font-semibold">Error al Cargar Reservas</h1>
              <p className="mt-2 text-gray-100">
                {typeof actionResult.error === 'string' ? actionResult.error : "No pudimos cargar tus reservas en este momento. Por favor, inténtalo de nuevo más tarde."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assuming actionResult.bookings contains an array of objects that might have Decimal types
  const rawBookings = 'bookings' in actionResult && Array.isArray(actionResult.bookings) 
    ? actionResult.bookings 
    : [];

    
  // Transform rawBookings to ensure Decimal fields are converted to numbers
  // @ts-ignore
  const bookings: UserBookingDetails[] = rawBookings.map((booking: any) => {
    // Ensure booking.room exists and has pricePerNight before attempting to convert
    const roomPricePerNight = booking.room && booking.room.pricePerNight
      ? (booking.room.pricePerNight instanceof Decimal ? booking.room.pricePerNight.toNumber() : Number(booking.room.pricePerNight))
      : 0; // Default to 0 or handle as an error if price is mandatory

    return {
      ...booking,
      totalPrice: booking.totalPrice instanceof Decimal ? booking.totalPrice.toNumber() : Number(booking.totalPrice),
      room: {
        ...booking.room,
        pricePerNight: roomPricePerNight,
      },
    } as UserBookingDetails; // Assert the final structure matches UserBookingDetails
  });

  return (
    <div className="w-full min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        {/* Contenedor para el contenido con un fondo semitransparente para legibilidad */}
        <div className="bg-transparent dark:bg-background/80 p-6 sm:p-8 rounded-xl shadow-2xl text-gray-100">
          <h1 className="text-3xl font-semibold mb-8 text-center sm:text-left">Mis Reservas</h1>
          {bookings.length === 0 ? (
            <p className="text-muted-foreground text-center">Aún no has realizado ninguna reserva.</p>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => {
                // Lógica corregida: Tomar la primera imagen de un array de strings
                const images = booking.hotel.images;
                // Verificar si 'images' es un array y tiene elementos
                const firstImageSrc = (Array.isArray(images) && images.length > 0)
                  ? images[0].trim() // Tomar el primer elemento del array
                  : '/images/Hotelsa.webp';

                return (<Card key={booking.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fadeInSlideUp">
                  <div className="md:flex">
                    <div className="md:flex-shrink-0 md:w-1/3 lg:w-1/4 relative">
                      <Image
                        src={firstImageSrc}
                        alt={booking.hotel.name}
                        width={400}
                        height={300}
                        className="h-48 w-full object-cover md:h-full"
                      />
                    </div>
                    <div className="p-6 flex-grow">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-semibold">{booking.hotel.name}</CardTitle>
                        <Badge variant={booking.status === 'CONFIRMED' ? 'default' : booking.status === 'PENDING' ? 'secondary' : 'destructive'}>
                          {booking.status}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center text-sm text-gray-200 mt-1 mb-3">
                        <MapPin className="h-4 w-4 mr-1" /> {booking.hotel.city}
                      </CardDescription>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                        <p className="flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-primary" /> Check-in: {formatDate(booking.checkInDate)}</p>
                        <p className="flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-primary" /> Check-out: {formatDate(booking.checkOutDate)}</p>
                        <p className="flex items-center"><BedDouble className="h-4 w-4 mr-2 text-primary" /> Habitación: {booking.room.roomType}</p>
                        <p className="flex items-center"><Users className="h-4 w-4 mr-2 text-primary" /> Huéspedes: {booking.numberOfGuests}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
                        <p className="text-lg font-semibold">Total: €{booking.totalPrice.toFixed(2)}</p>
                        <div className="flex gap-2">
                          <PaymentButton handlePayment={handlePaymentAction} booking={booking} />
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/bookings/${booking.id}`}>Ver Detalles</Link>
                          </Button>
                          <CancelBookingButton bookingId={booking.id} currentStatus={booking.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>);
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}