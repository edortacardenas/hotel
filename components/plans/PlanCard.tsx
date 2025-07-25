import { Button } from "@/components/ui/button"; // Ajusta la ruta según tu proyecto
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckIcon } from "lucide-react"; // O cualquier otro ícono de check
import {PlanFeature} from "../../constants/plans"; // Ajusta la ruta según tu proyecto


interface PlanCardProps {
  name: string;
  description?: string;
  price: number;
  priceSuffix: string; // ej. "/mes" o "/año"
  features: PlanFeature[];
  stripePriceId: string;
  onSubscribe: (stripePriceId: string) => Promise<void>; // Función para manejar la suscripción
  isRecommended?: boolean;
  ctaText?: string; // Texto del botón, ej. "Empezar" o "Suscribirse"
  isLoading?: boolean; // Para el estado de carga del botón
}

export function PlanCard({
  name,
  description,
  price,
  priceSuffix,
  features,
  stripePriceId,
  onSubscribe,
  isRecommended,
  ctaText = "Suscribirse",
  isLoading,
}: PlanCardProps) {
  return (
    <Card
      className={`flex flex-col h-full ${
        isRecommended ? "border-primary border-2 shadow-xl" : "shadow-md"
      }`}
    >
      <CardHeader className="pb-4">
        {isRecommended && (
          <Badge variant="default" className="w-fit mb-3 self-start">
            Recomendado
          </Badge>
        )}
        <CardTitle className="text-2xl font-semibold">{name}</CardTitle>
        {description && (
          <CardDescription className="pt-1 min-h-[40px]">{description}</CardDescription>
        )}
        <div className="mt-4">
          <span className="text-4xl font-bold tracking-tight">{`$`+price}</span>
          <span className="text-sm font-medium text-muted-foreground ml-1">
            {priceSuffix}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start text-sm">
              <CheckIcon
                className={`h-5 w-5 mr-2 flex-shrink-0 ${
                  feature.included ? "text-green-500" : "text-muted-foreground"
                }`}
              />
              <span className={!feature.included ? "line-through text-muted-foreground" : ""}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto pt-6">
        <Button
          className="w-full"
          variant={isRecommended ? "default" : "outline"}
          size="lg"
          onClick={() => onSubscribe(stripePriceId)}
          disabled={isLoading}
        >
          {isLoading ? "Procesando..." : ctaText}
        </Button>
      </CardFooter>
    </Card>
  );
}
