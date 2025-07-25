
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe'; // Asegúrate de tener configurado el cliente de Stripe
import { z } from 'zod';

// Esquema de validación para el cuerpo de la petición
const paymentSchema = z.object({
  bookingIds: z.array(z.string()).min(1, "At least one booking ID is required."),
  totalPrice: z.number().positive("Total price must be a positive number."),
  currency: z.string().min(3, "Currency is required.").default('usd'),
  hotelName: z.string().min(1, "Hotel name is required."),
  hotelImage: z.string().optional(), // We'll construct the full URL before sending to Stripe
});

export async function POST(request: Request) {
  // --- MEJORA: Validar la existencia de la URL base ---
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    console.error("FATAL: NEXT_PUBLIC_BASE_URL environment variable is not set.");
    return NextResponse.json({ error: "Server configuration error: Base URL is missing." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validation = paymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const { bookingIds, totalPrice, currency, hotelName } = validation.data;
    let hotelImage = validation.data.hotelImage;

    // Stripe requires absolute URLs for images.
    // If a relative path (e.g., /images/foo.jpg) is provided, construct the full URL.
    if (hotelImage && hotelImage.startsWith('/')) {
      hotelImage = `${baseUrl}${hotelImage}`;
    }

    // Log para depuración: Verificar la URL final de la imagen antes de enviarla a Stripe.
    console.log("Final image URL being sent to Stripe:", hotelImage);

    // Las URLs de éxito y cancelación deben ser absolutas
    const successUrl = `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/bookings`; // Volver a la página de reservas si cancela

    // Crear la sesión de Checkout de Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              images: hotelImage ? [hotelImage] : [], // Stripe expects an array of URLs. Pass empty array if no image.
              name: `Reserva en ${hotelName}`,
              description: `Pago por reserva(s): ${bookingIds.join(', ')}`,
            },
            // El precio debe estar en la unidad más pequeña (céntimos para EUR/USD)
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Metadata para la sesión de checkout (útil para depuración).
      metadata: {
        bookingIds: JSON.stringify(bookingIds),
      },
      // ¡CRÍTICO! Pasamos los metadatos al PaymentIntent.
      // Esto asegura que el webhook 'payment_intent.succeeded' reciba los IDs de las reservas.
      payment_intent_data: {
        metadata: {
          bookingIds: JSON.stringify(bookingIds),
        },
      },
    });

    // Devolvemos la URL de la sesión para que el frontend pueda redirigir al usuario
    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("Error creating Stripe session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}