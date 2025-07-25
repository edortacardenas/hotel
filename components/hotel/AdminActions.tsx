"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // InputProps might not be needed directly
import { useState, FormEvent, useEffect, useCallback } from 'react';
import { addAmenity, getAllAmenities, deleteAmenity, addRoomAmenity, getAllRoomAmenities, deleteRoomAmenity } from '@/lib/data/amenity-actions'; // Importar Amenity si está exportada
import { Amenity } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, RefreshCw, Settings2, BedDouble, Plus, Users } from 'lucide-react';


interface AdminActionsProps {
  isAdmin: boolean;
}

export default function AdminActions({ isAdmin }: AdminActionsProps) {
  // Estados para Amenities Generales (Hotel)
  const [newAmenityName, setNewAmenityName] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addAmenityStatus, setAddAmenityStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isManageAmenitiesModalOpen, setIsManageAmenitiesModalOpen] = useState(false);
  const [amenitiesList, setAmenitiesList] = useState<Amenity[]>([]);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(false);
  const [fetchAmenitiesError, setFetchAmenitiesError] = useState<string | null>(null);
  const [deletingAmenityId, setDeletingAmenityId] = useState<string | null>(null);
  const [manageStatusMessage, setManageStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Estados para Amenities de Habitación
  const [newRoomAmenityName, setNewRoomAmenityName] = useState('');
  const [isSubmittingAddRoomAmenity, setIsSubmittingAddRoomAmenity] = useState(false);
  const [addRoomAmenityStatus, setAddRoomAmenityStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isManageRoomAmenitiesModalOpen, setIsManageRoomAmenitiesModalOpen] = useState(false);
  const [roomAmenitiesList, setRoomAmenitiesList] = useState<Amenity[]>([]);
  const [isLoadingRoomAmenities, setIsLoadingRoomAmenities] = useState(false);
  const [fetchRoomAmenitiesError, setFetchRoomAmenitiesError] = useState<string | null>(null);
  const [deletingRoomAmenityWithId, setDeletingRoomAmenityWithId] = useState<string | null>(null);
  const [manageRoomAmenitiesStatusMessage, setManageRoomAmenitiesStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Funciones para Amenities Generales (Hotel) ---
  const handleSubmitAmenity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newAmenityName.trim()) {
        setAddAmenityStatus({ type: 'error', message: "El nombre de la amenity (hotel) no puede estar vacío." });
      return;
    }
    setIsSubmittingAdd(true);
    setAddAmenityStatus(null);

    try {
      const newAmenity = await addAmenity(newAmenityName.trim());
      setAddAmenityStatus({ type: 'success', message: `Amenity "${newAmenity.name}" agregada exitosamente.` });
      setNewAmenityName('');
      fetchAmenities(); // Refrescar la lista de amenities en el modal actual
    } catch (err) {
      console.error("Error al agregar amenity:", err);
      setAddAmenityStatus({
        type: 'error',
        message: err instanceof Error ? err.message : "Ocurrió un error desconocido al agregar la amenity."
      });
    } finally {
        setIsSubmittingAdd(false);
    }
  };

  const fetchAmenities = useCallback(async () => {
    setIsLoadingAmenities(true);
    setFetchAmenitiesError(null);
    setManageStatusMessage(null); // Limpiar mensajes de estado anteriores
    try {
      const fetchedAmenities = await getAllAmenities();
      setAmenitiesList(fetchedAmenities.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Error al obtener amenities:", err);
      setFetchAmenitiesError(err instanceof Error ? err.message : "Ocurrió un error desconocido al cargar las amenities.");
    } finally {
      setIsLoadingAmenities(false);
    }
  }, []);

  useEffect(() => {
    if (isManageAmenitiesModalOpen) {
      fetchAmenities();
    }
  }, [isManageAmenitiesModalOpen, fetchAmenities]);

  const handleOpenManageAmenitiesModal = () => {
    setIsManageAmenitiesModalOpen(true);
    setNewAmenityName(''); // Resetear campo de nueva amenity
    setAddAmenityStatus(null); // Limpiar mensajes de estado de agregar
  };

  const handleManageDialogStateChange = (open: boolean) => {
    setIsManageAmenitiesModalOpen(open);
    if (!open) {
      // Resetear estados del formulario de agregar cuando se cierra el modal
      setNewAmenityName('');
      setAddAmenityStatus(null);
      setIsSubmittingAdd(false);
    }
  };

  const handleDeleteAmenity = async (amenityId: string) => {
    setDeletingAmenityId(amenityId);
    setManageStatusMessage(null);
    setAddAmenityStatus(null); // Limpiar también el estado de agregar por si acaso
    try {
      await deleteAmenity(amenityId);
      setManageStatusMessage({ type: 'success', message: 'Amenity eliminada exitosamente.' });
      fetchAmenities(); // Refrescar la lista después de eliminar
    } catch (err) {
      console.error("Error al eliminar amenity:", err);
      setManageStatusMessage({
        type: 'error',
        message: err instanceof Error ? err.message : "Ocurrió un error desconocido al eliminar la amenity."
      });
    } finally {
      setDeletingAmenityId(null);
    }
  };

  // --- Funciones para Amenities de Habitación ---
  const handleSubmitNewRoomAmenity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newRoomAmenityName.trim()) {
      setAddRoomAmenityStatus({ type: 'error', message: "El nombre de la amenity de habitación no puede estar vacío." });
      return;
    }
    setIsSubmittingAddRoomAmenity(true);
    setAddRoomAmenityStatus(null);

    try {
      // Asume que addRoomAmenity es una server action similar a addAmenity
      const newRoomAmenity = await addRoomAmenity(newRoomAmenityName.trim());
      setAddRoomAmenityStatus({ type: 'success', message: `Amenity de habitación "${newRoomAmenity.name}" agregada exitosamente.` });
      setNewRoomAmenityName('');
      fetchRoomAmenitiesData(); // Refrescar la lista
    } catch (err) {
      console.error("Error al agregar amenity de habitación:", err);
      setAddRoomAmenityStatus({
        type: 'error',
        message: err instanceof Error ? err.message : "Ocurrió un error desconocido al agregar la amenity de habitación."
      });
    } finally {
      setIsSubmittingAddRoomAmenity(false);
    }
  };

  const fetchRoomAmenitiesData = useCallback(async () => {
    setIsLoadingRoomAmenities(true);
    setFetchRoomAmenitiesError(null);
    setManageRoomAmenitiesStatusMessage(null);
    try {
      // Asume que getAllRoomAmenities es una server action
      const fetchedRoomAmenities = await getAllRoomAmenities();
      setRoomAmenitiesList(fetchedRoomAmenities.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Error al obtener amenities de habitación:", err);
      setFetchRoomAmenitiesError(err instanceof Error ? err.message : "Ocurrió un error desconocido al cargar las amenities de habitación.");
    } finally {
      setIsLoadingRoomAmenities(false);
    }
  }, []);

  useEffect(() => {
    if (isManageRoomAmenitiesModalOpen) {
      fetchRoomAmenitiesData();
    }
  }, [isManageRoomAmenitiesModalOpen, fetchRoomAmenitiesData]);

  const handleOpenManageRoomAmenitiesModal = () => {
    setIsManageRoomAmenitiesModalOpen(true);
    setNewRoomAmenityName('');
    setAddRoomAmenityStatus(null);
  };

  const handleManageRoomAmenitiesDialogStateChange = (open: boolean) => {
    setIsManageRoomAmenitiesModalOpen(open);
    if (!open) {
      setNewRoomAmenityName('');
      setAddRoomAmenityStatus(null);
      setIsSubmittingAddRoomAmenity(false);
    }
  };

  const handleDeleteRoomAmenityFromList = async (amenityId: string) => {
    setDeletingRoomAmenityWithId(amenityId);
    setManageRoomAmenitiesStatusMessage(null);
    setAddRoomAmenityStatus(null); // Limpiar también el estado de agregar por si acaso
    try {
      // Asume que deleteRoomAmenity es una server action
      await deleteRoomAmenity(amenityId);
      setManageRoomAmenitiesStatusMessage({ type: 'success', message: 'Amenity de habitación eliminada exitosamente.' });
      fetchRoomAmenitiesData(); // Refrescar la lista
    } catch (err) {
      console.error("Error al eliminar amenity de habitación:", err);
      setManageRoomAmenitiesStatusMessage({
        type: 'error',
        message: err instanceof Error ? err.message : "Ocurrió un error desconocido al eliminar la amenity de habitación."
      });
    } finally {
      setDeletingRoomAmenityWithId(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 items-center">
      <Button asChild variant="outline">
          <Link href="/users">
            <Users className="mr-2 h-4 w-4" />
            Gestionar Usuarios
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/hotels/add">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Nuevo Hotel
          </Link>
        </Button>
        <Button onClick={handleOpenManageAmenitiesModal} variant="outline">
          <Settings2 className="mr-2 h-4 w-4" /> Gestionar Amenities (Hotel)
        </Button>
        <Button onClick={handleOpenManageRoomAmenitiesModal} variant="outline">
          <BedDouble className="mr-2 h-4 w-4" /> Gestionar Amenities (Habitación)
        </Button>
      </div>

      {/* Modal para Amenities Generales (Hotel) */}
      <Dialog open={isManageAmenitiesModalOpen} onOpenChange={handleManageDialogStateChange}>
        <DialogContent className="sm:max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle>Gestionar Amenities</DialogTitle>
            <DialogDescription>
              Agrega nuevas amenities o visualiza y elimina las existentes.
            </DialogDescription>
          </DialogHeader>

          {/* Formulario para agregar nueva amenity */}
          <form onSubmit={handleSubmitAmenity} className="space-y-4 mt-6 mb-6 pt-4 border-t">
            <h3 className="text-lg font-medium leading-none">Agregar Nueva Amenity (Hotel)</h3>
            <div>
              <label htmlFor="newAmenityNameManage" className="block text-sm font-medium text-muted-foreground mb-1">
                Nombre de la Amenity
              </label>
              <Input
                id="newAmenityNameManage"
                type="text"
                value={newAmenityName}
                onChange={(e) => setNewAmenityName(e.target.value)}
                placeholder="Ej: Wi-Fi Gratuito, Piscina"
                disabled={isSubmittingAdd}
                required
              />
            </div>
            {addAmenityStatus && (
              <p className={`text-sm p-2 rounded-md ${addAmenityStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {addAmenityStatus.message}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingAdd}>
                {isSubmittingAdd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmittingAdd ? 'Agregando...' : 'Guardar Amenity'}
              </Button>
            </div>
          </form>

          {/* Sección para listar y eliminar amenities existentes */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium leading-none">Amenities Existentes (Hotel)</h3>
              <Button variant="outline" size="sm" onClick={fetchAmenities} disabled={isLoadingAmenities}>
                {isLoadingAmenities ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refrescar Lista
              </Button>
            </div>

            {manageStatusMessage && (
              <p className={`text-sm p-3 rounded-md my-2 ${manageStatusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {manageStatusMessage.message}
              </p>
            )}

            {isLoadingAmenities && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Cargando amenities...</p>
              </div>
            )}
            {fetchAmenitiesError && !isLoadingAmenities && (
              <p className="text-sm text-destructive p-3 bg-destructive/10 rounded-md text-center">{fetchAmenitiesError}</p>
            )}

            {!isLoadingAmenities && !fetchAmenitiesError && amenitiesList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No hay amenities de hotel registradas.</p>
            )}

            {!isLoadingAmenities && !fetchAmenitiesError && amenitiesList.length > 0 && (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 pt-2">
                {amenitiesList.map((amenity) => (
                  <div key={amenity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium">{amenity.name}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingAmenityId === amenity.id}>
                          {deletingAmenityId === amenity.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-background">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar la amenity de hotel &quot;{amenity.name}&quot;? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deletingAmenityId === amenity.id}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteAmenity(amenity.id)}
                            disabled={deletingAmenityId === amenity.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingAmenityId === amenity.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {deletingAmenityId === amenity.id ? 'Eliminando...' : 'Eliminar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Amenities de Habitación */}
      <Dialog open={isManageRoomAmenitiesModalOpen} onOpenChange={handleManageRoomAmenitiesDialogStateChange}>
        <DialogContent className="sm:max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle>Gestionar Amenities de Habitación</DialogTitle>
            <DialogDescription>
              Agrega nuevas amenities específicas para habitaciones o visualiza y elimina las existentes.
            </DialogDescription>
          </DialogHeader>

          {/* Formulario para agregar nueva amenity de habitación */}
          <form onSubmit={handleSubmitNewRoomAmenity} className="space-y-4 mt-6 mb-6 pt-4 border-t">
            <h3 className="text-lg font-medium leading-none">Agregar Nueva Amenity de Habitación</h3>
            <div>
              <label htmlFor="newRoomAmenityNameManage" className="block text-sm font-medium text-muted-foreground mb-1">
                Nombre de la Amenity de Habitación
              </label>
              <Input
                id="newRoomAmenityNameManage"
                type="text"
                value={newRoomAmenityName}
                onChange={(e) => setNewRoomAmenityName(e.target.value)}
                placeholder="Ej: Wi-Fi en habitación, Mini-bar"
                disabled={isSubmittingAddRoomAmenity}
                required
              />
            </div>
            {addRoomAmenityStatus && (
              <p className={`text-sm p-2 rounded-md ${addRoomAmenityStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {addRoomAmenityStatus.message}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingAddRoomAmenity}>
                {isSubmittingAddRoomAmenity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmittingAddRoomAmenity ? 'Agregando...' : 'Guardar Amenity de Habitación'}
              </Button>
            </div>
          </form>

          {/* Sección para listar y eliminar amenities de habitación existentes */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium leading-none">Amenities de Habitación Existentes</h3>
              <Button variant="outline" size="sm" onClick={fetchRoomAmenitiesData} disabled={isLoadingRoomAmenities}>
                {isLoadingRoomAmenities ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refrescar Lista
              </Button>
            </div>

            {manageRoomAmenitiesStatusMessage && (
              <p className={`text-sm p-3 rounded-md my-2 ${manageRoomAmenitiesStatusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {manageRoomAmenitiesStatusMessage.message}
              </p>
            )}

            {isLoadingRoomAmenities && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Cargando amenities de habitación...</p>
              </div>
            )}
            {fetchRoomAmenitiesError && !isLoadingRoomAmenities && (
              <p className="text-sm text-destructive p-3 bg-destructive/10 rounded-md text-center">{fetchRoomAmenitiesError}</p>
            )}

            {!isLoadingRoomAmenities && !fetchRoomAmenitiesError && roomAmenitiesList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No hay amenities de habitación registradas.</p>
            )}

            {!isLoadingRoomAmenities && !fetchRoomAmenitiesError && roomAmenitiesList.length > 0 && (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 pt-2">
                {roomAmenitiesList.map((amenity) => (
                  <div key={amenity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium">{amenity.name}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingRoomAmenityWithId === amenity.id}>
                          {deletingRoomAmenityWithId === amenity.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-background">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar la amenity de habitación &quot;{amenity.name}&quot;? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deletingRoomAmenityWithId === amenity.id}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRoomAmenityFromList(amenity.id)}
                            disabled={deletingRoomAmenityWithId === amenity.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingRoomAmenityWithId === amenity.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {deletingRoomAmenityWithId === amenity.id ? 'Eliminando...' : 'Eliminar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}