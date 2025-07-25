"use client"; // Asegurarse de que es un Client Component

import Image from 'next/image';
import Link from 'next/link';
import { Star, BedDouble } from 'lucide-react'; // Usar Star y BedDouble de lucide-react
import { useState, useTransition } from 'react'; // Importar hooks de React
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Importar Button para los botones de admin

// Importar la interfaz HotelSearchResult desde donde la hayas definido
// Asegúrate de que la ruta sea correcta
import { deleteHotelAction, HotelSearchResult } from '@/lib/data/hotel-actions'; // Ajusta la ruta si es necesario

import { toast } from 'sonner'; // Importar toast para notificaciones
interface HotelCardProps {
  hotel: HotelSearchResult;
  isAdmin?: boolean; // Prop para indicar si el usuario es administrador
}

/**
 * Versión alternativa de HotelCard que evita anidar Links interactivos
 * si los botones de administrador están presentes.
 */
export default function HotelCard({ hotel, isAdmin }: HotelCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false); // Estado local para el botón de eliminar

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el hotel "${hotel.name}"?`)) {
      return;
    }

    setIsDeleting(true); // Deshabilitar el botón inmediatamente
    startTransition(async () => {
      // Asume que tienes una Server Action deleteHotelAction en hotel-actions
      // y que revalida la ruta /hotels después de eliminar.
      const { success, message } = await deleteHotelAction(hotel.id);
      if (success) {
        toast.success(message);
      } else {
        toast.error(message);
      }
      setIsDeleting(false); // Habilitar el botón de nuevo (aunque la tarjeta probablemente desaparecerá)
    });
  };

  const cardInnerContent = (
    <>
      {/* Contenedor de imagen con relación de aspecto fija (ej. 16:9) y overflow-hidden */}
      <div className="relative w-full aspect-video overflow-hidden">
        <Image
          src={hotel.imageUrl || '/images/placeholder-hotel.jpg'}
          alt={hotel.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 33vw" // Ajustar 'sizes' si es necesario según el layout
          priority={true} // Priorizar la carga de la imagen
        />
      </div>
      <CardContent className="p-4 flex flex-col flex-grow">
        {isAdmin ? (
          <h3 className="text-lg font-semibold mb-1 truncate">{hotel.name}</h3>
        ) : (
          <h3 className="text-lg font-semibold mb-1 truncate group-hover:text-primary transition-colors">{hotel.name}</h3>
        )}
        <p className="text-sm text-muted-foreground mb-2 truncate">{hotel.city}, {hotel.country}</p>
        <div className="flex items-center mb-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-5 w-5 ${index < hotel.starRating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-300'}`}
            />
          ))}
          {hotel.reviewCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">({hotel.reviewCount} reseñas)</span>
          )}
        </div>
        <div className="mt-auto pt-2">
          <p className="text-base font-bold text-foreground">
            Desde <span className="text-primary">${hotel.pricePerNight}</span>
            <span className="text-xs font-normal text-muted-foreground"> / noche</span>
          </p>
          {isAdmin && (
            <div className="mt-3 flex space-x-2 justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href={`/hotels/${hotel.id}/edit`}>Editar</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                <Link href={`/hotels/${hotel.id}/add-room`}><BedDouble size={16} className="mr-1" /> Add Rooms</Link>
              </Button>
              <Link href={`/hotels`}>
                <Button variant="destructive" size="sm" className="" onClick={handleDelete} disabled={isPending || isDeleting}>
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </>
  );

  if (isAdmin) {
    return (
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl">
        {/* Si es admin, el nombre del hotel podría ser un enlace a la vista de detalle si se desea */}
        {/* <Link href={`/hotels/${hotel.id}`} className="block"> */}
        {cardInnerContent}
        {/* </Link> */}
      </Card>
    );
  }

  return (
    <Link href={`/hotels/${hotel.id}`} className="block group">
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-xl">
        {cardInnerContent}
      </Card>
    </Link>
  );
}