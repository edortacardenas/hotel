import Stripe from 'stripe';

// Carga la clave secreta de Stripe desde las variables de entorno.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY; // Asegúrate de que esta variable de entorno esté configurada.

let stripe: Stripe;

// Es crucial que la clave secreta esté definida.
if (!stripeSecretKey) {
  if (process.env.NODE_ENV === 'production') {
    // En producción, es un error crítico si la clave no está.
    console.error('CRITICAL ERROR: STRIPE_SECRET_KEY is not set in environment variables. Stripe functionality will be disabled.');
    // Podrías optar por lanzar un error aquí para detener el inicio de la aplicación
    // si la funcionalidad de Stripe es absolutamente esencial.
    // throw new Error('CRITICAL: STRIPE_SECRET_KEY is not set. Application cannot start.');
  } else {
    // En desarrollo, un mensaje de advertencia puede ser suficiente,
    // aunque la funcionalidad de Stripe no operará.
    console.warn('WARNING: STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled during development.');
  }
  }

if (stripeSecretKey) {
  console.log(`Stripe client initialized`);
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,        // Habilita el soporte mejorado para TypeScript.
    // telemetry: false,     // Opcional: Deshabilita el envío de telemetría a Stripe si lo deseas.
  });
}

export { stripe }; // Exporta la instancia de stripe (puede ser undefined si la clave no está)
