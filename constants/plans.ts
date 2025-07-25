// Datos de ejemplo para los planes

interface PlanData {
  id: string;
  name: string;
  description?: string;
  priceId: string;
  
  priceSuffix: string;
  limits: {
    tokens: number; // Límite de tokens, puedes agregar más límites si es necesario
  };
  features: PlanFeature[];
  price: Number;
  isRecommended?: boolean;
  ctaText?: string;
}

export interface PlanFeature {
  text: string;
  included: boolean;
}

export const plans: PlanData[] = [
    {
      id: "basic",
      name: "Basic",
      description: "Ideal para empezar y explorar nuestras funcionalidades.",
      priceId: "price_1RYUChJpjqh4SIHhbsakDRlZ", // Reemplaza con tu ID de precio real de Stripe
      priceSuffix: "/mes",
      limits: {
        tokens: 100,
      },
      features: [
        { text: "Característica A", included: true },
        { text: "Característica B", included: true },
        { text: "Característica C", included: false },
        { text: "Soporte Básico", included: true },
      ],
      
      price: 9.99,
      ctaText: "Empezar",
    },
    {
      id: "pro",
      name: "Pro",
      description: "Para profesionales que necesitan más potencia y características.",
      priceId: "price_1RYUDyJpjqh4SIHhbMglYfhC", // Reemplaza con tu ID de precio real de Stripe
      priceSuffix: "/mes",
      limits: {
        tokens: 300,
      },
      features: [
        { text: "Todas las características Básicas", included: true },
        { text: "Característica C", included: true },
        { text: "Característica D", included: true },
        { text: "Soporte Prioritario", included: true },
      ],
      price: 29.99,
      isRecommended: true,
      ctaText: "Elegir Pro",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Soluciones a medida para grandes organizaciones.",
      priceId: "price_1RYUEJJpjqh4SIHhHzqFJqU0", // O maneja de forma diferente si es por contacto
      priceSuffix: "/mes",
      limits: {
        tokens: 900,
      },
      features: [
        { text: "Todas las características Pro", included: true },
        { text: "Característica E", included: true },
        { text: "Soporte Dedicado 24/7", included: true },
        { text: "SLA Personalizado", included: true },
      ],
      price: 49.99,
      ctaText: "Contactar Ventas",
    },
  ];