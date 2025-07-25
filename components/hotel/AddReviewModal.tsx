// app/(main)/hotels/[hotelId]/components/AddReviewModal.tsx
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Para el botón de cancelar
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createReviewAction, CreateReviewActionState } from '@/lib/data/hotel-actions'; // Asegúrate que la ruta sea correcta
import { toast } from 'sonner'; // Asumiendo que usas sonner para notificaciones
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Para revalidar/refrescar

const reviewSchema = z.object({
    rating: z.number().min(1, "La calificación es obligatoria y debe ser al menos 1.").max(5, "La calificación no puede ser mayor a 5."),
    comment: z.string().min(10, "El comentario debe tener al menos 10 caracteres.").max(1000, "El comentario no puede exceder los 1000 caracteres."),
  });

type ReviewFormData = z.infer<typeof reviewSchema>;

interface AddReviewModalProps {
    hotelId: string;
    triggerButton?: React.ReactNode; 
}

export default function AddReviewModal({ hotelId, triggerButton }: AddReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [currentRating, setCurrentRating] = useState(0);


  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const onSubmit = async (data: ReviewFormData) => {
    startTransition(async () => {
      const result: CreateReviewActionState = await createReviewAction(hotelId, data);
      if (result.success) {
        toast.success(result.message || 'Reseña agregada exitosamente.');
        setIsOpen(false);
        form.reset();
        setCurrentRating(0);
        router.refresh(); // Refresca los datos de la página actual (Server Component)
      } else {
        toast.error(result.message || 'Error al agregar la reseña.');
        if (result.errors) {
          // Manejar errores de campo específicos si es necesario
          console.error("Errores de validación:", result.errors);
        }
      }
    });
  };

  const handleRating = (rate: number) => {
    setCurrentRating(rate);
    form.setValue('rating', rate, { shouldValidate: true });
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || <Button variant="outline">Agregar Reseña</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Escribe tu reseña</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia sobre tu estancia en este hotel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="rating" className="mb-2 block">Calificación</Label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-7 w-7 cursor-pointer ${
                    currentRating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  }`}
                  onClick={() => handleRating(star)}
                />
              ))}
            </div>
            {form.formState.errors.rating && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.rating.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="comment">Comentario</Label>
            <Textarea
              id="comment"
              placeholder="Describe tu experiencia..."
              {...form.register('comment')}
              className="min-h-[100px]"
            />
            {form.formState.errors.comment && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.comment.message}</p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Agregando...' : 'Agregar Reseña'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
