'use client'; // Necesario para hooks como useState y usePathname

import React, { useState, useEffect, useTransition } from 'react'; // Import useTransition
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Hotel, Loader2, AlertTriangle } from 'lucide-react'; // Import Loader2 and AlertTriangle
import { Button } from '@/components/ui/button'; // Asumiendo la ruta de tu componente Button de Shadcn
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { signOut } from "@/lib/auth-client"; 
import { isAdmin } from '@/lib/data/user-actions'; // Importar la server action
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client"

interface NavLink {
  href: string;
  label: string;
}
// Actualizado para incluir el nuevo enlace y reordenar para claridad
const navLinks: NavLink[] = [
  { href: '/', label: 'Inicio' },
  { href: '/search', label: 'Search' },
  // Enlace para administrar hoteles (solo visible para administradores)
  { href: '/hotels', label: 'Admin Hoteles' },
  { href: '/profile', label: 'Profile' },
  // Enlaces de autenticación
  { href: '/sign-in', label: 'Sign-In' },
  { href: '/sign-up', label: 'Sign-Up' },
];

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname(); // Hook para obtener la ruta actual
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = authClient.useSession(); // Renombrado isPending a isSessionPending

  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false); 
  const [isUserAdmin, setIsUserAdmin] = useState(false); // Estado para el rol de admin
  const [authStatusChecked, setAuthStatusChecked] = useState(false);
  const [isCheckingAdmin, startAdminTransition] = useTransition(); // Nuevo useTransition para la verificación de admin
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null); // Nuevo estado para errores de verificación de admin

  // Cerrar el menú móvil cuando cambia la ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
  // Efecto para actualizar estados basados en la sesión y verificar el rol de admin
  useEffect(() => {
    const sessionStatus = isSessionPending ? 'loading' : (session ? 'authenticated' : 'unauthenticated');

    if (sessionStatus === 'loading') {
      setAuthStatusChecked(false); // Mientras carga, no hemos chequeado nada
      return;
    }

    // Limpiar errores previos de verificación de admin
    setAdminCheckError(null);

    if (sessionStatus === 'authenticated') {
      setIsUserLoggedIn(true);
      // Disparar la comprobación de admin usando la Server Action
      startAdminTransition(async () => { // Envuelve la llamada a la Server Action en startAdminTransition
        try {
          const adminStatus = await isAdmin();
          // Asumiendo que isAdmin() devuelve directamente un booleano.
          // Si devuelve un objeto { success: boolean, isAdmin: boolean, message?: string },
          // necesitarías ajustar esto para leer result.isAdmin.
          setIsUserAdmin(adminStatus); 
        } catch (error: any) { // Captura el error y lo tipa para acceder a .message
          console.error("Error checking admin status:", error);
          setAdminCheckError(error.message || "Ocurrió un error al verificar el rol de administrador.");
          setIsUserAdmin(false); // Asumir no admin en caso de error o fallo
        } finally {
          setAuthStatusChecked(true); // Chequeo completo (login + admin)
        }
      });
    } else { // 'unauthenticated'
      setIsUserLoggedIn(false);
      setIsUserAdmin(false);
      setAuthStatusChecked(true); // Chequeo completo (no logueado)
      setAdminCheckError(null); // No hay error de admin si no hay sesión
    }
  }, [session, isSessionPending, startAdminTransition]); // Añadir startAdminTransition a las dependencias

  const handleLogout = async () => {
    try {
      await signOut();
      setIsUserLoggedIn(false); // Actualiza el estado local para reflejar que el usuario cerró sesión
      setIsUserAdmin(false); // Resetear estado de admin al hacer logout
      router.push('/'); // Redirige al usuario a la página de inicio
      console.log('Usuario ha cerrado sesión exitosamente y ha sido redirigido.');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Aquí podrías mostrar una notificación de error al usuario
      // isUserLoggedIn no se cambia a false aquí, ya que el cierre de sesión falló.
    }
  };

  return (
    <nav className="bg-transparent sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo o Nombre del Hotel */}
        <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-green-500 hover:bg-transparent  ">
          <Hotel className="h-7 w-7 text-green-500 " />
          <span className="text-2xl font-semibold text-muted-foreground hover:text-green-500  ">Reservas Online</span>
        </Link>

        {/* Navegación para Escritorio */}
        <div className="hidden md:flex items-center">
          <div className="flex items-center space-x-1"> {/* Links */}
            {authStatusChecked && navLinks.map((link) => { // Renderizar solo después de verificar auth
              // Mostrar 'Admin Hoteles' solo si el usuario ESTÁ logueado Y ES ADMIN
              if (link.href === '/hotels' && !(isUserLoggedIn && isUserAdmin)) {
                return null;
              }
              // Mostrar Sign-In y Sign-Up solo si el usuario NO está logueado
              if ((link.href === '/sign-in' || link.href === '/sign-up') && isUserLoggedIn) {
                return null;
              }
              // Mostrar Profile solo si el usuario ESTÁ logueado
              if (link.href === '/profile' && !isUserLoggedIn) {
                return null;
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      pathname === link.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-primary hover:bg-accent'
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Botones de Acción (Logout, Reservas) */}
          <div className="ml-4 flex items-center space-x-2 relative"> {/* Añadido relative para posicionamiento de error */}
            {isCheckingAdmin && <Loader2 className="h-5 w-5 animate-spin text-primary" />} {/* Indicador de carga para admin check */}
            {adminCheckError && <span className="text-red-500 text-xs flex items-center"><AlertTriangle className="h-4 w-4 mr-1" />{adminCheckError}</span>} {/* Mostrar error */}
            {authStatusChecked && isUserLoggedIn && (
              <Button onClick={handleLogout} variant="ghost" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Log-out
              </Button>
            )}
            {/* Botón de Reservas con estilo condicional */}
            <Button 
              asChild 
              variant={pathname === '/bookings' ? 'default' : 'ghost'}
              className={
                pathname === '/bookings' 
                  ? '' // No se necesitan clases adicionales si es 'default' y ya tiene el estilo deseado
                  : 'px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary transition-colors'
              }
            >
              <Link href="/bookings">Reservas</Link>
            </Button>
          </div>
        </div>

        {/* Botón de Menú Móvil */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-gray-100" />
                <span className="sr-only ">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-[300px] sm:w-[400px] bg-transparent backdrop-blur-lg border-l-gray-800"
              closeButtonClassName=" text-gray-100 font-bold" // Aplica el color deseado aquí
            >
              <SheetHeader className="mb-2">
                <SheetTitle className="flex items-center space-x-2">
                  <Hotel className="h-6 w-6 text-gray-100" />
                  <span className='text-gray-100'>Reservas Online</span>
                </SheetTitle>
                <SheetDescription>
                  Navega por el sitio, gestiona tus reservas.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col space-y-3 ">
                {authStatusChecked && navLinks.map((link) => {
                  // Mostrar 'Admin Hoteles' solo si el usuario ESTÁ logueado Y ES ADMIN (móvil)
                  if (link.href === '/hotels' && !(isUserLoggedIn && isUserAdmin)) {
                    return null;
                  }
                  // Mostrar Sign-In y Sign-Up solo si el usuario NO está logueado
                  if ((link.href === '/sign-in' || link.href === '/sign-up') && isUserLoggedIn) {
                    return null;
                  }
                  // Mostrar Profile solo si el usuario ESTÁ logueado
                  if (link.href === '/profile' && !isUserLoggedIn) {
                    return null;
                  }
                  return (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className={`block px-3 py-2 rounded-md text-gray-100 font-medium
                          ${pathname === link.href ? 'bg-primary text-gray-100' : 'text-gray-100 hover:text-primary hover:bg-accent'}`}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  );
                })}
                {/* Botón de Log-out para móvil */}
                {authStatusChecked && isUserLoggedIn && (
                  <SheetClose asChild>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-100 hover:text-primary hover:bg-accent"
                    >
                      Log-out
                    </button>
                  </SheetClose>
                )}
               
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

// Nota: Si prefieres usar NavigationMenu de Shadcn/ui para el escritorio,
// la implementación sería algo así (requiere instalar @radix-ui/react-navigation-menu):
/*
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

...
<NavigationMenu className="hidden md:flex">
  <NavigationMenuList>
    {navLinks.map((link) => (
      <NavigationMenuItem key={link.href}>
        <Link href={link.href} legacyBehavior passHref>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle() + 
              (pathname === link.href ? ' bg-accent text-accent-foreground' : '')
            }
          >
            {link.label}
          </NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
    ))}
  </NavigationMenuList>
</NavigationMenu>
<Button asChild variant="default" className="hidden md:inline-flex ml-4">
  <Link href="/booking">Reservar Ahora</Link>
</Button>
*/

export default Navbar;