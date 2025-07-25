"use client"
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import { User as Loader2, KeyRound, XCircle } from 'lucide-react';
import Link from 'next/link';

import { toast } from "sonner";
import { changePassword } from '@/lib/auth-client'; // Asegúrate de que esta función esté correctamente exportada

// Esquema Zod para el cambio de contraseña
const passwordFormSchema = z.object({
  currentPassword: z.string().min(8, "La contraseña actual debe tener al menos 8 caracteres."),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
  confirmNewPassword: z.string(),
  revokeOtherSessions: z.boolean(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmNewPassword"],
});
type PasswordFormType = z.infer<typeof passwordFormSchema>;


const ChangePasswordPage = () => {

     // --- Lógica del formulario de cambio de contraseña ---
  const passwordForm = useForm<PasswordFormType>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      revokeOtherSessions: true,
    },
  });

  async function onPasswordSubmit(values: PasswordFormType) {
    
    const {currentPassword, newPassword, revokeOtherSessions} = values

      await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      },{
        onSuccess: ()=> {
          toast.success("Contraseña actualizada exitosamente.");
          passwordForm.reset();

        },
        onError: (ctx)=> {
          const errorMessage = ctx.error.message || "Ocurrió un error inesperado.";
          toast.error("Error al cambiar la contraseña", {
            description: errorMessage,
          });
          // Manejo de errores específicos
          if (errorMessage.toLowerCase().includes("current password") || errorMessage.toLowerCase().includes("contraseña actual")) {
            passwordForm.setError("currentPassword", {
              type: "server",
              message: "La contraseña actual es incorrecta. Por favor, verifícala.",
            });
          }
        }
      });
    

   
  }
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card className='w-full max-w-md my-14 border-gray-700 bg-black/30 backdrop-blur-sm shadow-lg transition-all duration-300'>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Cambiar contraeña </CardTitle>
          <CardDescription>Actualiza tu información personal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña Actual</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="revokeOtherSessions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Cerrar sesión en otros dispositivos
                      </FormLabel>
                      <FormDescription>
                        Se cerrará la sesión en todos los demás navegadores y dispositivos.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-3 pt-4">
                <Button type="submit" className="w-full" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cambiando...</>
                  ) : (
                    <><KeyRound className="mr-2 h-4 w-4" /> Actualizar Contraseña</>
                  )}
                </Button>
                <Button type="button" variant="outline" asChild className="w-full">
                  <Link href="/profile"><XCircle className="mr-2 h-4 w-4" />Cancelar</Link>
                </Button>


              </div>
            </form>
          </Form>
      </CardContent>
      </Card>
    </div>
   
  );
}

export default ChangePasswordPage;
