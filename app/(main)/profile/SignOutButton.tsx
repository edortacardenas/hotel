"use client";

import { signOut } from "@/lib/auth-client"; // Asegúrate que esta ruta sea correcta
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";


export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Llama a la función signOut de better-auth.
      // Puede que acepte opciones como callbackUrl o si debe redirigir.
      // Ejemplo: await signOut({ redirect: true, callbackUrl: "/" });
      await signOut();
      // Si signOut no redirige automáticamente, puedes hacerlo aquí:
       router.refresh(); // Refresca la página actual para reflejar el cambio de estado
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Aquí podrías mostrar una notificación de error al usuario
    }
  };

  return (
    <Button variant="ghost" onClick={handleSignOut} className="flex items-center justify-start w-full p-3 h-auto text-red-600 hover:text-gray-100 hover:bg-accent-foreground">
      <LogOut className="h-5 w-5 mr-3" />
      <span>Cerrar Sesión</span>
    </Button>
  );
}