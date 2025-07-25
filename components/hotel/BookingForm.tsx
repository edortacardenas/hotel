'use client';

import {  useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';
import { createBookingAction } from '@/lib/data/booking-actions';
import { useEffect } from 'react'; // Importa useEffect
import { toast } from 'sonner'; // Importa toast para notificaciones
import { useRouter } from 'next/navigation'; // Importa useRouter para la redirección
import { CreateBookingActionState } from '@/lib/data/booking-actions'; // Importa el tipo de estado de la acción

// Define la forma del estado que la Server Action retornará, extendiendo el tipo de la acción
interface FormState extends CreateBookingActionState {}

// Define las props que el componente recibirá
interface BookingFormProps {
  hotelId: string;
  pricePerNightMin: number | null;
  uniqueRoomTypesForDisplay: Array<{
    id: string;
    typeName: string;
    capacity: number;
    pricePerNight: number;
  }>;
  currentUserId: string | null;
  hasConfiguredRooms: boolean;
}

const initialState: FormState = {
  success: false,
  message: null,
  errors: {},
};

// Componente para el botón que muestra un estado de carga
function SubmitButton({ currentUserId, hasConfiguredRooms }: { currentUserId: string | null, hasConfiguredRooms: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={!currentUserId || !hasConfiguredRooms || pending}>
      <CalendarDays className="mr-2 h-5 w-5" />
      {pending ? 'Procesando...' : (currentUserId ? 'Reservar Ahora' : 'Inicia sesión para reservar')}
    </Button>
  );
}

export default function BookingForm({ hotelId, pricePerNightMin, uniqueRoomTypesForDisplay, currentUserId, hasConfiguredRooms }: BookingFormProps) {
  const [state, formAction] = useActionState(createBookingAction, initialState);
  const router = useRouter(); // Inicializa el router

  // Efecto para manejar la redirección y los toasts después de que el estado cambie
  useEffect(() => {
    if (state.success) {
      toast.success(state.message || 'Reserva creada exitosamente.'); // Muestra un toast de éxito
      router.push('/bookings'); // Redirige a la página de reservas
    } else if (state.message && !state.errors?.general) {
      // Muestra un toast de error general si hay un mensaje y no es un error de campo específico
      toast.error(state.message);
    }
  }, [state, router]); // Dependencias del efecto: el estado y el router
  return (
    <div className="sticky top-24 p-6 border border-gray-700 bg-black/30 backdrop-blur-sm rounded-lg shadow-lg text-gray-100">
      <form action={formAction}>
        <div className="mb-4">
          <span className="text-2xl font-bold">€{pricePerNightMin?.toFixed(2) || 'N/A'}</span>
          <span className="text-sm"> / noche (desde)</span>
        </div>
        <div className="space-y-4 mb-6">
          <input type="hidden" name="hotelId" value={hotelId} />

          <div>
            <label htmlFor="checkin" className="block text-sm font-medium">Check-in</label>
            <input type="date" id="checkin" name="checkInDate" required className="mt-1 block w-full p-2 bg-zinc-800/50 border-zinc-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-gray-100" />
            {state.errors?.checkInDate && <p className="text-xs text-red-400 mt-1">{state.errors.checkInDate[0]}</p>}
          </div>
          <div>
            <label htmlFor="checkout" className="block text-sm font-medium">Check-out</label>
            <input type="date" id="checkout" name="checkOutDate" required className="mt-1 block w-full p-2 bg-zinc-800/50 border-zinc-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-gray-100" />
            {state.errors?.checkOutDate && <p className="text-xs text-red-400 mt-1">{state.errors.checkOutDate[0]}</p>}
          </div>
          <div>
            <label htmlFor="guests" className="block text-sm font-medium">Huéspedes</label>
            <select id="guests" name="numberOfGuests" required className="mt-1 block w-full p-2 bg-zinc-800/50 border-zinc-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-gray-100">
              {[1, 2, 3, 4, 5].map(n => <option className="text-black" key={n} value={n}>{n} huésped{n > 1 ? 's' : ''}</option>)}
            </select>
            {state.errors?.numberOfGuests && <p className="text-xs text-red-400 mt-1">{state.errors.numberOfGuests[0]}</p>}
          </div>
          {uniqueRoomTypesForDisplay.length > 0 && (
            <>
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium">Tipo de Habitación</label>
                <select id="roomId" name="roomId" required className="mt-1 block w-full p-2 bg-zinc-800/50 border-zinc-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-gray-100">
                  <option className="text-black" value="">Selecciona un tipo de habitación</option>
                  {uniqueRoomTypesForDisplay.map(roomType => (<option className="text-black" key={roomType.id} value={roomType.id}>{roomType.typeName} (Cap: {roomType.capacity}, €{roomType.pricePerNight.toFixed(2)}/noche)</option>))}
                </select>
                {state.errors?.roomId && <p className="text-xs text-red-400 mt-1">{state.errors.roomId[0]}</p>}
              </div>
              <div>
                <label htmlFor="numberOfRooms" className="block text-sm font-medium">Número de Habitaciones</label>
                <input
                  type="number"
                  id="numberOfRooms"
                  name="numberOfRooms"
                  defaultValue="1"
                  min="1"
                  required
                  className="mt-1 block w-full p-2 bg-zinc-800/50 border-zinc-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-gray-100"
                />
                {state.errors?.numberOfRooms && <p className="text-xs text-red-400 mt-1">{state.errors.numberOfRooms[0]}</p>}
              </div>
            </>
          )}
        </div>
        {state.errors?.general && <p className="text-sm text-red-400 mb-4 text-center">{state.errors.general[0]}</p>}
        <SubmitButton currentUserId={currentUserId} hasConfiguredRooms={hasConfiguredRooms} />
        {!currentUserId && <p className="text-xs text-red-500 text-center mt-2">Debes iniciar sesión para poder reservar.</p>}
        {currentUserId && !hasConfiguredRooms && <p className="text-xs text-orange-500 text-center mt-2">No hay tipos de habitación configurados para este hotel.</p>}
      </form>
    </div>
  );
}