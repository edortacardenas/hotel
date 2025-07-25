'use client';

import { useState, useEffect } from 'react';
import FilterSidebar, { Filters } from '@/components/search/FilterSidebar';
import HotelCard from '@/components/hotel/HotelCard';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Filter as FilterIcon } from 'lucide-react';
// Import HotelSearchResult for type definition and getHotelsAndFilterOptions for data fetching
import { getHotelsAndFilterOptions, HotelSearchResult } from '@/lib/data/hotel-actions';

interface InitialSearchData {
  // The 'hotels' property will be an array of HotelSearchResult objects
  hotels: HotelSearchResult[];
  availableAmenities: string[];
  availablePropertyTypes: string[];
  maxPrice: number;
}

export default function SearchResultsPage() {
 const [filters, setFilters] = useState<Filters | null>(null);
 const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [initialData, setInitialData] = useState<InitialSearchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getHotelsAndFilterOptions();
      setInitialData(data);
      setIsLoading(false);
    }
    fetchData();
  }, []);

 const handleFilterChange = (newFilters: Filters) => {
   console.log('Filtros aplicados:', newFilters);
   setFilters(newFilters);
   setIsSheetOpen(false); // Cerrar el sheet después de aplicar filtros en móvil
   // La actualización de displayedHotels se hará automáticamente al cambiar `filters`
 };

  const hotelsToDisplay = initialData?.hotels || [];

  // Lógica de filtrado
 const displayedHotels = filters
   ? hotelsToDisplay.filter(hotel => {
        // Si pricePerNightMin es null o undefined, podríamos tratarlo como no coincidente para rangos de precio,
        // o asignarle un valor como 0 o Infinity dependiendo de la lógica de negocio deseada.
        // Aquí, si es null/undefined, Number() lo convertirá a 0 o NaN, lo que podría afectar el filtro.
        // Es más seguro verificarlo explícitamente si es un caso común.
        const currentPrice = hotel.pricePerNight !== null && hotel.pricePerNight !== undefined ? Number(hotel.pricePerNight) : null;

        // Filtrar por rango de precio
       if (filters.priceRange && currentPrice !== null) {
          if (!(currentPrice >= filters.priceRange[0] && currentPrice <= filters.priceRange[1])) return false;
       }

        // Filtrar por calificación de estrellas
        if (filters.starRatings && filters.starRatings.length > 0) {
          // Si hotel.starRating puede ser null y no quieres que coincida
          if (hotel.starRating === null || !filters.starRatings.includes(hotel.starRating)) return false;
       }

        // Filtrar por comodidades (el hotel debe tener TODAS las comodidades seleccionadas)
        if (filters.amenities && filters.amenities.length > 0) {
          if (!filters.amenities.every(amenity => hotel.amenities?.includes(amenity))) return false;
        }

        // Filtrar por tipo de propiedad (el hotel debe ser de UNO de los tipos seleccionados)
        if (filters.propertyTypes && filters.propertyTypes.length > 0) {
          if (!filters.propertyTypes.includes(hotel.propertyType || '')) return false;
        }

       return true; // Si pasó todos los filtros aplicables
     })
   : hotelsToDisplay;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        {/* You can replace this with a Shadcn Skeleton or Spinner component */}
        <p className="text-xl animate-pulse">Cargando resultados...</p>
      </div>
    );
  }

  if (!initialData) {
    // This case might occur if getHotelsAndFilterOptions returns null or an error isn't caught properly
    return <div className="container mx-auto px-4 py-8 text-center">Error al cargar los datos. Por favor, inténtalo de nuevo.</div>;
  }

 const sidebarContent = (
   <FilterSidebar
      availableAmenities={initialData.availableAmenities}
      availablePropertyTypes={initialData.availablePropertyTypes}
      maxPrice={initialData.maxPrice}
      onFilterChange={handleFilterChange}
     // initialFilters={/* podrías cargar filtros desde la URL aquí */}
   />
 );

 return (
   <div className="container mx-auto px-4 py-8">
     <div className="lg:hidden mb-4"> {/* Botón para abrir filtros en móvil */}
       <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
         <SheetTrigger asChild>
           <Button variant="outline" className="w-full">
             <FilterIcon className="mr-2 h-4 w-4" />
             Mostrar Filtros
           </Button>
         </SheetTrigger>
         <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 overflow-y-auto">
           <SheetHeader className="p-4 border-b">
             <SheetTitle>Filtros</SheetTitle>
           </SheetHeader>
           <div className="p-0"> {/* El padding ya está en FilterSidebar */}
             {sidebarContent}
           </div>
         </SheetContent>
       </Sheet>
     </div>

     <div className="flex flex-col lg:flex-row gap-8">
       <aside className="hidden lg:block lg:sticky lg:top-20 h-fit"> {/* Sidebar para desktop */}
         {sidebarContent}
       </aside>
       <main className="flex-1">
         <h1 className="text-2xl font-bold mb-6">Resultados de Búsqueda ({displayedHotels.length})</h1>
         {displayedHotels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {displayedHotels.map(hotel => (
               <HotelCard key={hotel.id} hotel={hotel} />
              ))}
           </div>
         ) : (
           <p>No se encontraron hoteles que coincidan con tus criterios.</p>
         )}
       </main>
     </div>
   </div>
 );
}