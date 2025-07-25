"use client"


import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
//import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import { User as UserIcon, Save, XCircle, Loader2, ShieldCheck } from 'lucide-react';

import { 
  updateUserProfile, 
  UserEditableData,  
} from '@/lib/data/user-actions';


// Esquema Zod para el formulario de edición de perfil
const profileFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre no puede estar vacío." }),
  image: z.string().url({ message: "Debe ser una URL de imagen válida." }).or(z.literal("")).optional(),
});
type ProfileFormType = z.infer<typeof profileFormSchema>;

interface EditProfileClientFormProps {
  initialData: UserEditableData;
}

export function EditProfileClientForm({ initialData }: EditProfileClientFormProps) {
  

  // --- Lógica del formulario de edición de perfil ---
  const profileForm = useForm<ProfileFormType>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: initialData.name ?? "",
      image: initialData.image ?? "",
    },
  });

  async function onProfileSubmit(values: ProfileFormType) {
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('image', values.image ?? '');

    // La Server Action redirige en caso de éxito, por lo que solo manejamos el error.
    
    const result = await updateUserProfile({}, formData);
    if (result?.error) {
      toast.error("Error al actualizar el perfil", {
        description: result.error,
      });
    }
  }

 

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card className='w-full max-w-md my-14 border-gray-700 bg-black/30 backdrop-blur-sm shadow-lg transition-all duration-300'>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Editar Perfil</CardTitle>
          <CardDescription>Actualiza tu información personal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:space-x-6">
                <Avatar className="h-24 w-24 sm:h-20 sm:w-20 flex-shrink-0">
                  <AvatarImage src={profileForm.watch('image') || initialData.image || undefined} alt={profileForm.watch('name') || 'Usuario'} />
                  <AvatarFallback>{profileForm.watch('name') ? profileForm.watch('name').substring(0, 2).toUpperCase() : <UserIcon />}</AvatarFallback>
                </Avatar>
                <div className="w-full space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Tu nombre" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de la Imagen</FormLabel>
                        <FormControl>
                          <Input placeholder="https://ejemplo.com/imagen.png" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>Email</FormLabel>
                <Input type="email" value={initialData.email ?? ''} disabled readOnly />
                <p className="text-xs text-muted-foreground">El email no se puede cambiar desde aquí.</p>
              </div>

              <div className="flex flex-col gap-3 pt-4">

                <Button type="submit" className="w-full" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>
                  )}
                </Button>

                <Button type="button" variant="outline" asChild className="w-full">
                  <Link href="/profile"><XCircle className="mr-2 h-4 w-4" />Cancelar</Link>
                </Button>

                <Button type="button" variant="outline" asChild className="w-full mb-7">
                  <Link href="/change-password"><ShieldCheck className="mr-2 h-4 w-4" />Cambiar contraseña</Link>
                </Button>


              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}