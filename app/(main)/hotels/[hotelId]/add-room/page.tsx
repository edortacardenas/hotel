"use client";

import { useState, useEffect, useActionState } from 'react'; // Importar useActionState de react
import { useFormStatus } from 'react-dom'; // useFormStatus sigue siendo de react-dom
import { addRoomAction, AddRoomActionState } from '@/lib/data/hotel-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react'; 
import { useParams, useRouter} from "next/navigation";
import { getAllRoomAmenities } from '@/lib/data/amenity-actions';
import { getRoomTypes, FormattedRoomType } from '@/lib/data/room-type-actions';
import { Amenity, RoomType } from '@prisma/client'; // Importar tipo Amenity y RoomType
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Asumimos que HotelFullDetails y su RoomInventory se actualizan para incluir existingRooms.
// Ejemplo de la estructura esperada en el archivo donde defines HotelFullDetails (ej. hotel-actions.ts):
// export interface HotelRoomInventory {
//   roomType: RoomType;
//   count: number; // Límite total (inventario definido)
//   existingRooms: number; // Número de habitaciones de este tipo que ya existen
// }
import { getHotelById, HotelFullDetails} from '@/lib/data/hotel-actions';
import { ROOM_CONFIG } from '@/constants/room-constants'; // Ajusta la ruta según donde hayas definido ROOM_CONFIG

interface RoomFormData {
  hotelId: string;
  type: string;
  description?: string;
  pricePerNight: string; // Se enviará como string, Zod lo coercerá
  capacity: string;      // Se enviará como string, Zod lo coercerá
  beds: string;          // Se enviará como string, Zod lo coercerá
  count: string;         // Cantidad de habitaciones de este tipo a crear, Zod lo coercerá
  images: string;        // Comma-separated string
  amenities: string[];     // Array de nombres/IDs de amenities
  // Un id temporal para el manejo en el cliente, no se envía al backend
  clientId?: string;
}

const initialState: AddRoomActionState = {
  message: '',
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? 'Agregando Habitaciones...' : 'Confirmar y Agregar Habitaciones'}
    </Button>
  );
}

export default function AddRoomsPage() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const [state, formAction] = useActionState(addRoomAction, initialState);
  
  const [availableAmenities, setAvailableAmenities] = useState<Amenity[]>([]);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(true);
  const [availableRoomTypes, setAvailableRoomTypes] = useState<FormattedRoomType[]>([]);
  const [isLoadingRoomTypes, setIsLoadingRoomTypes] = useState(true);
  const [hotelMaxPrice, setHotelMaxPrice] = useState<number | null>(null); // Ej: 200
  const [currentHotelDetails, setCurrentHotelDetails] = useState<HotelFullDetails | null>(null);

  const [rooms, setRooms] = useState<RoomFormData[]>([
    {
        hotelId,
        type: '',
        pricePerNight: '',
        capacity: '',
        beds: '',
        count: '1', // Por defecto, se crea 1 habitación de este tipo
        images: '',
        amenities: [],
        clientId: crypto.randomUUID(),
      },
    ]);

    const router = useRouter();
  
  useEffect(() => {
    async function fetchData() {
      setIsLoadingAmenities(true); // Para amenities
      setIsLoadingRoomTypes(true); // Para tipos de habitación
      try {
        const amenitiesData = await getAllRoomAmenities();
        setAvailableAmenities(amenitiesData);

        const roomTypesData = await getRoomTypes();
        setAvailableRoomTypes(roomTypesData);

        const hotelData = await getHotelById(hotelId);
        setCurrentHotelDetails(hotelData); // Guardar todos los detalles del hotel
        if (hotelData && typeof hotelData.pricePerNightMin === 'number') {
          setHotelMaxPrice(hotelData.pricePerNightMin);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        // Considera mostrar mensajes de error al usuario aquí
      } finally {
        setIsLoadingRoomTypes(false);
        setIsLoadingAmenities(false);
      }
    }
    fetchData();
  }, [hotelId]);

  const handleAddRoomEntry = () => {
    // Obtener los tipos ya usados en el formulario actual
    const usedTypesInCurrentForm = new Set(rooms.map(r => r.type).filter(Boolean));
    // Obtener los tipos que están disponibles según el inventario del hotel
    const hotelInventoryAvailableTypes = getFilteredRoomTypesForSelect();
    // Encontrar el primer tipo disponible que no esté ya en el formulario
    const firstAvailableTypeForNewEntry = hotelInventoryAvailableTypes.find(
      option => !usedTypesInCurrentForm.has(option.value)
    );

    let newRoomCapacity = '';
    let newRoomBeds = '';

    if (firstAvailableTypeForNewEntry && ROOM_CONFIG[firstAvailableTypeForNewEntry.value as RoomType]) {
      newRoomCapacity = ROOM_CONFIG[firstAvailableTypeForNewEntry.value as RoomType].personCapacity.toString();
      newRoomBeds = ROOM_CONFIG[firstAvailableTypeForNewEntry.value as RoomType].bedCount.toString();
    }

    setRooms([
      ...rooms,
      {
        hotelId,
        type: firstAvailableTypeForNewEntry ? firstAvailableTypeForNewEntry.value : '',
        pricePerNight: '',
        capacity: newRoomCapacity,
        beds: newRoomBeds,
        count: '1',
        images: '',
        amenities: [],
        clientId: crypto.randomUUID(),
      },
    ]);
  };

  const handleRemoveRoomEntry = (clientIdToRemove?: string) => {
    if (!clientIdToRemove) return;
    setRooms(rooms.filter((room) => room.clientId !== clientIdToRemove));
  };

  const handleRoomInputChange = (
    clientId: string | undefined,
    field: keyof Omit<RoomFormData, 'hotelId' | 'clientId'>,
    value: string | string[] // Puede ser string para la mayoría, o string[] para amenities
  ) => {
    if (!clientId) return;
    setRooms(
      rooms.map((room) => {
        if (room.clientId === clientId) {
          let updatedRoom = { ...room };

          if (field === 'type') {
            updatedRoom.type = value as string; // Actualizar el tipo primero
            const selectedRoomType = value as RoomType; // Castear a RoomType

            // Autocompletar capacidad y camas desde ROOM_CONFIG
            if (ROOM_CONFIG[selectedRoomType]) {
              updatedRoom.capacity = ROOM_CONFIG[selectedRoomType].personCapacity.toString();
              updatedRoom.beds = ROOM_CONFIG[selectedRoomType].bedCount.toString();
            }

            // Si tenemos detalles del hotel y su inventario, actualizamos el count
            if (currentHotelDetails && currentHotelDetails.roomInventories) {
              const inventoryEntry = currentHotelDetails.roomInventories.find(
                (inv) => inv.roomType === selectedRoomType
              );
              // Actualizar 'count' con las habitaciones disponibles para agregar
              if (inventoryEntry && typeof inventoryEntry.existingRooms === 'number') {
                const availableToAdd = inventoryEntry.count - inventoryEntry.existingRooms;
                // Asegurarse de que no sea negativo y al menos 1 si hay disponibles.
                // Si availableToAdd es 0, el tipo no debería aparecer en el select debido al filtrado.
                // Pero por si acaso, o si se quiere permitir agregar 0 (aunque no tendría sentido aquí).
                updatedRoom.count = Math.max(0, availableToAdd).toString();
              } else {
                updatedRoom.count = '1'; // Fallback si no hay info de inventario detallada
              }
            }
          } else {
            // Para otros campos, actualizar directamente
            updatedRoom = { ...room, [field]: value };
          }
          // Validación de precio
          if (field === 'pricePerNight' && hotelMaxPrice !== null) {
            if (parseFloat(value as string) > hotelMaxPrice) {
              // Aquí podrías mostrar un error específico para este campo o manejarlo globalmente
              console.warn(`El precio de la habitación ${parseFloat(value as string)} excede el precio máximo del hotel ${hotelMaxPrice}`);
              // Opcional: resetear al precio máximo o no permitir el cambio.
              // updatedRoom.pricePerNight = hotelMaxPrice.toString(); 
            }
          }
          return updatedRoom;
        }
        return room;
      })
    );
  };


  // Limpiar el formulario si la acción fue exitosa
  useEffect(() => {
    const hasNoErrors = !state.errors || 
                        (Array.isArray(state.errors) && state.errors.length === 0) ||
                        (typeof state.errors === 'object' && Object.keys(state.errors).length === 0);
    if (state.success && hasNoErrors) {
      setRooms([
        {
          hotelId,
          type: '',
          pricePerNight: '',
          capacity: '',
          beds: '',
          count: '1', // Por defecto, se crea 1 habitación de este tipo
          images: '',
          amenities: [],
          clientId: crypto.randomUUID(),
        },
      ]);
      router.refresh(); // Indica a Next.js que actualice los datos del servidor y la página.

      // Vuelve a cargar explícitamente los detalles del hotel para actualizar el estado local
      // y así refrescar las opciones del select de tipo de habitación.
      async function refreshHotelDetailsForClient() {
        setIsLoadingRoomTypes(true); // Opcional: mostrar indicador de carga
        try {
          const hotelData = await getHotelById(hotelId);
          setCurrentHotelDetails(hotelData);
          if (hotelData && typeof hotelData.pricePerNightMin === 'number') {
            setHotelMaxPrice(hotelData.pricePerNightMin);
          }
        } catch (error) {
          console.error("Error re-fetching hotel details after submission:", error);
        } finally {
          setIsLoadingRoomTypes(false); // Opcional: ocultar indicador de carga
        }
      }
      refreshHotelDetailsForClient();
    }
  }, [state.success, state.errors, hotelId, router]); // router ya estaba como dependencia

  // Función para obtener los tipos de habitación filtrados.
  // Se quitan los tipos de habitación cuyas capacidades ya están llenas en el hotel.
  const getFilteredRoomTypesForSelect = () => {
    // No filtrar si los datos necesarios (detalles del hotel, su inventario, o los tipos base)
    // aún no están disponibles o están vacíos.
    if (!currentHotelDetails || !currentHotelDetails.roomInventories || availableRoomTypes.length === 0) {
      return availableRoomTypes;
    }

    return availableRoomTypes.filter(roomTypeOption => {
      // Encontrar la información de inventario para el tipo de habitación actual.
      const inventoryInfo = currentHotelDetails.roomInventories?.find(
        inv => inv.roomType === roomTypeOption.value // roomTypeOption.value es el RoomType (string/enum)
      );

      if (!inventoryInfo) {
        // Si este tipo de habitación no tiene una entrada de inventario definida en el hotel,
        // no se puede seleccionar (basado en la lógica de "inventario definido" del mensaje de error).
        return false;
      }

      // Asumimos que `inventoryInfo` tiene `count` (límite) y `existingRooms`.
      // La propiedad `existingRooms` DEBE ser proporcionada por el backend en HotelFullDetails.
      const limit = inventoryInfo.count;
      const existing = inventoryInfo.existingRooms; // <--- Esta es la propiedad clave para el filtrado.

      // Mostrar el tipo solo si el número de habitaciones existentes es estrictamente menor que el límite.
      // Si falta `existingRooms` o `limit` (no son números), se muestra el tipo por defecto (true) para no bloquear al usuario;
      // la validación del backend lo manejará en última instancia.
      return typeof existing === 'number' && typeof limit === 'number' ? existing < limit : true;
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Agregar Habitaciones al Hotel (ID: {hotelId})</h1>

      {state.message && (
        <p className={`mb-4 p-3 rounded ${state.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {state.message}
        </p>
      )}
      {state.errors && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
          <p className="font-semibold">Por favor corrige los siguientes errores:</p>
          {/* Asumiendo que state.errors es un objeto con errores por campo o un array de mensajes */}
          {typeof state.errors === 'string' ? (
            <p>{state.errors}</p>
          ) : Array.isArray(state.errors) ? (
            <ul className="list-disc list-inside mt-2">
              {state.errors.map((errorItem, idx) => (
                <li key={idx}>
                  {errorItem.message || JSON.stringify(errorItem)}
                  {/* Si errorItem.errors (el objeto interno) tuviera detalles, podrías mostrarlos aquí */}
                </li>
              ))}
            </ul>
          ) : (
            <pre>{JSON.stringify(state.errors, null, 2)}</pre>
          )}
        </div>
      )}

      <form
        action={(formData: FormData) => {
          const roomsPayload = JSON.parse(formData.get('roomsPayload') as string);
          formAction(roomsPayload);
        }}
        className="space-y-8"
      >
        <input
          type="hidden"
          name="roomsPayload"
          // Preparamos el payload para la server action.
          // `amenities` se une como string para simplificar, y `clientId` (usado solo en frontend) se omite.
          value={JSON.stringify(
            rooms.map(({ amenities, ...rest }) => ({
              ...rest,
              amenities: amenities.join(','),
            })))}
        />
        {rooms.map((room, index) => (
          <div key={room.clientId} className="p-6 border rounded-lg shadow space-y-4 relative">
            <h2 className="text-xl font-semibold">Lote de Habitaciones {index + 1}</h2>
            {rooms.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                onClick={() => handleRemoveRoomEntry(room.clientId)}
              >
                <Trash2 size={18} />
              </Button>
            )}
            {/* Los campos individuales ya no son estrictamente necesarios si todo va en roomsPayload,
                pero no hacen daño y podrían ser útiles para una validación del lado del cliente más granular
                o si cambias la estrategia de envío de datos en el futuro. */}
            <div>
              <Label htmlFor={`type-${index}`}>Tipo de Habitación</Label>
              {isLoadingRoomTypes ? (
                <div className="flex items-center space-x-2 mt-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando tipos de habitación...</span>
                </div>
              ) : (() => {
                  // 1. Obtener tipos disponibles según el inventario del hotel
                  const hotelInventoryFilteredTypes = getFilteredRoomTypesForSelect();

                  // 2. Filtrar adicionalmente para excluir tipos ya usados en OTROS lotes del formulario actual
                  const formFilteredTypes = hotelInventoryFilteredTypes.filter(option => {
                    // Permitir el tipo de habitación actualmente seleccionado para ESTE lote
                    if (option.value === room.type) {
                      return true;
                    }
                    // Ocultar tipos de habitación ya seleccionados en *otros* lotes del formulario
                    const selectedInOtherFormEntries = rooms
                      .filter(r => r.clientId !== room.clientId) // Excluir el lote actual
                      .map(r => r.type);
                    return !selectedInOtherFormEntries.includes(option.value);
                  });
                  return (
                    <Select
                      name={`rooms[${index}][type]`}
                      value={room.type}
                      onValueChange={(value) => handleRoomInputChange(room.clientId, 'type', value)}
                      required
                    >
                      <SelectTrigger id={`type-${index}`}>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {formFilteredTypes.length > 0 ? (
                          formFilteredTypes.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)
                        ) : (
                          <SelectItem value="no-options" disabled>No hay tipos disponibles o están llenos.</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  );
                })()}
              
            </div>
            <div>
              <Label htmlFor={`description-${index}`}>Descripción</Label>
              <Textarea id={`description-${index}`} name={`rooms[${index}][description]`} value={room.description || ''} onChange={(e) => handleRoomInputChange(room.clientId, 'description', e.target.value)} />
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor={`count-${index}`}>Cantidad de estas Habitaciones</Label>
                <Input type="number" id={`count-${index}`} name={`rooms[${index}][count]`} value={room.count} onChange={(e) => handleRoomInputChange(room.clientId, 'count', e.target.value)} required min="1" />
              </div>
              <div>
                <Label htmlFor={`pricePerNight-${index}`}>Precio por Noche (€)</Label>
                <Input type="number" step="0.01" id={`pricePerNight-${index}`} name={`rooms[${index}][pricePerNight]`} value={room.pricePerNight} onChange={(e) => handleRoomInputChange(room.clientId, 'pricePerNight', e.target.value)} required />
                {hotelMaxPrice !== null && parseFloat(room.pricePerNight) > hotelMaxPrice && (
                  <p className="text-xs text-red-500 mt-1">
                    El precio no debe exceder {hotelMaxPrice.toFixed(2)}€ (precio base/máximo del hotel).
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor={`capacity-${index}`}>Capacidad (huéspedes)</Label>
                <Input type="number" id={`capacity-${index}`} name={`rooms[${index}][capacity]`} value={room.capacity} onChange={(e) => handleRoomInputChange(room.clientId, 'capacity', e.target.value)} required readOnly />
              </div>
              <div>
                <Label htmlFor={`beds-${index}`}>Número de Camas</Label>
                <Input type="number" id={`beds-${index}`} name={`rooms[${index}][beds]`} value={room.beds} onChange={(e) => handleRoomInputChange(room.clientId, 'beds', e.target.value)} required readOnly />
              </div>
            </div>
            <div>
              <Label htmlFor={`images-${index}`}>Imágenes (URLs separadas por coma)</Label>
              <Input id={`images-${index}`} name={`rooms[${index}][images]`} value={room.images} onChange={(e) => handleRoomInputChange(room.clientId, 'images', e.target.value)} placeholder="ej: /img1.jpg, /img2.jpg" />
            </div>
            <div>
              <Label>Comodidades</Label>
              {isLoadingAmenities ? (
                <div className="flex items-center space-x-2 mt-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando comodidades...</span>
                </div>
              ) : availableAmenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 mt-2 border p-3 rounded-md">
                  {availableAmenities.map((amenity) => (
                    <div key={amenity.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${room.clientId}-${amenity.id}`}
                        checked={room.amenities.includes(amenity.name)}
                        onCheckedChange={(checked) => {
                          const currentAmenities = room.amenities;
                          const newAmenities = checked
                            ? [...currentAmenities, amenity.name]
                            : currentAmenities.filter((a) => a !== amenity.name);
                          handleRoomInputChange(room.clientId, 'amenities', newAmenities);
                        }}
                      />
                      <Label htmlFor={`amenity-${room.clientId}-${amenity.id}`} className="font-normal text-sm">
                        {amenity.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">No hay comodidades disponibles para seleccionar. Por favor, agrégalas desde la gestión de amenities.</p>
              )}
            </div>
          </div>
        ))}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8">
          {(() => {
            const hotelInventoryAvailableTypes = getFilteredRoomTypesForSelect();
            const typesUsedInForm = new Set(rooms.map(r => r.type).filter(Boolean));
            const canAddMoreRoomTypes = hotelInventoryAvailableTypes.some(option => !typesUsedInForm.has(option.value));
            
            return (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddRoomEntry} 
                className="w-full md:w-auto"
                disabled={!canAddMoreRoomTypes && hotelInventoryAvailableTypes.length > 0 && rooms.length >= hotelInventoryAvailableTypes.length}>
                <PlusCircle size={18} className="mr-2" /> Agregar Otro Lote de Habitaciones
              </Button>
            );
          })()}
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}