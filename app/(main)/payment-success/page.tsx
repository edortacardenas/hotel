'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { BookingWithDetails } from '@/lib/data/booking-actions';
import { getBookingByStripeSessionId } from '@/lib/data/stripe-actions';
import { CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No se encontró el ID de la sesión de pago.");
      setLoading(false);
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        const bookingData = await getBookingByStripeSessionId(sessionId);
        if (bookingData) {
          setBooking(bookingData);
        } else {
          setError("No se pudieron recuperar los detalles de tu reserva. Por favor, revisa tu sección de 'Mis Reservas' o contacta a soporte.");
        }
      } catch (err) {
        console.error("Failed to fetch booking details:", err);
        setError("Ocurrió un error al buscar tu reserva.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();

  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <Loader className="h-12 w-12 animate-spin text-blue-500" />
        <p className="mt-4 text-lg font-medium">Verificando tu pago...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="mt-4 text-lg font-medium text-red-600">{error}</p>
        <p className="text-sm text-gray-500">Por favor, contacta con soporte si el problema persiste.</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="items-center text-center flex gap-8 justify-center" >
        <CheckCircle className="h-16 w-16 text-green-500" />
        <CardTitle className="text-3xl font-bold">¡Pago Exitoso!</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-lg text-gray-700">
          Gracias por tu reserva. Hemos confirmado tu pago y tu estancia está asegurada.
        </p>
        <p className="mt-2 text-gray-500">
          {booking?.confirmationEmailSent ?
            (<>Hemos enviado un correo electrónico de confirmación a <strong className="text-gray-800">{booking.user.email}</strong> con todos los detalles.</>)
            :
            (<>Tu reserva está confirmada. Recibirás los detalles por correo electrónico en breve. Si no lo recibes, revisa tu carpeta de spam o contacta a soporte.</>)
          }
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/bookings">
              Ver Mis Reservas
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-lg font-medium">Cargando...</p>
        </div>
      }>
        <SuccessPageContent />
      </Suspense>
    </div>
  );
}