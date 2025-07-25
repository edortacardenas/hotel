"use client";

import { useTransition, useState } from 'react';
import { Button } from '../ui/button';
import type { UserBookingDetails } from '@/lib/data/booking-actions';
import { Loader2 } from 'lucide-react';

// Define un tipo más preciso para la acción que se pasa como prop.
// La acción es asíncrona y devuelve un objeto con `success` y un `message` opcional.
type PaymentAction = (booking: UserBookingDetails) => Promise<{
    success: boolean;
    message?: string;
} | void>; // `void` es posible si la redirección ocurre

interface PaymentButtonProps {
    handlePayment: PaymentAction;
    booking: UserBookingDetails;
}

export default function PaymentButton({ handlePayment, booking }: PaymentButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleClick = () => {
        setError(null); // Limpiar errores anteriores
        startTransition(async () => {
            const result = await handlePayment(booking);
            // Si la acción devuelve un resultado (es decir, no redirigió y hubo un error), lo manejamos.
            if (result && !result.success) {
                setError(result.message || "Ocurrió un error inesperado.");
            }
        });
    }

    return (
        <div className="flex flex-col items-end">
            <Button variant="outline" size="sm" onClick={handleClick} disabled={booking.status !== 'PENDING' || isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isPending ? 'Procesando...' : 'Pagar'}
            </Button>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};
