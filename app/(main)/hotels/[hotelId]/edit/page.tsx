/**
 * Esta página permite a los administradores editar la información de un hotel existente.
 * Requiere que el usuario esté autenticado y tenga rol de administrador.
 */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
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
import { Toaster, toast } from "sonner";
import React, { useState, useEffect } from "react";
import { PropertyType, RoomType } from "@prisma/client"; // Importar RoomType
import { updateHotelAction, getHotelById } from "@/lib/data/hotel-actions"; // Importa la Server Action y la función para obtener datos del hotel
import {isAdmin } from "@/lib/data/user-actions"
import { getAllAmenities } from '@/lib/data/amenity-actions';
//import { useSession } from "@/lib/auth-client"; // Importa useSession para verificar la autenticación
import { Checkbox } from "@/components/ui/checkbox"; // Importa Checkbox

interface Amenity {
  id: string;
  name: string;
}

function getPropertyTypeLabel(value: PropertyType): string {
  const MAPPINGS: Record<PropertyType, string> = {
    [PropertyType.HOTEL]: "Hotel",
    [PropertyType.APARTMENT]: "Apartamento",
    [PropertyType.RESORT]: "Resort",
    [PropertyType.VILLA]: "Villa",
    [PropertyType.BOUTIQUE_HOTEL]: "Hotel Boutique",
    [PropertyType.GUEST_HOUSE]: "Casa de Huéspedes",
    [PropertyType.HOSTEL]: "Hostal",
  };
  return MAPPINGS[value] || value.replace(/_/g, ' ').replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const prismaPropertyTypeValues = Object.values(PropertyType);

if (!prismaPropertyTypeValues.length || !prismaPropertyTypeValues.every(v => typeof v === 'string')) {
  throw new Error("PropertyType enum from Prisma does not provide a valid list of string values for the form.");
}
const zodPropertyTypeEnum = prismaPropertyTypeValues as [string, ...string[]];

const PROPERTY_TYPE_OPTIONS = prismaPropertyTypeValues.map(value => ({
  value: value as PropertyType,
  label: getPropertyTypeLabel(value as PropertyType),
}));

// Generar opciones para el Select de RoomType
const prismaRoomTypeValues = Object.values(RoomType);
if (!prismaRoomTypeValues.length || !prismaRoomTypeValues.every(v => typeof v === 'string')) {
  throw new Error("RoomType enum from Prisma does not provide a valid list of string values for the form.");
}

function getRoomTypeLabel(value: RoomType): string {
  return value.replace(/_/g, ' ').replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
const ROOM_TYPE_OPTIONS = prismaRoomTypeValues.map(value => ({
  value: value as RoomType,
  label: getRoomTypeLabel(value as RoomType),
}));

const NO_SPECIFIC_PROPERTY_TYPE_VALUE = "__NONE__";

export const hotelFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  description: z.string(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  images: z.array(z.string().url()).default([]), // images should be an array of strings
  starRating: z.number().min(0).max(5).default(0),
  pricePerNightMin: z.number().nullable(),
  propertyType: z.string().nullable(),
  amenities: z.array(z.string()).default([]), // amenities should be an array of strings
  roomInventories: z
    .array(
      z.object({
        roomType: z.string(),
        count: z.number().min(0),
      })
    )
    .default([]),
});


export default function EditHotelPage() {
    
  const { hotelId } = useParams<{ hotelId: string }>();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableAmenities, setAvailableAmenities] = useState<Amenity[]>([]);
  const [initialValues, setInitialValues] = useState<z.infer<typeof hotelFormSchema> | null>(null); // Inicializar como null para evitar errores de tipo
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingPageData, setIsLoadingPageData] = useState(false); // Para cargar hotel y amenities
  // const [isLoadingAmenities, setIsLoadingAmenities] = useState(false); // isLoadingPageData puede cubrir esto

  // 1. Verificar autorización
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      try {
        const adminUser = await isAdmin();
        if (adminUser) {
          setIsAuthorized(true);
        } else {
          toast.error("Acceso denegado. Se requieren permisos de administrador.");
          router.push('/'); // Redirigir si no es admin
        }
      } catch (error) {
        console.error("Error durante la verificación de administrador:", error);
        toast.error("Error al verificar permisos. Intente más tarde.");
        router.push('/');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  // 2. Cargar datos del hotel y amenities si está autorizado y el hotelId está presente
  useEffect(() => {
    if (!isAuthorized || !hotelId || isCheckingAuth) return;

    const loadHotelAndAmenitiesData = async () => {
      setIsLoadingPageData(true);
      try {
        // setIsLoadingAmenities(true); // Indicar que las amenities están cargando
        const [hotelData, amenitiesFromDb] = await Promise.all([
          getHotelById(hotelId), // Asumimos que getHotelById devuelve roomInventories
          getAllAmenities() // Descomentado y llamado aquí
        ]);

        if (hotelData) {
          // Convertir nombres de amenities del hotel a CUIDs usando amenitiesFromDb
          let hotelAmenityCUIDs: string[] = [];
          if (hotelData.amenities && Array.isArray(hotelData.amenities) && amenitiesFromDb) {
            // Si hotelData.amenities ya son CUIDs (lo cual es más robusto si la API lo devuelve así)
            // hotelAmenityCUIDs = hotelData.amenities;
            // Si son nombres y necesitas convertirlos:
             hotelAmenityCUIDs = hotelData.amenities.map((amenityInput: string | { id: string, name: string }) => {
              // Asumimos que getHotelById devuelve las amenities del hotel como un array de objetos {id, name} o solo los IDs.
              // Si devuelve nombres, la lógica original de buscar por nombre es necesaria.
              const amenityId = typeof amenityInput === 'string' ? amenitiesFromDb.find(dbAmenity => dbAmenity.name === amenityInput)?.id : amenityInput.id;
              return amenityId;
            }).filter(id => id !== null) as string[]; // Filtrar nulos y asegurar tipo string[]
          }

          setInitialValues({
            name: hotelData.name,
            city: hotelData.city,
            country: hotelData.country,
            address: hotelData.address,
            description: hotelData.description ,
            // Convertir array de imágenes a string separada por comas para el input
            images: hotelData.images ?? [], // Ensure images remains an array of strings, default to empty array if null
            pricePerNightMin: hotelData.pricePerNightMin ,
            starRating: hotelData.starRating ,
            latitude: hotelData.latitude ,
            longitude: hotelData.longitude ,
            propertyType: hotelData.propertyType ,
            amenities: hotelAmenityCUIDs, 
            roomInventories: hotelData.roomInventories?.map(inv => ({ // Cargar inventario
              roomType: inv.roomType,
              count: inv.count,
            })) || [],
          });
        } else {
          toast.error("Hotel no encontrado.");
          // Considera redirigir a una página de listado de hoteles accesible por el admin,
          // por ejemplo, si tienes una en /admin/hotels o /hotels si es la misma.
          router.push('/hotels'); 
          setIsLoadingPageData(false);
          return; // Importante salir aquí si el hotel no se encuentra
        }

        // setIsLoadingAmenities(false); // Indicar que las amenities han terminado de cargar
        setAvailableAmenities(amenitiesFromDb); // Establecer las amenities disponibles
      } catch (error) {
        console.error("Error al cargar datos para la edición del hotel:", error);
        toast.error("Error al cargar la información necesaria para editar.");
      } finally {
        setIsLoadingPageData(false);
      }
    };

    loadHotelAndAmenitiesData();
  }, [isAuthorized, hotelId, router, isCheckingAuth]); // router es dependencia de router.push

  const form = useForm<z.infer<typeof hotelFormSchema>>({
    // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
    resolver: zodResolver(hotelFormSchema),
    defaultValues: initialValues || {
      name: "",
      city: "",
      country: "",
      address: "",
      description: "",
      images: [], // Ensure images is always an array
      pricePerNightMin: null, // Use null for nullable fields
      latitude: null, // Use null for nullable fields
      longitude: null, // Use null for nullable fields
      propertyType: null, // Use null for nullable fields
      starRating: 0, // Use 0 as the default value
      amenities: [], // Ensure amenities is always an array
      roomInventories: [], // Always initialize roomInventories as an empty array
      id: undefined, // Optional field should default to undefined
    } as z.infer<typeof hotelFormSchema>, // Explicitly cast to match schema
    mode: "onChange",
  });

  const { fields: roomInventoryFields, append: appendRoomInventory, remove: removeRoomInventory } = useFieldArray({
    control: form.control,
    name: "roomInventories",
  });

  // Efecto para resetear el formulario cuando initialValues estén disponibles
  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues);
    }
  }, [initialValues, form]);

  async function onSubmit(values: z.infer<typeof hotelFormSchema>) { // formData.images es un string aquí
    console.log("Datos del formulario a enviar para actualizar:", JSON.stringify(values, null, 2));
    setIsSubmitting(true);
    try {
      // Enviar formData directamente. El backend se encargará de procesar el string de imágenes.
      const result = await updateHotelAction(hotelId, values);
      console.log("Dentro del Submit")
      if (result.success) {
        toast.success(result.message);
        // Redirigir a la lista de hoteles o a la vista del hotel editado.
        // Ajusta la ruta según tu estructura. Si la lista de hoteles principal
        // muestra los botones de admin, /hotels podría ser suficiente.
        router.push('/hotels'); 
      } else {
        toast.error(result.message);
        if (result.errors) {
          console.error("Validation errors from server action:", result.errors);
        }
      }
    } catch (error) {
      toast.error("Ocurrió un error al contactar con el servidor.");
      console.error("Error calling server action:", error);
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isCheckingAuth || (isAuthorized && isLoadingPageData && !initialValues)) {
    return <div className="container mx-auto py-10 px-4 flex justify-center"><p>Cargando...</p></div>;
  }

  // Si ya terminó de chequear y no está autorizado (ya debería haber redirigido)
  if (!isAuthorized && !isCheckingAuth) {
    return null; // O un mensaje de "No autorizado"
  }

  return (
    <>
    <Toaster richColors position="top-center" />
          <div className="container mx-auto py-10 px-4 flex justify-center">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  Editar Hotel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>{/* The Form component takes the form object returned by useForm */}
                  {/*@ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.*/}
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                    // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>{/* FormItem is a layout component for a form field */}
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
                          <FormItem>{/* FormItem is a layout component for a form field */}
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
                          <FormItem>{/* FormItem is a layout component for a form field */}
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
                        <FormItem>{/* FormItem is a layout component for a form field */}
                          <FormLabel>Descripción (Opcional)</FormLabel>
                          <FormControl><Textarea placeholder="Describe el hotel..." {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                    // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                      control={form.control} // TODO: TS error due to type incompatibility, needs investigation
                      name="images" // Corrected from 'images' to match schema
                      render={({ field }) => (
                        <FormItem>{/* FormItem is a layout component for a form field */}
                          <FormLabel>URL de la Imagen</FormLabel>
                          <FormControl><Input type="text" placeholder="Ej: /images/hotel/foto.jpg o https://..." {...field}  /></FormControl>
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
                          <FormItem>{/* FormItem is a layout component for a form field */}
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
                        <FormItem>{/* FormItem is a layout component for a form field */}
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
                          <FormItem>{/* FormItem is a layout component for a form field */}
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
                          <FormItem>{/* FormItem is a layout component for a form field */}
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
                          <FormItem>{/* FormItem is a layout component for a form field */}
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
                        <FormItem>{/* FormItem is a layout component for a form field */}
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
                          <FormMessage/>
                        </FormItem>
                      )}
                      />
    
                    <FormField
                    // @ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.
                      control={form.control}
                      name="amenities"
                      render={({ field }) => ( // 'field' aquí se refiere al array de amenities seleccionadas
                        <FormItem>{/* FormItem is a layout component for a form field */}
                          <FormLabel>Comodidades (Opcional)</FormLabel>
                          <FormDescription>
                            Selecciona las comodidades que ofrece el hotel.
                          </FormDescription>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                            {isLoadingPageData && !availableAmenities.length ? ( // Mostrar carga si isLoadingPageData y no hay amenities aún
                              <p className="text-sm text-muted-foreground col-span-full">Cargando comodidades...</p>
                            ) : availableAmenities.length > 0 ? (
                              availableAmenities.map((amenity) => (
                                <FormItem // Ya no es un FormField anidado
                                  key={amenity.id} // Each amenity should have a unique key
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      // field.value es el array de CUIDs de las amenities seleccionadas
                                      checked={field.value?.includes(amenity.id)}
                                      onCheckedChange={(checked) => {
                                        console.log("Amenity ID being toggled:", amenity.id);
                                        console.log("Is it a CUID (Zod check)?", z.string().cuid().safeParse(amenity.id).success);
                                        const currentValue = field.value || [];
                                        const newValue = checked
                                          ? [...currentValue, amenity.id]
                                          : currentValue.filter((id: string) => id !== amenity.id);
                                        console.log("Current amenities in form state:", currentValue);
                                        console.log("New amenities array for form state:", newValue);
                                        // Verificar si todos los elementos en newValue son CUIDs válidos según Zod
                                        const allElementsInNewValueAreCUIDs = newValue.every(id => z.string().cuid().safeParse(id).success);
                                        console.log("Are all elements in new array CUIDs (Zod check)?", allElementsInNewValueAreCUIDs);
                                        // field.onChange actualiza el valor del array 'amenities' en el formulario
                                        field.onChange(newValue);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{amenity.name}</FormLabel>
                                </FormItem>
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
                            // @ts-ignore
                              control={form.control}
                              name={`roomInventories.${index}.roomType`}
                              render={({ field }) => (
                                <FormItem className="flex-grow">{/* FormItem is a layout component for a form field */}
                                  <FormLabel>Tipo de Habitación</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecciona tipo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {ROOM_TYPE_OPTIONS.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
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
                                <FormItem>{/* FormItem is a layout component for a form field */}
                                  <FormLabel>Cantidad</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0" placeholder="Ej: 10" {...field} value={field.value ?? ''} />
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
                          onClick={() => appendRoomInventory({ roomType: ROOM_TYPE_OPTIONS[0]?.value || '', count: 0 })}
                        >
                          Añadir Inventario de Habitación
                        </Button>
                        {/*@ts-expect-error: El tipo de `control` no coincide exactamente con lo esperado, pero es funcional en este contexto.*/}
                        <FormField name="roomInventories" control={form.control} render={({ fieldState }) => <FormMessage>{fieldState.error?.message || fieldState.error?.root?.message}</FormMessage>} />{/* Display any form level errors */}
                      </CardContent>
                    </Card>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando Cambios..." : "Guardar Cambios"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
    )
}