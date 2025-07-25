import type { Stripe } from 'stripe';
import { stripe } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import {
  handleFailedPayment,
  handleCheckoutSessionCompleted
} from '@/lib/data/stripe-actions';

// Asegúrate de que esta variable de entorno esté configurada con el secreto
// de firma de tu endpoint de webhook de Stripe.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Deshabilitar el bodyParser de Next.js para esta ruta específica.
// Stripe necesita recibir el cuerpo de la solicitud en formato "raw" (sin procesar)
// para poder verificar la firma.
export const config = {
  api: {
    bodyParser: false,
  },
};

// --- Manejador principal del Webhook ---

export async function POST(req: NextRequest) {
  console.log(`[${new Date().toISOString()}] Stripe webhook received: ${req.method} ${req.nextUrl.pathname}`);
  // 1. Verificar que el cliente Stripe y el secreto del webhook estén configurados
  if (!stripe) {
    console.error('Cliente Stripe no inicializado. No se pueden procesar webhooks.');
    return NextResponse.json({ error: 'Configuración del servidor incorrecta: Stripe no disponible.' }, { status: 500 });
  }
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurado. No se pueden procesar webhooks.');
    return NextResponse.json({ error: 'Configuración del servidor incorrecta: Falta el secreto del webhook.' }, { status: 500 });
  }

  // 2. Obtener el cuerpo de la solicitud y la firma de Stripe
  const buf = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    console.warn('No se encontró la cabecera stripe-signature.');
    return NextResponse.json({ error: 'Falta la firma de Stripe.' }, { status: 400 });
  }

  let event: Stripe.Event;

  // 3. Construir el evento verificando la firma
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`Error al verificar la firma del webhook: ${errorMessage}`);
    return NextResponse.json({ error: `Error de Webhook: ${errorMessage}` }, { status: 400 });
  }

  // 4. Manejar los tipos de evento específicos
  console.log('Evento de Stripe recibido:', event.type, event.id);
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        //await handleSuccessfulPayment(event.data.object as Stripe.PaymentIntent);
        console.log(`[Webhook] Evento 'payment_intent.succeeded' recibido y omitido para evitar duplicados.`);
        break;
      case 'payment_intent.payment_failed':
        await handleFailedPayment(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Tipo de evento no manejado: ${event.type}`);
    }
  } catch (handlerError) {
    console.error(`Error al procesar el evento ${event.id} (tipo: ${event.type}):`, handlerError);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}