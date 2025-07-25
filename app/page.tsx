//import SearchForm from '@/components/search/SearchForm';
import FeaturedHotels from '@/components/hotel/FeaturedHotels'; // Un nuevo componente para hoteles destacados



export default function Home() {
  return (
    <main
      className="w-full min-h-screen "
      
    >
      <div className="container mx-auto px-4 py-8"> {/* Contenedor para el contenido */}
        <section className="mb-12 text-center">
          {/* Para mejorar la legibilidad del texto sobre la imagen, podrías necesitar ajustar los colores del texto */}
          {/* o añadir un overlay semitransparente. Ejemplo de texto blanco: */}
          <h1 className="text-4xl font-bold mb-4 text-gray-100">Encuentra tu Estancia Perfecta</h1>
          <p className="text-lg text-gray-200 mb-8"> {/* Ejemplo de color de texto más claro */}
            Busca y reserva hoteles al mejor precio en cualquier parte del mundo.
          </p>
          {/*<SearchForm />*/}
        </section>

        <FeaturedHotels />
        {/* Aquí podrías añadir otras secciones como "Destinos Populares", "Ofertas Especiales", etc. */}
      </div>
    </main>
  );
}
