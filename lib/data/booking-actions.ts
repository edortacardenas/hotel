'use server';

import { db } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma, BookingStatus, PaymentStatus, type Booking, type User, type Room, type Hotel } from '@prisma/client';
import { headers } from 'next/headers'; // For server-side session retrieval
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Session } from '@/lib/type'; // Assuming your custom Session type is here

// Define el tipo para una reserva individual con detalles del hotel y la habitación
export type UserBookingDetails = Prisma.BookingGetPayload<{
  include: {
    hotel: { select: { id: true, name: true, city: true, images: true } };
    room: { select: { id: true, roomType: true, pricePerNight: true } };
  };
}>;

// Define el tipo para el estado de la respuesta de la Server Action
export type GetUserBookingsActionState = {
  success: boolean;
  message?: string;
  bookings?: UserBookingDetails[];
  errorType?: 'auth' | 'server_error';
};

//obtener y devolver todas las reservas de hotel que ha realizado un usuario específico que está actualmente autenticado.
/*
Asegurar que el usuario esté autenticado.
Buscar en la base de datos todas las reservas que pertenecen al usuario autenticado.
Para cada reserva, incluir información útil del hotel y de la habitación asociada.
Ordenar las reservas para mostrar las más recientes primero.
Devolver la lista de reservas al cliente.
Manejar errores si el usuario no está autenticado o si ocurre un problema en el servidor.
*/
export async function getUserBookingsAction(): Promise<GetUserBookingsActionState> {
  // Use server-side session retrieval
  const rawSession = await auth.api.getSession({
    headers: await headers(),
  });
  const session = rawSession as Session; // Cast to your custom Session type

  if (!session?.user?.id) {
    return {
      success: false,
      message: 'No autenticado. Por favor, inicia sesión.',
      errorType: 'auth',
    };
  }

  try {
    const bookings: UserBookingDetails[] = await db.booking.findMany({
      // Adjust userId access based on session structure
      where: { userId: session.user.id },
      include: {
        hotel: { select: { id: true, name: true, city: true, images: true } }, // Include some hotel details
        room: { select: { id: true, roomType: true, pricePerNight: true } }, // Include some room details
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      bookings: bookings,
    };
  } catch (error) {
    console.error('Error al obtener las reservas:', error);
    return {
      success: false,
      message: 'Error interno del servidor al obtener las reservas.',
      errorType: 'server_error',
    };
  }
}

// Define un esquema para la validación de los datos del formulario
const bookingFormSchema = z.object({
  hotelId: z.string().min(1, "Hotel ID is required."),
  roomId: z.string().min(1, "Room type is required."), // Este es el ID de un registro de Room específico
  checkInDate: z.string().min(1, "Check-in date is required.").transform(str => new Date(str)),
  checkOutDate: z.string().min(1, "Check-out date is required.").transform(str => new Date(str)),
  numberOfGuests: z.string().transform(Number).refine(num => num > 0, "Number of guests must be positive."),
  numberOfRooms: z.string().transform(Number).refine(num => num > 0, "Number of rooms must be positive."),
  // specialRequests: z.string().optional(), // Descomenta si incluyes esto en tu formulario
});

// Define el tipo para el estado de la respuesta de la Server Action de creación de reserva
export type CreateBookingActionState = {
  success: boolean;
  message: string | null;
  paymentId?: string;
  bookingIds?: string[];
  errors?: { [key: string]: string[] | undefined }; // Para errores de validación por campo
};

export async function createBookingAction(prevState: CreateBookingActionState, formData: FormData): Promise<CreateBookingActionState> {
  'use server';

  const rawSession = await auth.api.getSession({ headers: await headers() });
  const userId = rawSession?.user?.id;

  if (!userId) {
    return { success: false, message: "User not authenticated." };
  }

  // Parsear y validar los datos del formulario
  const parsed = bookingFormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    console.error("Validation error:", parsed.error.flatten());
    return { success: false, message: "Invalid form data: " + parsed.error.flatten().formErrors.join(', '), errors: parsed.error.flatten().fieldErrors };
  }

  const { hotelId, roomId, checkInDate, checkOutDate, numberOfGuests, numberOfRooms } = parsed.data;

  // Validación básica de fechas
  if (checkInDate >= checkOutDate) {
    return {
      success: false,
      message: "Invalid dates provided.", // Mensaje general para el formulario
      errors: {
        checkOutDate: ["La fecha de check-out debe ser posterior a la fecha de check-in."],
      },
    };
  }

  try {
    const result = await db.$transaction(async (prisma) => {
      // 1. Obtener detalles de la habitación seleccionada (registro de Room específico)
      const selectedRoom = await prisma.room.findUnique({
        where: { id: roomId },
        select: { pricePerNight: true, capacity: true, hotelId: true, roomType: true },
      });

      if (!selectedRoom) {
        return {
          success: false,
          message: "Error de selección de habitación.",
          errors: { roomId: ["Tipo de habitación seleccionado no encontrado. Por favor, selecciona una habitación válida."] },
        };
      }
      if (selectedRoom.hotelId !== hotelId) {
        return {
          success: false,
          message: "Error de asignación de habitación.",
          errors: { general: ["La habitación seleccionada no pertenece a este hotel. Por favor, recarga la página."] },
        };
      }
      if (numberOfGuests > selectedRoom.capacity) {
        return {
          success: false,
          message: "Capacidad de huéspedes excedida.",
          errors: {
            numberOfGuests: [`El número de huéspedes (${numberOfGuests}) excede la capacidad de la habitación seleccionada (${selectedRoom.capacity}).`],
          },
        };
      }

      // Calcular el número de noches
      const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
      const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (numberOfNights <= 0) {
        return {
          success: false,
          message: "Duración de la reserva inválida.",
          errors: {
            checkInDate: ["La reserva debe ser al menos por una noche."],
            checkOutDate: ["La reserva debe ser al menos por una noche."],
          },
        };
      }

      // Convertir Decimal a número para el cálculo. Para producción, considera usar una librería como 'decimal.js'
      const pricePerRoomPerNight = parseFloat(selectedRoom.pricePerNight.toString());
      const totalPricePerIndividualBooking = pricePerRoomPerNight * numberOfNights;
      const totalPaymentAmount = totalPricePerIndividualBooking * numberOfRooms;
      if (isNaN(totalPaymentAmount) || totalPaymentAmount <= 0) {
        return { success: false, message: "Error al calcular el precio total. Por favor, verifica las fechas y cantidades." };
      }

      // 2. Verificar disponibilidad de habitaciones basada en HotelRoomInventory
      // Esta es una verificación simplificada. Para una disponibilidad completa,
      // necesitarías consultar las reservas existentes para las fechas y el tipo de habitación específicos.
      const inventory = await prisma.hotelRoomInventory.findUnique({
        where: {
          hotel_roomtype_inventory_unique: {
            hotelId: hotelId,
            roomType: selectedRoom.roomType,
          },
        },
      });

      if (!inventory || inventory.count < numberOfRooms) {
        return {
          success: false,
          message: "Disponibilidad de habitaciones insuficiente.",
          errors: { numberOfRooms: [`No hay suficientes habitaciones de tipo ${selectedRoom.roomType.replace(/_/g, ' ').toLowerCase()} disponibles para la cantidad solicitada.`] },
        };
      }


      // 3. Crear un único registro de Payment para toda la transacción
      const payment = await prisma.payment.create({
        data: {
          amount: totalPaymentAmount,
          currency: "USD", // Considera hacer esto dinámico
          status: PaymentStatus.PENDING,
        },
      });

      const createdBookingIds: string[] = [];
      // 4. Crear múltiples registros de Booking, vinculando cada uno al único Payment
      for (let i = 0; i < numberOfRooms; i++) {
        const booking = await prisma.booking.create({
          data: {
            userId: userId,
            hotelId: hotelId,
            roomId: roomId,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            numberOfGuests: numberOfGuests,
            totalPrice: totalPricePerIndividualBooking,
            status: BookingStatus.PENDING,
            paymentId: payment.id,
          },
        });
        createdBookingIds.push(booking.id);
      }

      // Devolver éxito con los IDs de pago y reserva para el siguiente paso (ej. checkout de Stripe)
      return {
        success: true,
        message: `Successfully created ${numberOfRooms} booking(s) for a total of ${totalPaymentAmount.toFixed(2)} USD. Proceed to payment.`,
        paymentId: payment.id,
        bookingIds: createdBookingIds,
      };
    });

    return result;

  } catch (error) {
    console.error("Error creating booking:", error);
    // Este bloque catch solo debería capturar errores inesperados, ya que los errores de validación esperados se devuelven directamente.
    return {
      success: false,
      message: "Ocurrió un error inesperado al crear la reserva. Por favor, inténtalo de nuevo.",
      errors: { general: ["Ocurrió un error inesperado al crear la reserva. Por favor, inténtalo de nuevo."] }
    };
  }
}

// Esquema de validación para modificar una reserva
const ModificarBookingSchema = z.object({
  checkInDate: z.string().datetime({ message: "Formato de fecha de check-in inválido." }).optional(),
  checkOutDate: z.string().datetime({ message: "Formato de fecha de check-out inválido." }).optional(),
  numberOfGuests: z.number().int().positive("El número de huéspedes debe ser un entero positivo.").optional(),
  specialRequests: z.string().optional(),
}).refine(data => {
  // Si ambas fechas están presentes, checkOutDate debe ser posterior a checkInDate
  if (data.checkInDate && data.checkOutDate) {
    return new Date(data.checkInDate) < new Date(data.checkOutDate);
  }
  return true; // Si solo una o ninguna fecha está presente, la validación a nivel de campo se encarga
}, {
  message: "La fecha de check-out debe ser posterior a la fecha de check-in.",
  path: ["checkOutDate"],
});

// Define el tipo para el estado de la respuesta de la Server Action de modificación de reserva
export type ModificarBookingActionState = {
  success: boolean;
  message: string;
  booking?: Prisma.BookingGetPayload<{
    include: {
      hotel: { select: { name: true, city: true } };
      room: { select: { roomType: true } };
    };
  }>;
  errors?: { [key: string]: string[] | undefined };
  errorType?: 'auth' | 'validation' | 'not_found' | 'forbidden' | 'conflict' | 'server_error' | 'capacity' | 'price_error' | 'date_error' | 'state_error';
};

export async function modificarBookingAction(
  bookingId: string,
  formData: unknown
): Promise<ModificarBookingActionState> {
  if (!bookingId) {
    return { success: false, message: "Se requiere el ID de la reserva.", errorType: 'validation' };
  }

  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return { success: false, message: 'No autenticado. Por favor, inicia sesión.', errorType: 'auth' };
  }
  const userId = session.user.id;

  const validationResult = ModificarBookingSchema.safeParse(formData);
  if (!validationResult.success) {
    return {
      success: false,
      message: 'Datos de modificación inválidos.',
      errors: validationResult.error.flatten().fieldErrors,
      errorType: 'validation',
    };
  }

  const dataToUpdate = validationResult.data;

  if (Object.keys(dataToUpdate).length === 0) {
    return { success: false, message: "No se proporcionaron datos para modificar.", errorType: 'validation' };
  }

  try {
    const existingBooking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { room: true }, // Incluir la habitación para verificar capacidad y precio
    });

    if (!existingBooking) {
      return { success: false, message: "Reserva no encontrada.", errorType: 'not_found' };
    }

    if (existingBooking.userId !== userId) {
      return { success: false, message: "No tienes permiso para modificar esta reserva.", errorType: 'forbidden' };
    }

    // Opcional: Verificar si la reserva está en un estado modificable
    if (existingBooking.status === BookingStatus.CANCELLED ||
        existingBooking.status === BookingStatus.COMPLETED ||
        existingBooking.status === BookingStatus.REJECTED) {
      return { success: false, message: `La reserva en estado ${existingBooking.status} no puede ser modificada.`, errorType: 'state_error' };
    }

    const finalData: Prisma.BookingUpdateInput = {};
    let priceNeedsRecalculation = false;

    const newCheckInDate = dataToUpdate.checkInDate ? new Date(dataToUpdate.checkInDate) : existingBooking.checkInDate;
    const newCheckOutDate = dataToUpdate.checkOutDate ? new Date(dataToUpdate.checkOutDate) : existingBooking.checkOutDate;

    if (dataToUpdate.checkInDate || dataToUpdate.checkOutDate) {
      if (newCheckInDate >= newCheckOutDate) {
        return { success: false, message: "La fecha de check-out debe ser posterior a la fecha de check-in.", errorType: 'date_error', errors: { checkOutDate: ["La fecha de check-out debe ser posterior a la fecha de check-in."] } };
      }
      finalData.checkInDate = newCheckInDate;
      finalData.checkOutDate = newCheckOutDate;
      priceNeedsRecalculation = true;

      // Verificar disponibilidad para nuevas fechas (excluyendo la reserva actual)
      const overlappingBooking = await db.booking.findFirst({
        where: {
          AND: [
            { roomId: existingBooking.roomId },
            { id: { not: bookingId } }, // Excluir la reserva actual
            { NOT: { status: { in: [BookingStatus.CANCELLED, BookingStatus.REJECTED] } } },
            { checkInDate: { lt: newCheckOutDate } },
            { checkOutDate: { gt: newCheckInDate } },
          ]
        },
      });
      if (overlappingBooking) {
        return { success: false, message: 'La habitación no está disponible para las nuevas fechas seleccionadas.', errorType: 'conflict' };
      }
    }

    if (dataToUpdate.numberOfGuests !== undefined) {
      if (dataToUpdate.numberOfGuests > existingBooking.room.capacity) {
        return { success: false, message: `El número de huéspedes (${dataToUpdate.numberOfGuests}) excede la capacidad de la habitación (${existingBooking.room.capacity}).`, errorType: 'capacity' };
      }
      finalData.numberOfGuests = dataToUpdate.numberOfGuests;
    }

    if (dataToUpdate.specialRequests !== undefined) {
      finalData.specialRequests = dataToUpdate.specialRequests || null;
    }

    if (priceNeedsRecalculation) {
      const roomPrice = existingBooking.room.pricePerNight;
 let numericPricePerNight: number;
 if (typeof roomPrice === 'object' && roomPrice !== null && typeof (roomPrice as { toNumber: () => number }).toNumber === 'function') {
        numericPricePerNight = (roomPrice).toNumber();
      } else if (typeof roomPrice === 'number') {
        numericPricePerNight = roomPrice;
      } else {
        return { success: false, message: 'Error al obtener el precio de la habitación para recalcular.', errorType: 'price_error' };
      }
      const nights = Math.ceil((newCheckOutDate.getTime() - newCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
      finalData.totalPrice = nights * numericPricePerNight;
    }

    const updatedBooking = await db.booking.update({
      where: { id: bookingId },
      data: finalData,
      include: { hotel: { select: { name: true, city: true } }, room: { select: { roomType: true } } },
    });

    revalidatePath('/my-bookings');
    return { success: true, message: "Reserva modificada exitosamente.", booking: updatedBooking };

  } catch (error) {
    console.error('Error al modificar la reserva:', error);
    return { success: false, message: 'Error interno del servidor al modificar la reserva.', errorType: 'server_error' };
  }
}

// Define el tipo para el estado de la respuesta de la Server Action de eliminación de reserva
export type DeleteBookingActionState = {
  success: boolean;
  message: string;
  errorType?: 'auth' | 'not_found' | 'forbidden' | 'server_error' | 'state_error' | 'invalid_input';
};

export async function deleteBookingAction(
  prevState: DeleteBookingActionState,
  formData: FormData
 ): Promise<DeleteBookingActionState> {
    const bookingId = formData.get('bookingId') as string;
  if (!bookingId) {
    return { success: false, message: "Se requiere el ID de la reserva.", errorType: 'invalid_input' };
  }

  const rawSession = await auth.api.getSession({ headers: await headers() });
  const session = rawSession as Session;

  if (!session?.user?.id) {
    return { success: false, message: 'No autenticado. Por favor, inicia sesión.', errorType: 'auth' };
  }
  const userId = session.user.id;

  try {
    const existingBooking = await db.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existingBooking) {
      return { success: false, message: "Reserva no encontrada.", errorType: 'not_found' };
    }

    if (existingBooking.userId !== userId) {
      // Opcionalmente, si los administradores pueden eliminar cualquier reserva, se añadiría una comprobación de rol aquí.
      return { success: false, message: "No tienes permiso para eliminar esta reserva.", errorType: 'forbidden' };
    }

    // Opcional: Verificar si la reserva está en un estado que permita la eliminación.
    // Por ejemplo, no permitir eliminar reservas ya completadas o canceladas a través de esta acción.
    // Esto depende de la lógica de negocio. Aquí asumimos que PENDING o CONFIRMED pueden ser eliminadas.
    if (existingBooking.status === BookingStatus.COMPLETED ||
        existingBooking.status === BookingStatus.CANCELLED ||
        existingBooking.status === BookingStatus.REJECTED) {
      return { success: false, message: `La reserva en estado ${existingBooking.status} no puede ser eliminada de esta manera.`, errorType: 'state_error' };
    }

    await db.booking.delete({
      where: { id: bookingId },
    });

    revalidatePath('/my-bookings'); // Revalidar la página donde el usuario ve sus reservas

    return { success: true, message: "Reserva eliminada exitosamente." };

  } catch (error) {
    console.error('Error al eliminar la reserva:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      // Esto podría ocurrir si la reserva fue eliminada entre la verificación y la operación de delete.
      return { success: false, message: "Reserva no encontrada para eliminar.", errorType: 'not_found' };
    }
    return { success: false, message: 'Error interno del servidor al eliminar la reserva.', errorType: 'server_error' };
  }
}

/////////

// Define el tipo para el resultado de getBookingById, incluyendo relaciones.
// Este tipo combina el tipo base `Booking` (que incluye todos los campos escalares como `confirmationEmailSent`)
// con los tipos de las relaciones `user` y `room` (que a su vez incluye `hotel`).
export type BookingWithDetails = Booking & {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'>;
  room: Room & {
    hotel: Pick<Hotel, 'id' | 'name' | 'city' | 'images' | 'address' | 'country'>;
  };
};

/**
 * Obtiene los detalles completos de una reserva por su ID.
 * @param bookingId El ID de la reserva a buscar.
 * @returns Una promesa que se resuelve con los detalles de la reserva o null si no se encuentra o hay un error.
 */
export async function getBookingById(bookingId: string): Promise<BookingWithDetails | null> {
  if (!bookingId) {
    console.warn("getBookingById fue llamado sin un bookingId.");
    return null;
  }

  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { // Detalles de la habitación
          include: {
            hotel: { select: { id: true, name: true, city: true, images: true, address: true, country: true } }, // Detalles del hotel a través de la habitación
          },
        },
        user: { select: { id: true, name: true, email: true, image: true } }, // Detalles del usuario que hizo la reserva
      },
    });
    return booking; // Devuelve la reserva encontrada o null si no existe
  } catch (error) {
    console.error(`Error al obtener la reserva por ID (${bookingId}):`, error);
    return null; // Devolver null en caso de cualquier error
  }
}
