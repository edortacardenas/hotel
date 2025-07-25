'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { X, Filter as FilterIcon } from 'lucide-react';

export interface Filters {
  priceRange: [number, number];
  starRatings: number[];
  amenities: string[];
  propertyTypes: string[];
}

interface FilterSidebarProps {
  // Estas serían las opciones disponibles obtenidas de los resultados de búsqueda o una fuente de datos
  availableAmenities?: string[];
  availablePropertyTypes?: string[];
  maxPrice?: number;
  onFilterChange: (filters: Filters) => void;
  initialFilters?: Partial<Filters>;
}

const DEFAULT_MAX_PRICE = 1000;
const STAR_OPTIONS = [5, 4, 3, 2, 1];

export default function FilterSidebar({
  availableAmenities = ['WiFi Gratis', 'Piscina', 'Parking', 'Gimnasio', 'Restaurante', 'Admite Mascotas', 'Desayuno Incluido', 'Transporte al Aeropuerto', 'Spa', 'Bar', 'Aire Acondicionado', 'Servicio de Habitaciones', 'Lavandería', 'Centro de Negocios', 'Recepción 24 Horas', 'Servicio de Limpieza Diaria'],
  availablePropertyTypes = ['Hotel', 'Apartamento', 'Resort', 'Hostal', 'Villa'],
  maxPrice = DEFAULT_MAX_PRICE,
  onFilterChange,
  initialFilters,
}: FilterSidebarProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>(initialFilters?.priceRange || [0, maxPrice]);
  const [selectedStarRatings, setSelectedStarRatings] = useState<number[]>(initialFilters?.starRatings || []);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialFilters?.amenities || []);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(initialFilters?.propertyTypes || []);

  // Efecto para manejar cambios en la prop `maxPrice` o `initialFilters.priceRange`
  useEffect(() => {
    const currentMax = maxPrice ?? DEFAULT_MAX_PRICE;
    setPriceRange(prevRange => {
      // Si se proporcionó initialFilters.priceRange, el estado inicial ya lo maneja.
      // Este efecto se encarga principalmente de ajustar si maxPrice cambia o de asegurar la consistencia.
      // Lógica original: si maxPrice cambió Y no se estableció un filtro de precio inicial, actualizar el límite superior a maxPrice.
      if (!initialFilters?.priceRange && prevRange[1] !== currentMax) {
        // Si no hubo filtros de rango de precio iniciales, y el límite superior actual
        // no es el nuevo máximo, ajustar el límite superior al nuevo máximo.
        // También asegurar que el límite inferior no sea mayor que el nuevo límite superior.
        return [Math.min(prevRange[0], currentMax), currentMax];
      }
      // De lo contrario, simplemente asegurar que el rango existente esté dentro del nuevo maxPrice.
      return [Math.min(prevRange[0], currentMax), Math.min(prevRange[1], currentMax)];
    });
  }, [maxPrice, initialFilters?.priceRange]); // Se eliminó priceRange de las dependencias

  const handleStarRatingChange = (rating: number) => {
    setSelectedStarRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
  };

  const handleAmenityChange = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handlePropertyTypeChange = (type: string) => {
    setSelectedPropertyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const applyFilters = () => {
    onFilterChange({
      priceRange,
      starRatings: selectedStarRatings,
      amenities: selectedAmenities,
      propertyTypes: selectedPropertyTypes,
    });
  };

  const clearFilters = () => {
    setPriceRange([0, maxPrice]);
    setSelectedStarRatings([]);
    setSelectedAmenities([]);
    setSelectedPropertyTypes([]);
    onFilterChange({
      priceRange: [0, maxPrice],
      starRatings: [],
      amenities: [],
      propertyTypes: [],
    });
  };

  // Permite abrir todas las secciones del acordeón por defecto
  const defaultAccordionValues = ['price', 'rating', 'amenities', 'propertyType'];

  return (
    <div className="w-full lg:w-72 xl:w-80 space-y-6 p-4 border rounded-lg bg-card text-card-foreground">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center">
          <FilterIcon className="mr-2 h-5 w-5" />
          Filtros
        </h2>
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-sm">
          <X className="mr-1 h-4 w-4" />
          Limpiar
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full">
        {/* Filtro de Precio */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-base font-medium">Rango de Precio</AccordionTrigger>
          <AccordionContent className="pt-4 space-y-3">
            <Slider
              value={priceRange}
              onValueChange={(value) => setPriceRange(value as [number, number])}
              max={maxPrice}
              step={10}
              minStepsBetweenThumbs={10}
              className="my-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Filtro de Calificación por Estrellas */}
        <AccordionItem value="rating">
          <AccordionTrigger className="text-base font-medium">Calificación</AccordionTrigger>
          <AccordionContent className="pt-2 space-y-2">
            {STAR_OPTIONS.map((stars) => (
              <div key={stars} className="flex items-center space-x-2">
                <Checkbox
                  id={`star-${stars}`}
                  checked={selectedStarRatings.includes(stars)}
                  onCheckedChange={() => handleStarRatingChange(stars)}
                />
                <Label htmlFor={`star-${stars}`} className="font-normal text-sm cursor-pointer">
                  {stars} estrella{stars > 1 ? 's' : ''}
                </Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* Filtro de Comodidades */}
        {availableAmenities && availableAmenities.length > 0 && (
          <AccordionItem value="amenities">
            <AccordionTrigger className="text-base font-medium">Comodidades</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-2 max-h-60 overflow-y-auto">
              {availableAmenities.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity.replace(/\s+/g, '-')}`}
                    checked={selectedAmenities.includes(amenity)}
                    onCheckedChange={() => handleAmenityChange(amenity)}
                  />
                  <Label htmlFor={`amenity-${amenity.replace(/\s+/g, '-')}`} className="font-normal text-sm cursor-pointer">
                    {amenity}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Filtro de Tipo de Propiedad */}
        {availablePropertyTypes && availablePropertyTypes.length > 0 && (
          <AccordionItem value="propertyType">
            <AccordionTrigger className="text-base font-medium">Tipo de Propiedad</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-2 max-h-60 overflow-y-auto">
              {availablePropertyTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`property-${type.replace(/\s+/g, '-')}`}
                    checked={selectedPropertyTypes.includes(type)}
                    onCheckedChange={() => handlePropertyTypeChange(type)}
                  />
                  <Label htmlFor={`property-${type.replace(/\s+/g, '-')}`} className="font-normal text-sm cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <Button onClick={applyFilters} className="w-full">
        Aplicar Filtros
      </Button>
    </div>
  );
}