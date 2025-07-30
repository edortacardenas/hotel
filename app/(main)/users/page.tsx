import { redirect } from 'next/navigation';
import type { Session } from '@/lib/type';
import { isAdmin, getAllUsers, getSession } from '@/lib/data/user-actions';
import { UserManagementTable } from '@/components/users/UserManagementTable';

const UsersPage = async () => {
  // 1. Verificación de autorización: Solo los administradores pueden acceder.
  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    redirect('/'); // Redirige a los no-admins a la página de inicio.
  }

  // Obtiene la sesión del admin actual para evitar la auto-modificación en el cliente.
  const session = await getSession() as Session
  const currentAdminId = session?.user?.id;

  if (!currentAdminId) {
    // Este caso es improbable si isAdmin() pasó, pero es una buena práctica de seguridad.
    redirect('/sign-in');
  }

  // 2. Obtención de datos: Llama a la Server Action para obtener todos los usuarios.
  const users = await getAllUsers();

  return (
    <div className="flex flex-col items-center mx-auto py-10">
      <h1 className="text-3xl font-bold text-gray-100 mb-6 mx-auto">Gestión de Usuarios</h1>
      <p className="text-gray-100 mb-8">
        Gestiona roles y usuarios del sistema.
      </p>
      {/* 3. Renderizado: Pasa los datos al componente de cliente. */}
      <UserManagementTable users={users} currentAdminId={currentAdminId} />
    </div>
  );
}

export default UsersPage;