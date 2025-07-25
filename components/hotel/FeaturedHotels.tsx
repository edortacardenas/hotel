import { searchHotels, HotelSearchResult, HotelSearchQueryFilters } from '@/lib/data/hotel-actions';
import HotelCard from '@/components/hotel/HotelCard'; // Tu componente para mostrar cada hotel
import { AlertTriangle } from 'lucide-react'; // Para mostrar un icono en caso de error

const FeaturedHotels = async () => {
  let featuredHotels: HotelSearchResult[] = [];
  let fetchError: string | null = null;
  const numberOfFeaturedHotelsToShow = 3; // Define cuántos hoteles destacados mostrar

  try {
    // Define los criterios para considerar un hotel como "destacado"
    // Estos filtros se pasarán a la Server Action searchHotels
    const featuredCriteria: HotelSearchQueryFilters = {
      starRatings: [5, 4], // Por ejemplo, hoteles de 4 y 5 estrellas
      // Podrías añadir más criterios aquí, como:
      // minPrice: 100, // Hoteles con precio mínimo de 100
      // amenities: ['Piscina', 'WiFi'], // Hoteles con piscina y WiFi
      // O incluso podrías tener un campo 'isFeatured' en tu modelo Hotel y filtrar por él.
    };

    // Llama a la Server Action searchHotels con los criterios definidos
    const allMatchingHotels = await searchHotels(featuredCriteria);

    // Toma solo el número deseado de hoteles para mostrar como destacados.
    // Idealmente, tu Server Action searchHotels podría aceptar un parámetro 'limit'
    // para hacer esto más eficiente a nivel de base de datos.
    featuredHotels = allMatchingHotels.slice(0, numberOfFeaturedHotelsToShow);

  } catch (error) {
    console.error("Failed to load featured hotels in component:", error);
    fetchError = "No se pudieron cargar los hoteles destacados en este momento. Por favor, inténtalo más tarde.";
  }

  if (fetchError) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 p-6 rounded-lg shadow-md border border-red-200 dark:border-red-700">
            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mb-3" />
            <p className="text-red-700 dark:text-red-300 font-semibold">{fetchError}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!featuredHotels || featuredHotels.length === 0) {
    // Opcional: Mostrar un mensaje si no hay hoteles que cumplan los criterios de "destacado"
    // return <p className="text-center text-muted-foreground py-8">No hay hoteles destacados disponibles actualmente.</p>;
    return null; // No renderizar nada si no hay hoteles destacados
  }

  return (
    <section className="py-12 bg-slate-50 dark:bg-slate-800"> {/* Fondo para destacar la sección */}
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10 text-slate-800 dark:text-slate-100">Hoteles Destacados</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {featuredHotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedHotels;