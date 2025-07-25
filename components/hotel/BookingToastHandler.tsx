// app/components/hotel/BookingToastHandler.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner'; // Asegúrate de tener instalada y configurada la librería sonner (o tu preferida)

export default function BookingToastHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get('booking_status');
    const message = searchParams.get('message');

    if (message) {
      const decodedMessage = decodeURIComponent(message);
      if (status === 'success') {
        toast.success(decodedMessage);
      } else if (status === 'error') {
        toast.error(decodedMessage);
      }
      
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [searchParams]); // Se ejecuta cuando searchParams cambia

  return null; // Este componente no renderiza nada visible
}
