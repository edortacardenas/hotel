"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner"; // Toaster se asume que está en el layout principal
import React, { useState, useEffect } from "react"; // Import useEffect
import {PropertyType} from "@prisma/client"; // Asegúrate de que este tipo esté definido en tu proyecto
// Importa la función para obtener amenities y el tipo Amenity si es necesario (si no está ya global)
import { createHotelAction } from "@/lib/data/hotel-actions"; // Importa la Server Action
import { getAllAmenities } from '@/lib/data/amenity-actions'; // Ajusta la ruta si es necesario

// Definición del tipo para las amenities
import { RoomType } from "@prisma/client"; // Importar RoomType para el inventario
interface Amenity {
  id: string; // CUID o identificador único
  name: string;
}

// Utilizar el enum PropertyType importado de Prisma

// Función para generar etiquetas legibles para la UI a partir de los valores del enum PropertyType
function getPropertyTypeLabel(value: PropertyType): string {
  // Mapeo explícito para un control preciso de las etiquetas.
  // Asegúrate de que todos los miembros de tu enum PropertyType de Prisma estén aquí.
  const MAPPINGS: Record<PropertyType, string> = {
    [PropertyType.HOTEL]: "Hotel",
    [PropertyType.APARTMENT]: "Apartamento",
    [PropertyType.RESORT]: "Resort",
    [PropertyType.VILLA]: "Villa",
    [PropertyType.BOUTIQUE_HOTEL]: "Hotel Boutique",
    [PropertyType.GUEST_HOUSE]: "Casa de Huéspedes",
    [PropertyType.HOSTEL]: "Hostal",
    // Ejemplo: si tuvieras PropertyType.OTHER en Prisma:
    // [PropertyType.OTHER]: "Otro Tipo",
  };
  return MAPPINGS[value] || value.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()); // Fallback: convierte SNAKE_CASE a Title Case
}

// Obtener los valores del enum de Prisma para Zod y para generar las opciones del Select.
// Esto asume que PropertyType de Prisma es un enum de string (ej. enum PropertyType { HOTEL = "HOTEL", ... })
// o un objeto const (ej. const PropertyType = { HOTEL: "HOTEL", ... } as const;).
const prismaPropertyTypeValues = Object.values(PropertyType);

// Asegurarse de que los valores sean adecuados para z.enum (array no vacío de strings)
if (!prismaPropertyTypeValues.length || !prismaPropertyTypeValues.every(v => typeof v === 'string')) {
  throw new Error("PropertyType enum from Prisma does not provide a valid list of string values for the form.");
}
const zodPropertyTypeEnum = prismaPropertyTypeValues as [string, ...string[]];

// Generar las opciones para el Select dinámicamente desde el enum de Prisma
const PROPERTY_TYPE_OPTIONS = prismaPropertyTypeValues.map(value => ({
  value: value as PropertyType, // value es un string del enum de Prisma
  label: getPropertyTypeLabel(value as PropertyType), // label es la etiqueta legible
}));

// Generar opciones para el Select de RoomType
const prismaRoomTypeValues = Object.values(RoomType);
if (!prismaRoomTypeValues.length || !prismaRoomTypeValues.every(v => typeof v === 'string')) {
  throw new Error("RoomType enum from Prisma does not provide a valid list of string values for the form.");
}
const zodRoomTypeEnum = prismaRoomTypeValues as [string, ...string[]];

function getRoomTypeLabel(value: RoomType): string {
  return value.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const ROOM_TYPE_OPTIONS = prismaRoomTypeValues.map(value => ({
  value: value as RoomType,
  label: getRoomTypeLabel(value as RoomType),
}));


// Valor especial para la opción "no especificar" en el Select, para evitar el error de cadena vacía.
const NO_SPECIFIC_PROPERTY_TYPE_VALUE = "__NONE__";

const hotelFormSchema = z.object({
  name: z.string().min(3, {
    message: "El nombre del hotel debe tener al menos 3 caracteres.",
  }),
  city: z.string().min(2, {
    message: "La ciudad debe tener al menos 2 caracteres.",
  }),
  country: z.string().min(2, {
    message: "El país debe tener al menos 2 caracteres.",
  }),
  address: z.string().min(5, {
    message: "La dirección debe tener al menos 5 caracteres.",
  }),
  description: z.string().optional(),
  images: z // For a single primary image URL
    .string() // Ya no valida como URL completa, permite rutas relativas
    .optional() // Permite que el campo sea undefined
    .or(z.literal('')), // Permite que el campo sea una cadena vacía
  pricePerNightMin: z.preprocess( // Renombrado de pricePerNight a pricePerNightMin
    (val) => {
      if (val === "" || val === null || typeof val === "undefined") return undefined;
      const num = parseFloat(String(val));
      return isNaN(num) ? val : num;
    },
    z.number({ invalid_type_error: "El precio debe ser un número válido o estar vacío." })
      .positive({ message: "El precio por noche debe ser un número positivo." })
      .optional()
  ),
  starRating: z.preprocess( // Preprocess para manejar strings vacíos o entradas no numéricas
    (val) => {
      // Normaliza string vacío, null, o undefined a 'undefined'
      if (val === "" || val === null || typeof val === "undefined") {
        return undefined;
      }
      // Intenta parsear otros valores como números. parseFloat devuelve NaN para no números.
      return parseFloat(String(val)); // Este valor (number, NaN, o undefined) va al siguiente esquema
    },
    // Este esquema valida el valor preprocesado.
    z.number({ invalid_type_error: "El rating debe ser un número válido o estar vacío." })
      .int({ message: "El rating debe ser un número entero entre 0 y 5." })
      .min(0, { message: "El rating debe ser como mínimo 0." })
      .max(5, { message: "El rating debe ser como máximo 5." })
      .optional() // Permite que 'undefined' (del preprocess) pase la validación.
  ),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  propertyType: z.preprocess(
    (val) => (val === "" || val === NO_SPECIFIC_PROPERTY_TYPE_VALUE ? undefined : val), // Transforma "" o el valor especial a undefined
    z.enum(zodPropertyTypeEnum).optional() // Valida contra los tipos de propiedad definidos desde Prisma
  ),
  amenities: z.array(z.string().cuid("Cada amenity debe ser un CUID válido.")).optional().default([]),
  roomInventories: z.array(
    z.object({
      roomType: z.enum(zodRoomTypeEnum, { required_error: "Debe seleccionar un tipo de habitación." }),
      count: z.coerce.number().int().min(0, "La cantidad debe ser 0 o mayor."),
    })
  )
  .optional()
  .default([])
  .superRefine((inventories, ctx) => { // Usamos superRefine para validaciones a nivel de array
    if (inventories && inventories.length > 1) {
      const roomTypes = new Set();
      inventories.forEach((inventory, index) => {
        if (roomTypes.has(inventory.roomType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `El tipo de habitación '${getRoomTypeLabel(inventory.roomType as RoomType)}' está duplicado. Cada tipo de habitación solo puede aparecer una vez.`,
            path: [`roomInventories`, index, 'roomType'], // Apunta al campo específico del roomType duplicado
          });
        }
        roomTypes.add(inventory.roomType);
      });
    }
  }),
});

type HotelFormData = z.infer<typeof hotelFormSchema>;

export default function AddHotelPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [availableAmenities, setAvailableAmenities] = useState<Amenity[]>([]);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(true);

  const form = useForm<HotelFormData>({
    // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
    resolver: zodResolver(hotelFormSchema),
    defaultValues: {
      name: "",
      city: "",
      country: "",
      address: "",
      description: undefined,
      images: undefined,
      pricePerNightMin: undefined,
      starRating: undefined,
      latitude: undefined,
      longitude: undefined,
      propertyType: undefined,
      amenities: [],
      roomInventories: [], // Inicializar como array vacío
    },
  });

  useEffect(() => {
    async function fetchAmenities() {
      setIsLoadingAmenities(true);
      try {
        const amenitiesFromDb = await getAllAmenities();
        setAvailableAmenities(amenitiesFromDb);
      } catch (error) {
        console.error("Failed to load amenities:", error);
        toast.error("Error al cargar las comodidades.");
        setAvailableAmenities([]); // O manejar el error de otra forma
      }
      setIsLoadingAmenities(false);
    }
    fetchAmenities();
  }, []);

  const { fields: roomInventoryFields, append: appendRoomInventory, remove: removeRoomInventory } = useFieldArray({
    control: form.control,
    name: "roomInventories",
  });

  async function onSubmit(data: HotelFormData) {
    console.log("Datos del formulario antes de enviar:", JSON.stringify(data, null, 2));
    setIsLoading(true);
    console.log("Datos a enviar a la Server Action:", JSON.stringify(data, null, 2));

    try {
      // Llama a la Server Action directamente
      const result = await createHotelAction(data);

      if (result.success) {
        toast.success(result.message);
        form.reset(); // Limpiar el formulario después de un envío exitoso
      } else {
        // Mostrar errores de validación o errores generales
        let toastErrorMessage = result.message; // Usar el mensaje del servidor por defecto
        if (result.errors) {
          // Opcionalmente, podrías mapear estos errores a los campos del formulario
          // con form.setError si la estructura de errores lo permite.
          console.error("Validation errors from server action:", result.errors);
          // Si el servidor devuelve errores específicos, el toast puede ser más general
          // para guiar al usuario a revisar los campos del formulario.
          toastErrorMessage = "Por favor, corrija los errores indicados en el formulario.";
        }
        toast.error(toastErrorMessage);
      }
    } catch (error) {
      toast.error("Ocurrió un error al contactar con el servidor.");
      console.error("Error calling server action:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="container mx-auto py-10 px-4 flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Agregar Nuevo Hotel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              {/*@ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.*/}
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                 control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Hotel</FormLabel>
                      <FormControl><Input placeholder="Ej: Hotel Paraíso" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                  // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                   control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl><Input placeholder="Ej: Cancún" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                  // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                   control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>País</FormLabel>
                        <FormControl><Input placeholder="Ej: México" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                 control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl><Textarea placeholder="Describe el hotel..." {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                 control={form.control}
                  name="images" // Corrected from 'images' to match schema
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de la Imagen </FormLabel>
                      <FormControl><Input type="text" placeholder="Ej: /images/hotel/foto.jpg o https://..." {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                  // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                   control={form.control}
                    name="pricePerNightMin" // Nombre corregido
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio por Noche </FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="Ej: 150.00" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                  // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                 control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl><Input placeholder="Ej: Av. Siempreviva 742" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                   control={form.control}
                    name="starRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating (0-5, Opcional)</FormLabel>
                        <FormControl><Input type="number" step="1" min="0" max="5" placeholder="Ej: 4" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                  // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                   control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitud (Opcional)</FormLabel>
                        <FormControl><Input type="number" step="any" placeholder="Ej: 21.1619" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                  // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                   control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitud (Opcional)</FormLabel>
                        <FormControl><Input type="number" step="any" placeholder="Ej: -86.8515" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                 control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Propiedad</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""} // Usa string vacío si field.value es undefined para el Select
                        // defaultValue={field.value ?? ""} // No es estrictamente necesario si 'value' está controlado
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo de propiedad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Opción para permitir "no seleccionado" que se mapeará a undefined por Zod */}
                          <SelectItem value={NO_SPECIFIC_PROPERTY_TYPE_VALUE}>-- No especificar --</SelectItem>
                          {PROPERTY_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Elige el tipo de propiedad (opcional).</FormDescription>
                      <FormMessage/>
                    </FormItem>
                  )}
                  />

                <FormField
                // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                 control={form.control}
                  name="amenities"
                  render={() => ( // No usamos 'field' directamente aquí porque manejamos un array de checkboxes
                    <FormItem>
                      <FormLabel>Comodidades (Opcional)</FormLabel>
                      <FormDescription>
                        Selecciona las comodidades que ofrece el hotel.
                      </FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                        {isLoadingAmenities ? (
                          <p className="text-sm text-muted-foreground col-span-full">Cargando comodidades...</p>
                        ) : availableAmenities.length > 0 ? (
                          availableAmenities.map((amenity) => (
                            <FormField
                              key={amenity.id}
                              // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                              control={form.control}
                              name="amenities" // Referencia al campo 'amenities' del formulario
                              render={({ field }) => { // 'field' aquí es el array de CUIDs seleccionados
                                return (
                                  <FormItem
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(amenity.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          return checked
                                            ? field.onChange([...currentValue, amenity.id])
                                            : field.onChange(currentValue.filter((id: string) => id !== amenity.id));
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{amenity.name}</FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))) : (<p className="text-sm text-muted-foreground col-span-full">No hay comodidades predefinidas.</p>)}
                      </div>
                      <FormMessage /> {/* Muestra mensajes de error para el campo 'amenities' si los hay */}
                    </FormItem>
                  )}
                />

                {/* Sección para Inventario de Habitaciones */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Inventario de Habitaciones</CardTitle>
                    <FormDescription>
                      Define la cantidad de habitaciones para cada tipo que tendrá el hotel.
                    </FormDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {roomInventoryFields.map((item, index) => (
                      <div key={item.id} className="flex items-end space-x-2 border p-3 rounded-md">
                        <FormField
                        // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                          control={form.control}
                          name={`roomInventories.${index}.roomType`}
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormLabel>Tipo de Habitación {index + 1}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ROOM_TYPE_OPTIONS.filter(option => {
                                    // Permitir el tipo de habitación actualmente seleccionado para este campo específico
                                    if (option.value === field.value) {
                                      return true;
                                    }
                                    // Ocultar tipos de habitación ya seleccionados en *otros* campos de inventario
                                    const selectedRoomTypesInForm = form.getValues('roomInventories')
                                      .map(inv => inv.roomType)
                                      .filter((rt, i) => i !== index); // Excluir el valor del campo actual de esta comprobación
                                    return !selectedRoomTypesInForm.includes(option.value);
                                  }).map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                        // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                          control={form.control}
                          name={`roomInventories.${index}.count`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cantidad</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" placeholder="Ej: 10" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeRoomInventory(index)}>
                          Eliminar
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        (form.getValues('roomInventories')?.filter(inv => inv.roomType && inv.roomType !== '').length || 0) >= ROOM_TYPE_OPTIONS.length
                      }
                      onClick={() => {
                        const currentInventories = form.getValues('roomInventories') || [];
                        const usedRoomTypes = new Set(
                          currentInventories.map(inv => inv.roomType).filter(rt => rt && rt !== '') // Considera solo tipos válidos ya seleccionados
                        );
                        const firstAvailableType = ROOM_TYPE_OPTIONS.find(option => !usedRoomTypes.has(option.value));
                        
                        appendRoomInventory({ roomType: firstAvailableType ? firstAvailableType.value : '', count: 0 });
                      }}
                    >
                      Añadir Inventario de Habitación
                    </Button>
                    {/*@ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.*/}
                    <FormField name="roomInventories" control={form.control} render={({ fieldState }) => <FormMessage>{fieldState.error?.message || fieldState.error?.root?.message}</FormMessage>} />
                  </CardContent>
                </Card>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Agregando..." : "Agregar Hotel"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}