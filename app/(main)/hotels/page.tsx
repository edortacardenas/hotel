
import { getHotels} from "@/lib/data/hotel-actions"; // 
import {isAdmin } from "@/lib/data/user-actions"; // Importar isAdmin
import HotelCard from '@/components/hotel/HotelCard'; // Usaremos HotelCardAlternative para mejor UX
import AdminActions from "@/components/hotel/AdminActions"; // Importar el nuevo componente

export default async function HotelsPage() {
  // Cargar hoteles y estado de admin en paralelo para mejorar rendimiento
  const [hotelsResult, adminStatusResult] = await Promise.allSettled([
    getHotels(),
    isAdmin() // Esta función debe existir en hotel-actions y retornar un booleano o algo evaluable
  ]);

  const hotels = hotelsResult.status === 'fulfilled' ? hotelsResult.value : [];
  const currentIsAdmin = adminStatusResult.status === 'fulfilled' ? !!adminStatusResult.value : false;

  if (hotelsResult.status === 'rejected') {
    console.error("Error al cargar hoteles:", hotelsResult.reason);
    // Podrías querer mostrar un mensaje de error específico si la carga de hoteles falla
  }
  if (adminStatusResult.status === 'rejected') {
    console.error("Error al verificar el estado de administrador:", adminStatusResult.reason);
    // currentIsAdmin será false, lo cual es un comportamiento seguro (no mostrar botones de admin)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center text-gray-100 sm:text-left mb-4 sm:mb-0">Nuestros Hoteles</h1>
        <AdminActions isAdmin={currentIsAdmin} />
      </div>
      {hotels.length === 0 ? (
        <p className="text-center text-gray-100">
          {hotelsResult.status === 'rejected' ? "No se pudieron cargar los hoteles en este momento." : "No hay hoteles registrados por el momento."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} isAdmin={currentIsAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}