"use client";

import { useActionState, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteBookingAction, DeleteBookingActionState } from "@/lib/data/booking-actions";
import { Trash2, Loader2 } from "lucide-react";
import { BookingStatus } from "@prisma/client";

const initialState: DeleteBookingActionState = {
  success: false,
  message: "",
};

interface CancelBookingButtonProps {
  bookingId: string;
  currentStatus: BookingStatus;
}

export default function CancelBookingButton({ bookingId, currentStatus }: CancelBookingButtonProps) {
  const [state, formAction, isPending] = useActionState(deleteBookingAction, initialState);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const cancellableStatuses: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.PENDING];
  if (!cancellableStatuses.includes(currentStatus)) {
    return null;
  }

  useEffect(() => {
    if (state.message && !isPending) { // Mostrar mensaje solo cuando la acción ha terminado
      // Aquí podrías usar una librería de toasts para notificaciones más amigables
      // console.log("CancelBookingAction State:", state);
      if (state.success) {
        setIsDialogOpen(false); // Cerrar diálogo en éxito
      }
    }
  }, [state, isPending]);

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          <Trash2 className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cancelará tu reserva. Esta operación no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.message && !state.success && !isPending && (
          <p className="text-sm text-red-600 mt-2 px-6">{state.message}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>No, mantener</AlertDialogCancel>
          <form action={formAction} className="contents"> {/* Usar contents para que el form no rompa el flex layout del footer */}
            <input type="hidden" name="bookingId" value={bookingId} />
            <AlertDialogAction type="submit" disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sí, cancelar
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}