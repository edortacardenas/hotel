"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '@prisma/client';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Trash2, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { modificarRolUsuario, deleteUserByAdmin } from '@/lib/data/user-actions';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
  import { Button } from '@/components/ui/button';
 
  
// Define un tipo más específico para los datos de usuario que recibimos
type UserForTable = Pick<User, 'id' | 'name' | 'email' | 'image' | 'role' | 'emailVerified' | 'createdAt'>;

interface UserManagementTableProps {
  users: UserForTable[];
  currentAdminId: string;
}

export function UserManagementTable({ users, currentAdminId }: UserManagementTableProps) {
  const router = useRouter();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [userToDelete, setUserToDelete] = useState<UserForTable | null>(null);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoadingStates(prev => ({ ...prev, [userId]: true }));
    const result = await modificarRolUsuario(userId, newRole);
    if (result.success) {
      toast.success(result.message);
      router.refresh(); // Vuelve a obtener los datos en el servidor y renderiza de nuevo
    } else {
      toast.error(result.message);
    }
    setLoadingStates(prev => ({ ...prev, [userId]: false }));
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setLoadingStates(prev => ({ ...prev, [userToDelete.id]: true }));
    try {
      // La Server Action espera el ID del usuario como un string, no un objeto.
      const result = await deleteUserByAdmin(userToDelete.id);
      if (result.success) {
        toast.success(result.message);
        setUserToDelete(null); // Cierra el diálogo de confirmación
        // La revalidación del path en la Server Action se encargará de refrescar los datos.
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el usuario.');
    }
    setLoadingStates(prev => ({ ...prev, [userToDelete.id]: false }));
  };

  return (
    <>
      {/* Contenedor principal que se ajusta al ancho */}
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-0">
        {/* Vista de Tabla para Escritorio (oculta en móvil) */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='text-gray-100'>Usuario</TableHead>
                <TableHead className='text-gray-100'>Rol</TableHead>
                <TableHead className='text-gray-100'>Estado</TableHead>
                <TableHead className="text-right text-gray-100">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-100">{user.name}</div>
                        <div className="text-sm text-gray-100">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className='' variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={user.emailVerified ? 'text-green-500' : 'text-gray-100'} variant={user.emailVerified ? 'default' : 'secondary'}>
                      {user.emailVerified ? 'Verificado' : 'No Verificado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {loadingStates[user.id] ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={user.id === currentAdminId}>
                            <MoreVertical className="h-5 w-5 text-gray-100" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {user.role === 'USER' && (
                            <DropdownMenuItem onSelect={() => handleRoleChange(user.id, 'ADMIN')}>
                              <Shield className="mr-2 h-4 w-4" /> Hacer Admin
                            </DropdownMenuItem>
                          )}
                          {user.role === 'ADMIN' && (
                            <DropdownMenuItem onSelect={() => handleRoleChange(user.id, 'USER')}>
                              <UserIcon className="mr-2 h-4 w-4" /> Hacer Usuario
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-900/20" onSelect={() => setUserToDelete(user)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Usuario
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Vista de Tarjetas para Móvil (oculta en escritorio) */}
        <div className="md:hidden space-y-4">
          {users.map((user) => (
            <div key={user.id} className="bg-card text-card-foreground border rounded-lg p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-muted-foreground">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                {loadingStates[user.id] ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={user.id === currentAdminId}>
                        <MoreVertical className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {user.role === 'USER' && (
                        <DropdownMenuItem onSelect={() => handleRoleChange(user.id, 'ADMIN')}>
                          <Shield className="mr-2 h-4 w-4" /> Hacer Admin
                        </DropdownMenuItem>
                      )}
                      {user.role === 'ADMIN' && (
                        <DropdownMenuItem onSelect={() => handleRoleChange(user.id, 'USER')}>
                          <UserIcon className="mr-2 h-4 w-4" /> Hacer Usuario
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-900/20" onSelect={() => setUserToDelete(user)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar Usuario
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="flex justify-between items-center text-sm pt-3 border-t border-border">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-muted-foreground">Rol</span>
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge className={user.emailVerified ? 'text-green-500' : 'text-muted-foreground'} variant={user.emailVerified ? 'default' : 'secondary'}>
                    {user.emailVerified ? 'Verificado' : 'No Verificado'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la cuenta del usuario{' '}
              <strong>{userToDelete?.name}</strong> y borrará sus datos de nuestros servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Sí, eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
  );
}