 "use server"
 
 import type Stripe from 'stripe';
 import { db } from '@/lib/prisma';
 import { Prisma } from '@prisma/client';
 import { transporter } from '@/lib/mail';
 import { BookingStatus, PaymentStatus } from '@prisma/client';
 import { stripe } from '@/lib/stripe';
 import { type BookingWithDetails } from '@/lib/data/booking-actions';
 /**
 * Extrae y valida de forma segura los IDs de reserva desde los metadatos de Stripe.
 * @param metadata - El objeto de metadatos de Stripe.
 * @param sourceId - El ID del objeto de Stripe (ej. sesión o payment intent) para logging.
 * @param sourceType - El tipo del objeto de Stripe para logging.
 * @returns Un array de strings con los IDs de reserva, o null si no se encuentran o hay un error.
 */
 function getBookingIdsFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
  sourceId: string,
  sourceType: string
 ): string[] | null {
  const bookingIdsString = metadata?.bookingIds;

  if (!bookingIdsString) {
    return null;
  }

  try {
    const bookingIds = JSON.parse(bookingIdsString);
    if (!Array.isArray(bookingIds) || bookingIds.length === 0 || !bookingIds.every(id => typeof id === 'string')) {
      throw new Error("Los 'bookingIds' parseados no son un array válido de strings no vacío.");
    }
    return bookingIds;
  } catch (error) {
    console.error(`Error al parsear 'bookingIds' desde ${sourceType} ${sourceId}. Valor: "${bookingIdsString}". Error:`, error);
    return null;
  }
 }
 
 /**
  * Maneja el evento 'checkout.session.completed' de Stripe.
  * Esta es la función principal para confirmar una reserva después de un pago exitoso.
  * Actualiza el estado de la reserva a 'CONFIRMED' y guarda el ID del Payment Intent.
  *
  * @param session - El objeto Checkout.Session del evento de Stripe.
  */
 export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
   console.log(`Procesando checkout.session.completed para la sesión: ${session.id}`);
 
   // 1. Verificar si el pago fue exitoso
  if (session.payment_status !== 'paid') {
    console.log(`La sesión ${session.id} no tiene un estado de pago 'paid' (estado actual: ${session.payment_status}). No se procesará la reserva.`);
    return;
  }
 
   // 2. Extraer metadatos
  const stripePaymentIntentId = session.payment_intent as string;
  const bookingIds = getBookingIdsFromMetadata(session.metadata, session.id, 'checkout.session');

  if (!bookingIds) {
    console.error(`Error Crítico: No se encontraron 'bookingIds' en los metadatos de la sesión de Stripe ${session.id}. No se puede actualizar la reserva.`);
    // Considera enviar una alerta aquí (ej. Sentry, etc.)
    return;
  }

  if (!stripePaymentIntentId) {
    console.error(`Error Crítico: No se encontró 'payment_intent' en la sesión de Stripe ${session.id}.`);
    return;
  }

  try {
    // Reutilizar la lógica de pago exitoso
    await processSuccessfulPayment(
      bookingIds,
      stripePaymentIntentId,
      'checkout.session.completed'
    );
  } catch (error) {
    console.error(`Error de base de datos al actualizar la(s) reserva(s) y/o pago(s) para la sesión de Stripe ${session.id}:`, error);
    // Lanza un error para que Stripe pueda reintentar el webhook.
    throw new Error(`Error de base de datos al procesar el webhook para la sesión ${session.id}`);
  }
}
 
 /**
  * Maneja el evento 'payment_intent.succeeded' de Stripe.
  * Puede servir como un respaldo para 'checkout.session.completed' o para flujos de pago
  * que no utilizan Checkout Sessions. La lógica es similar y debe ser idempotente.
  *
  * @param paymentIntent - El objeto PaymentIntent del evento de Stripe.
  */
 export async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Procesando payment_intent.succeeded para el Payment Intent: ${paymentIntent.id}`);

  const bookingIds = getBookingIdsFromMetadata(paymentIntent.metadata, paymentIntent.id, 'payment_intent');

  if (!bookingIds) {
    console.warn(`No se encontraron 'bookingIds' en los metadatos del Payment Intent ${paymentIntent.id}. Se omite la actualización. Esto puede ser normal si el pago no está relacionado con una reserva.`);
    return;
  }

  try {
    await processSuccessfulPayment(
      bookingIds,
      paymentIntent.id,
      'payment_intent.succeeded'
    );
  } catch (error) {
    console.error(`Error de base de datos al actualizar la(s) reserva(s) para el Payment Intent ${paymentIntent.id}:`, error);
    throw new Error(`Error de base de datos al procesar el webhook para el Payment Intent ${paymentIntent.id}`);
  }
}

//Funcion para no repetir codigo
async function processSuccessfulPayment(
  bookingIds: string[],
  stripePaymentIntentId: string,
  sourceEvent: string
) {
  // Definimos una variable para almacenar los datos de la reserva para el correo.
  // La poblaremos dentro de la transacción y la usaremos fuera de ella.
  let bookingsForEmail: Awaited<ReturnType<typeof getBookingsForEmail>> = [];

  await db.$transaction(async (prisma) => {
    // 1. Actualizar las reservas
    const bookingUpdateResult = await prisma.booking.updateMany({
      where: {
        id: { in: bookingIds },
        // Importante: Solo actualizar si el estado es PENDING.
        // Esto hace que la operación sea idempotente. Si el webhook se reintenta,
        // no volverá a procesar una reserva ya CONFIRMED.
        status: BookingStatus.PENDING,
      },
      data: {
        status: BookingStatus.CONFIRMED,
      },
    });

    if (bookingUpdateResult.count > 0) {
      console.log(`[${sourceEvent}] Se confirmaron ${bookingUpdateResult.count} reserva(s). IDs: ${bookingIds.join(', ')}`);
    } else {
      console.log(`[${sourceEvent}] No se encontraron reservas PENDING para actualizar. Posiblemente ya fueron procesadas.`);
    }

    // 2. Actualizar los pagos asociados
    const bookingsWithPaymentIds = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { paymentId: true },
    });

    const paymentIdsToUpdate = bookingsWithPaymentIds
      .map(b => b.paymentId)
      .filter((id): id is string => !!id); // Filtra nulos/undefined y asegura el tipo string

    if (paymentIdsToUpdate.length > 0) {
      const paymentUpdateResult = await prisma.payment.updateMany({
        where: { 
          id: { in: paymentIdsToUpdate }, 
          status: PaymentStatus.PENDING 
        },
        data: { status: PaymentStatus.SUCCEEDED, stripePaymentIntentId: stripePaymentIntentId },
      });
      console.log(`[${sourceEvent}] Se actualizaron ${paymentUpdateResult.count} registros de Payment a SUCCEEDED para el Payment Intent ${stripePaymentIntentId}.`);
    } else {
      console.log(`[${sourceEvent}] No se encontraron registros de Payment PENDING para actualizar.`);
    }

    // 3. Obtener los datos para el correo DENTRO de la transacción para asegurar consistencia.
    bookingsForEmail = await getBookingsForEmail(bookingIds, prisma);
  });

  // --- La transacción ha terminado ---

  // 4. Enviar correo de confirmación FUERA de la transacción.
  // Si esto falla, no afectará el estado de la base de datos que ya fue confirmado.
  if (bookingsForEmail.length === 0 || !bookingsForEmail[0].user?.email) {
    console.error(`[${sourceEvent}] No se pudo enviar el correo: no se encontraron reservas o el usuario no tiene email. Booking IDs: ${bookingIds.join(', ')}`);
    return;
  }

  try {
    const customerEmail = bookingsForEmail[0].user.email;
    const customerName = bookingsForEmail[0].user.name || 'Cliente';

    const emailSubject = '✅ Confirmación de tu Reserva en Hotel.SA';
    let emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #0056b3;">¡Hola, ${customerName}!</h1>
        <p>Tu pago ha sido procesado exitosamente y tu reserva ha sido confirmada. ¡Gracias por elegirnos!</p>
        <h2 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Detalles de tu Reserva</h2>
    `;

    bookingsForEmail.forEach(booking => {
      emailHtml += `
        <div style="background-color: #f9f9f9; border-left: 4px solid #0056b3; padding: 15px; margin-bottom: 20px;">
          <p><strong>Hotel:</strong> ${booking.hotel.name}</p>
          <p><strong>Ubicación:</strong> ${booking.hotel.address}, ${booking.hotel.city}</p>
          <p><strong>Check-in:</strong> ${booking.checkInDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>Check-out:</strong> ${booking.checkOutDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p><strong>Precio Total:</strong> $${booking.totalPrice.toFixed(2)} USD</p>
          <p><strong>ID de Reserva:</strong> ${booking.id}</p>
        </div>
      `;
    });

    emailHtml += `
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <p>¡Esperamos verte pronto!</p>
        <p>Atentamente,<br/><strong>El equipo de Hotel.SA</strong></p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.USER_MAIL,
      to: customerEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log(`[${sourceEvent}] Correo de confirmación enviado a ${customerEmail} para las reservas: ${bookingIds.join(', ')}`);

    // 5. Si el correo se envió con éxito, marcamos la reserva en la base de datos.
    // Esto se hace fuera de la transacción principal para no revertir la confirmación del pago si el envío de correo falla.
    await db.booking.updateMany({
      where: { id: { in: bookingIds } },
      data: { confirmationEmailSent: true },
    });
    console.log(`[${sourceEvent}] Se marcó 'confirmationEmailSent = true' para las reservas: ${bookingIds.join(', ')}`);
  } catch (emailError) {
    console.error(`[${sourceEvent}] La actualización de la base de datos fue exitosa, pero falló el envío del correo de confirmación para las reservas ${bookingIds.join(', ')}. Error:`, emailError);
    // No relanzamos el error para no hacer que la transacción falle. El pago ya está hecho.
    // Es importante monitorear estos errores para poder reenviar correos si es necesario.
  }
}

/**
 * Función auxiliar para obtener los datos de la reserva necesarios para el correo.
 * Se puede llamar desde dentro de una transacción de Prisma.
 * @param bookingIds - Array de IDs de reserva.
 * @param prisma - Instancia del cliente de Prisma (puede ser la de la transacción).
 */
async function getBookingsForEmail(bookingIds: string[], prisma: Parameters<Parameters<typeof db.$transaction>[0]>[0]) {
  return await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    include: {
      user: { select: { email: true, name: true } },
      hotel: { select: { name: true, address: true, city: true } },
    },
  });
}

/**
 * Maneja el evento 'payment_intent.payment_failed' de Stripe.
 * Actualiza el estado de la reserva a 'REJECTED' para que se pueda liberar la habitación.
 *
 * @param paymentIntent - El objeto PaymentIntent del evento de Stripe.
 */
export async function handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Procesando payment_intent.payment_failed para el Payment Intent: ${paymentIntent.id}`);

  const lastPaymentError = paymentIntent.last_payment_error?.message;
  const bookingIds = getBookingIdsFromMetadata(paymentIntent.metadata, paymentIntent.id, 'payment_intent (failed)');

  if (!bookingIds) {
    console.warn(`No se encontraron 'bookingIds' en los metadatos del Payment Intent fallido ${paymentIntent.id}. Se omite la actualización.`);
    return;
  }

  try {
    // Lógica específica para pagos fallidos
    await db.$transaction(async (prisma) => {
      // 1. Actualizar el estado de la reserva a REJECTED
      const bookingUpdateResult = await prisma.booking.updateMany({
        where: {
          id: { in: bookingIds },
          status: BookingStatus.PENDING,
        },
        data: {
          status: BookingStatus.REJECTED,
        },
      });

      if (bookingUpdateResult.count > 0) {
        console.log(`Se marcaron como REJECTED ${bookingUpdateResult.count} reserva(s) asociadas al Payment Intent fallido ${paymentIntent.id}. Motivo: ${lastPaymentError || 'No especificado'}`);
      } else {
        console.log(`No se encontraron reservas PENDING para el Payment Intent fallido ${paymentIntent.id}.`);
      }

      // 2. Encontrar los IDs de pago asociados y actualizar su estado a FAILED
      const bookingsWithPaymentIds = await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        select: { paymentId: true },
      });

      const paymentIdsToUpdate = bookingsWithPaymentIds
        .map(b => b.paymentId)
        .filter((id): id is string => !!id); // Filtra nulos/undefined y asegura el tipo string

      if (paymentIdsToUpdate.length > 0) {
        await prisma.payment.updateMany({
          where: { id: { in: paymentIdsToUpdate }, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED, stripePaymentIntentId: paymentIntent.id },
        });
        console.log(`Se actualizaron ${paymentIdsToUpdate.length} registros de Payment a FAILED para el Payment Intent fallido ${paymentIntent.id}.`);
      }
    });
  } catch (error) {
    console.error(`Error de base de datos al actualizar la(s) reserva(s) para el Payment Intent fallido ${paymentIntent.id}:`, error);
    throw new Error(`Error de base de datos al procesar el webhook para el Payment Intent fallido ${paymentIntent.id}`);
  }
}

export async function getBookingByStripeSessionId(sessionId: string): Promise<BookingWithDetails | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
 
    // Se prioriza la obtención de IDs desde los metadatos, que es el método usado por los webhooks.
    // Esto unifica la lógica y hace que el sistema sea más robusto.
    const bookingIds = getBookingIdsFromMetadata(session.metadata, sessionId, 'getBookingByStripeSessionId');
 
    if (!bookingIds) {
      console.error(`No se encontraron 'bookingIds' en los metadatos de la sesión de Stripe ${sessionId}. No se puede obtener la reserva.`);
      return null;
    }

    // 1. Obtenemos la reserva con la estructura de 'include' correcta, que coincide con BookingWithDetails.
    const booking = await db.booking.findFirst({
      where: { id: bookingIds[0] },
      // La estructura del 'include' debe coincidir con la definición del tipo 'BookingWithDetails'
      // para evitar errores de tipo en el frontend.
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        room: {
          include: {
            hotel: { select: { id: true, name: true, city: true, images: true, address: true, country: true } },
          },
        },
      },
    });

    if (!booking) {
      return null;
    }

    // 2. Convertimos los campos Decimal a number para que el objeto sea serializable.
    // Esto evita el error "Only plain objects can be passed to Client Components".
    const serializableBooking = {
      ...booking,
      totalPrice: booking.totalPrice.toNumber(),
      room: {
        ...booking.room,
        pricePerNight: booking.room.pricePerNight.toNumber(),
      },
    };

    // Devolvemos el objeto serializable. El cast a 'any' es para reconciliar la diferencia
    // entre Decimal y number, ya que la estructura del objeto es la misma.
    return {
      ...serializableBooking,
      totalPrice: new Prisma.Decimal(serializableBooking.totalPrice),
      room: {
        ...serializableBooking.room,
        pricePerNight: new Prisma.Decimal(serializableBooking.room.pricePerNight),
      },
    } as BookingWithDetails;
  } catch (error) {
    console.error(`Error fetching booking by session ID ${sessionId}:`, error);
    return null;
  }
}
