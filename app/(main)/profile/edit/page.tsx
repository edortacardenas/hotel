
//import { auth } from '@/lib/auth';
import type { Session } from '@/lib/type'; // Asumiendo que Session se exporta desde lib/type.ts
import { redirect } from 'next/navigation';

//import { headers } from 'next/headers';
import { EditProfileClientForm } from './edit-form';
import { getSession, getUserDataForEdit } from '@/lib/data/user-actions'; // Asegúrate de que la ruta sea correcta	

export default async function EditProfilePage() {
  const rawSession = await getSession()
  const session = rawSession as Session;

  if (!session?.user?.id) {
    // Redirigir a la página de inicio de sesión con una URL de callback
    redirect(`/sign-in`);
  }

  const userData = await getUserDataForEdit(session.user.id);

  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        Error al cargar los datos del usuario para editar. Por favor, inténtalo de nuevo.
      </div>
    );
  }

  // El Server Component EditProfilePage ahora renderiza EditProfileClientForm
  return (
    <EditProfileClientForm initialData={userData} />
  );
}
