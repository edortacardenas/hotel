"use client";

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // De Shadcn/ui
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, UserCircle, Trash2, Loader2 } from 'lucide-react'; // Importar Trash2 y Loader2
import { Button } from '@/components/ui/button';
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
import { deleteReviewAction, DeleteReviewActionState } from '@/lib/data/hotel-actions'; // Asegúrate que la ruta sea correcta
import { toast } from 'sonner'; // Asumiendo que usas sonner

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date; // Podría ser string (ISO) o Date object
  user: {
    name?: string | null;
    image?: string | null;
  };
  userId: string; // Asegúrate de que este campo esté presente en los datos de la reseña
}

interface ReviewCardProps {
  review: Review;
  currentUserId?: string | null; // ID del usuario actualmente logueado
}

// Helper function to format date, moved outside the component
const formatReviewDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  // Using formatDistanceToNow for a more dynamic "time ago" display
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
};

const ReviewCard: React.FC<ReviewCardProps> = ({ review, currentUserId }) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!review.id) {
      toast.error("ID de reseña no encontrado.");
      return;
    }
    startTransition(async () => {
      const result: DeleteReviewActionState = await deleteReviewAction(review.id);
      if (result.success) {
        toast.success(result.message || "Reseña eliminada exitosamente.");
        router.refresh(); // Refreshes the data on the current page
      } else {
        toast.error(result.message || "Error al eliminar la reseña.");
      }
    });
  };

  return (
    <div className="border-b py-6">
      <div className="flex items-start space-x-4">
        <Avatar>
          <AvatarImage src={review.user.image ?? undefined} alt={review.user.name ?? 'Usuario'} />
          <AvatarFallback>
            {review.user.name ? review.user.name.substring(0, 2).toUpperCase() : <UserCircle />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
          <h4 className="font-semibold text-md text-gray-100 flex-grow">{review.user.name || 'Anónimo'}</h4>
            {currentUserId && review.userId === currentUserId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isPending} className="text-red-500 hover:text-red-700 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente tu reseña de nuestros servidores.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isPending ? 'Eliminando...' : 'Eliminar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <span className="text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</span>
          </div>
          <div className="flex items-center my-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-4 w-4 ${index < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-300'}`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-100 leading-relaxed">{review.comment}</p>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;