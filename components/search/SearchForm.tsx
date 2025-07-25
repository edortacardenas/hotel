'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Importar Label de Shadcn/ui
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Para DatePicker
import { Calendar } from '@/components/ui/calendar'; // Para DatePicker
import { CalendarIcon, Users, MapPin } from 'lucide-react'; // Iconos
import { format } from 'date-fns'; // Para formatear fechas
import { es } from 'date-fns/locale'; // Para formato de fecha en español

export default function SearchForm() {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [guests, setGuests] = useState<number>(1);
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Construir la URL de búsqueda con los parámetros
    const queryParams = new URLSearchParams({
      location,
      checkIn: checkIn ? format(checkIn, 'yyyy-MM-dd') : '',
      checkOut: checkOut ? format(checkOut, 'yyyy-MM-dd') : '',
      guests: guests.toString(),
    });
    router.push(`/search?${queryParams.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
      <div className="lg:col-span-2 space-y-1">
        <Label htmlFor="location" className="text-sm font-medium text-muted-foreground">Destino</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="location" type="text" placeholder="Ciudad, hotel, etc." value={location} onChange={(e) => setLocation(e.target.value)} required className="pl-10" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="checkin" className="text-sm font-medium text-muted-foreground">Check-in</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="checkin"
              variant={"outline"}
              className={`w-full justify-start text-left font-normal ${!checkIn && "text-muted-foreground"}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {checkIn ? format(checkIn, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={setCheckIn}
              initialFocus
              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || (checkOut ? date >= checkOut : false) }
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1">
        <Label htmlFor="checkout" className="text-sm font-medium text-muted-foreground">Check-out</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="checkout"
              variant={"outline"}
              className={`w-full justify-start text-left font-normal ${!checkOut && "text-muted-foreground"}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {checkOut ? format(checkOut, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkOut}
              onSelect={setCheckOut}
              initialFocus
              disabled={(date) => checkIn ? date <= checkIn : date < new Date(new Date().setHours(0,0,0,0))}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1">
        <Label htmlFor="guests" className="text-sm font-medium text-muted-foreground">Huéspedes</Label>
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="guests" type="number" min="1" value={guests} onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value, 10) || 1))} required className="pl-10" />
        </div>
      </div>
      <Button type="submit" className="w-full h-10 md:mt-[21px]"> {/* Ajuste de margen para alinear con inputs con label */}
        Buscar Hoteles
      </Button>
    </form>
  );
}