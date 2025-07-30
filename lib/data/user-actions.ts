"use server"; // Directiva a nivel de módulo para todas las acciones en este archivo

import { auth } from '@/lib/auth';
import type { Session } from '@/lib/type';
import { db } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { UserRole, Prisma } from '@prisma/client'; 


export async function getSession(): Promise<Session | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    }) as Session;

    if (!session?.user?.id) {
      return null; // Si no hay sesión o ID de usuario, devolvemos null
    }
    return session
  } catch (error) {
    console.error("Error getting session:", error);
    throw error
  }
}

export async function isAdmin(): Promise<boolean> {
  
  try {
    const session = await getSession() as Session; // Obtener y castear la sesión directamente

    if (!session?.user?.id) {
      console.warn("isAdmin check: No se encontró sesión o ID de usuario.");
      return false;
    }

    const userId = session.user.id;

    // Obtener el rol del usuario directamente desde la base de datos
    const userFromDb = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!userFromDb) {
      console.warn(`isAdmin check: Usuario con ID ${userId} no encontrado en la base de datos.`);
      return false;
    }

    if (userFromDb.role !== UserRole.ADMIN) {
      // Esto no es un error, es un resultado esperado. Lo logueamos para claridad.
      console.log(`isAdmin check: El usuario ${userId} no es administrador. Rol: ${userFromDb.role}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error catastrófico dentro de la Server Action 'isAdmin':", error);
    // Devolver false en caso de cualquier error para evitar exponer detalles del error al cliente.
    // El error ya está logueado en el servidor para depuración.
    return false;
  }
}

export interface UserEditableData {
    id: string;
    name: string | null;
    email: string | null; // Generalmente no editable o con proceso de verificación
    image: string | null;
  }
  
export  async function getUserDataForEdit(userId: string): Promise<UserEditableData | null> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });
  
      if (!user) {
        return null;
      }
      // Asegurarse de que los campos opcionales sean null si no existen, en lugar de undefined
      return {
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
      };
    } catch (error) {
      console.error("Error fetching user data for edit:", error);
      return null;
    }
  }


// Definición del estado del formulario para useFormState
export interface EditProfileFormState {
  message?: string; // Mensaje general de éxito o informativo
  error?: string;   // Mensaje de error general
  fieldErrors?: {   // Errores específicos para campos
    name?: string[];
    image?: string[];
  };
  success?: boolean; // Indicador de éxito
}

export async function updateUserProfile(
  prevState: EditProfileFormState,
  formData: FormData
): Promise<EditProfileFormState> {
  const session = await getSession() as Session;

  if (!session?.user?.id) {
    return { error: "Usuario no autenticado. Por favor, inicia sesión de nuevo.", success: false };
  }

  const userId = session.user.id;
  const name = formData.get('name') as string;
  const image = formData.get('image') as string; // Puede ser una cadena vacía

  // Validación (ejemplo con Zod sería más robusto aquí)
  const fieldErrors: EditProfileFormState['fieldErrors'] = {};
  if (!name || name.trim() === "") {
    fieldErrors.name = ["El nombre no puede estar vacío."];
  }
  // Validación simple para URL de imagen (opcional)
  if (image && image.trim() !== "") {
    try {
      new URL(image.trim());
    } catch (error) {
      console.log(error)
      // Si la URL no es válida, añadimos un error
      fieldErrors.image = ["La URL de la imagen no es válida."];
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Por favor corrige los errores en el formulario.", fieldErrors, success: false };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        image: image && image.trim() !== "" ? image.trim() : null,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Ocurrió un error al actualizar el perfil. Por favor, inténtalo de nuevo.", success: false };
  }

  // Revalidar la ruta del perfil para que muestre los datos actualizados
  revalidatePath('/profile');
  revalidatePath('/profile/edit'); // También la página actual por si acaso

  // En lugar de devolver un mensaje de éxito aquí, la redirección se encargará.
  // useFormState se reiniciará después de una redirección.
  redirect('/profile');
}

export async function findUserByEmail(email: string) {
  try {
    const account = await db.account.findUnique({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: email, // Usamos el email para encontrar la cuenta correcta
        },
      },
      select: {
        id: true,
        providerId: true,
        accountId: true,
      },
    });
    return account;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}


/**
 * Define el tipo para el estado de la respuesta de la Server Action
 * para modificar el rol de un usuario.
 */
export type ModifyUserRoleActionState = {
  success: boolean;
  message: string;
  errorType?: 'auth' | 'not_found' | 'invalid_input' | 'self_update' | 'server_error';
};

/**
 * Modifica el rol de un usuario específico.
 * Solo puede ser ejecutada por un usuario con rol de ADMIN.
 * Un administrador no puede modificar su propio rol.
 *
 * @param userIdToModify - El ID del usuario cuyo rol se va a cambiar.
 * @param newRole - El nuevo rol a asignar (ADMIN o USER).
 * @returns Un objeto de estado indicando el resultado de la operación.
 */
export async function modificarRolUsuario(
  userIdToModify: string,
  newRole: UserRole
): Promise<ModifyUserRoleActionState> {
  // 1. Autenticación y Autorización
  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return { success: false, message: 'Autenticación requerida.', errorType: 'auth' };
  }

  const adminId = session.user.id;

  // Un administrador no puede cambiar su propio rol para evitar auto-bloqueos.
  if (adminId === userIdToModify) {
    return { success: false, message: 'No puedes modificar tu propio rol.', errorType: 'self_update' };
  }

  // Verificar que el usuario que ejecuta la acción es un administrador.
  const adminUser = await db.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });

  if (!adminUser || adminUser.role !== UserRole.ADMIN) {
    return { success: false, message: 'Permiso denegado. Se requiere rol de administrador.', errorType: 'auth' };
  }

  // 2. Validación de Entrada
  if (!userIdToModify || !newRole || !Object.values(UserRole).includes(newRole)) {
    return { success: false, message: 'Se requiere un ID de usuario y un rol válidos.', errorType: 'invalid_input' };
  }

  // 3. Lógica de Base de Datos
  try {
    // Actualizar el rol del usuario objetivo
    await db.user.update({
      where: { id: userIdToModify },
      data: { role: newRole },
    });

    // Revalidar rutas donde se muestre la información del usuario (ej. panel de admin)
    revalidatePath('/admin/users');

    return { success: true, message: `El rol del usuario ha sido actualizado a ${newRole}.` };

  } catch (error) {
    console.error(`Error al modificar el rol del usuario ${userIdToModify}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { success: false, message: `Usuario con ID ${userIdToModify} no encontrado.`, errorType: 'not_found' };
    }
    return { success: false, message: 'Error interno del servidor al modificar el rol.', errorType: 'server_error' };
  }
}

/**
 * Obtiene todos los usuarios de la base de datos.
 * Esta acción está protegida y solo puede ser ejecutada por un administrador.
 * @returns Una promesa que se resuelve con un array de usuarios con campos seleccionados.
 */
export async function getAllUsers() {
  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    // Esto será capturado por un error boundary o por quien llame a la función.
    throw new Error("Permiso denegado: Debes ser un administrador para ver los usuarios.");
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return users;
  } catch (error) {
    console.error("Fallo al obtener los usuarios:", error);
    throw new Error("No se pudieron obtener los usuarios de la base de datos.");
  }
}

/**
 * Elimina un usuario por su ID.
 * Solo puede ser ejecutada por un usuario con rol de ADMIN.
 * Un administrador no puede eliminarse a sí mismo a través de esta función.
 *
 * @param userIdToDelete - El ID del usuario a eliminar.
 * @returns Un objeto de estado indicando el resultado de la operación.
 */
export async function deleteUserByAdmin(userIdToDelete: string): Promise<ModifyUserRoleActionState> {
  // 1. Autenticación y Autorización
  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return { success: false, message: 'Autenticación requerida.', errorType: 'auth' };
  }

  const adminId = session.user.id;

  // Un administrador no puede eliminarse a sí mismo con esta acción.
  if (adminId === userIdToDelete) {
    return { success: false, message: 'No puedes eliminar tu propia cuenta desde este panel.', errorType: 'self_update' };
  }

  // Verificar que el usuario que ejecuta la acción es un administrador.
  const adminUser = await db.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });

  if (!adminUser || adminUser.role !== UserRole.ADMIN) {
    return { success: false, message: 'Permiso denegado. Se requiere rol de administrador.', errorType: 'auth' };
  }

  // 2. Lógica de Eliminación
  try {
    // Para una acción de administrador, es más seguro y directo interactuar
    // con la base de datos después de haber verificado los permisos.
    // La función `auth.api.deleteUser` está diseñada para que un usuario
    // elimine su propia cuenta, no para que un admin elimine a otros.
    await db.user.delete({ where: { id: userIdToDelete } });
    revalidatePath('/user'); // Revalidamos la página de usuarios
    return { success: true, message: 'El usuario ha sido eliminado correctamente.' };
  } catch (error) {
    console.error(`Error al eliminar el usuario ${userIdToDelete}:`, error);
    return { success: false, message: 'Error interno del servidor al eliminar el usuario.', errorType: 'server_error' };
  }
}
