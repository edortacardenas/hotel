// This page will be a Server Component initially, but might need client components for forms

import type { Session } from '@/lib/type';
import { db } from '@/lib/prisma'; // Import your Prisma client instance
import { redirect } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Edit3, History, ShieldCheck, CalendarDays } from 'lucide-react'; // Added Award, ShieldCheck, CalendarDays
import Link from 'next/link';
import { UserRole } from '@prisma/client'; // Import UserRole enum from Prisma
import { auth } from "../../../lib/auth"; // path to your Better Auth server instance
import { SignOutButton } from "./SignOutButton"; // Importa el nuevo componente
import { headers } from 'next/headers';

// Defines the shape of the user profile data we expect to display
interface UserProfileData {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  role: UserRole;
  loyaltyPoints: number;
  memberSince: Date; // Derived from createdAt
  emailVerified: boolean;
}

async function getUserProfileData(
  userFromSession: Session['user'] // Session['user'] is { name?, email?, image?, id? } | undefined
): Promise<UserProfileData | null> {
  try {
    // Asegúrate de que userFromSession y userFromSession.id existan
    if (!userFromSession?.id) {
      console.error("getUserProfileData: Se requiere userFromSession.id para buscar en la base de datos.");
      // Podrías optar por devolver los datos de la sesión si el ID no está,
      // o null si consideras que es un estado de error.
      // Por ahora, devolvemos null para forzar la lógica de error en la página.
      return null;
    }
    const dbUser = await db.user.findUnique({
      where: { id: userFromSession.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        loyaltyPoints: true,
        createdAt: true,
        emailVerified: true,
      }
    });

    if (!dbUser) {
      console.warn(`Perfil de usuario no encontrado en la BD para el ID: ${userFromSession.id}`);
      return null;
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      image: dbUser.image,
      role: dbUser.role,
      loyaltyPoints: dbUser.loyaltyPoints,
      memberSince: dbUser.createdAt,
      emailVerified: dbUser.emailVerified,
    };
  } catch (error) {
    console.error("Error al obtener datos del perfil de la BD:", error);
    return null;
  }
}

export default async function ProfilePage() {
  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;
   
  if (!session?.user?.id) {
    redirect(`/sign-in`);
  }

  // session.user está garantizado aquí debido a la comprobación anterior.
  const userProfile = await getUserProfileData(session.user);

  if (!userProfile) {
    // Esto podría ocurrir si getUserProfileData devuelve null (p.ej. error de BD futuro).
    return <div className="container mx-auto px-4 py-8 text-center text-gray-100">Error al cargar el perfil. Por favor, inténtalo de nuevo más tarde.</div>;
  }

  return (
    <div className="container m-auto px-4 py-14">
      <Card className='border-gray-700 bg-black/30 backdrop-blur-sm shadow-lg transition-all duration-300'>
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start">
          <Avatar className="h-24 w-24 mb-4 sm:mb-0 sm:mr-6">
            <AvatarImage src={userProfile.image ? userProfile.image : undefined} alt={userProfile.name || 'Usuario'} />
            <AvatarFallback>{userProfile.name ? userProfile.name.substring(0, 2).toUpperCase() : <User />}</AvatarFallback>
          </Avatar>
          <div className="text-gray-100"> {/* Contenedor para que todo el texto sea claro */}
            <CardTitle className="text-2xl text-gray-100">{userProfile.name || 'Nombre no especificado'}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Mail className="h-4 w-4 mr-1 text-gray-200" /> <span className="text-gray-100">{userProfile.email || 'Email no especificado'}</span>
            </CardDescription>
            <CardDescription className="flex items-center mt-1 text-gray-100">
              <ShieldCheck className={`h-4 w-4 mr-1 ${userProfile.emailVerified ? 'text-green-500' : 'text-orange-500'}`} />
              {userProfile.emailVerified ? 'Email Verificado' : 'Email No Verificado'}
            </CardDescription>
            <CardDescription className="flex items-center mt-1 capitalize text-gray-100">
              <User className="h-4 w-4 mr-1" /> Rol: <span className="ml-1 text-gray-100">{userProfile.role.toLowerCase()}</span>
            </CardDescription>
            <CardDescription className="flex items-center mt-1 text-gray-100">
              <CalendarDays className="h-4 w-4 mr-1 " /> Miembro desde: {new Date(userProfile.memberSince).toLocaleDateString()}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4 sm:mt-0 sm:ml-auto">
            <Link href="/profile/edit">
              <Edit3 className="h-4 w-4 mr-2 " /> Editar Perfil
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="mt-6">
          <Separator className="my-6" />
          <div className="space-y-4 mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-100">Acciones Rápidas</h3>
            <Link href="/bookings" className="flex items-center p-3 hover:bg-accent-foreground rounded-md transition-colors">
              <History className="h-5 w-5 mr-3 text-green-500" />
              <span className='text-gray-100'>Historial de Reservas</span>
            </Link>
            
            <Separator className="my-4" />
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}