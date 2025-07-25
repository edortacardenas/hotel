import { auth } from "./auth";
import { UserRole } from "@prisma/client"; // Import UserRole

// 1. Obtener el tipo de sesión base inferido por better-auth.
//    Este tipo es el que `auth.api.getSession()` devuelve antes de cualquier aserción.
type BaseSessionType = typeof auth.$Infer.Session;

// 2. Extraer el tipo del objeto 'user' de BaseSessionType.
//    El error de TypeScript nos muestra la estructura de este usuario base:
//    { id: string; name: string; email: string; emailVerified: boolean; createdAt: Date; updatedAt: Date; image?: string | null | undefined; }
//    Usaremos NonNullable para manejar el caso de que 'user' pueda ser null o undefined en BaseSessionType.
type BaseUserInSession = NonNullable<BaseSessionType["user"]>;

// 3. Definir una interfaz para el usuario de la sesión que incluya la propiedad 'role'.
interface ExtendedUserInSession extends BaseUserInSession {
  role: UserRole; // Añadimos la propiedad 'role'
}

// 4. Definir el tipo 'Session' final, reemplazando el 'user' original con nuestro 'user' extendido.
export type Session = Omit<BaseSessionType, "user"> & {
  user?: ExtendedUserInSession | null; // 'user' ahora es de tipo ExtendedUserInSession o null
};