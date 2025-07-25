"use client"; // Necesario para react-hook-form y manejo de estado

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Toaster, toast } from "sonner";

const contactFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, introduce un correo electrónico válido." }),
  subject: z.string().min(5, { message: "El asunto debe tener al menos 5 caracteres." }),
  message: z.string().min(10, { message: "El mensaje debe tener al menos 10 caracteres." }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  async function onSubmit(data: ContactFormValues) {
    setIsLoading(true);
    console.log('Datos del formulario a enviar:', data);

    try {
      // Llamada a la API para enviar el correo electrónico
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Intenta parsear el mensaje de error del backend
        throw new Error(errorData.message || `Error HTTP! Estado: ${response.status}`);
      }

      toast.success("¡Mensaje enviado! Gracias por contactarnos.");
      form.reset(); // Resetea el formulario después del envío
    } catch (error: any) { // Usamos 'any' para el tipo de error o puedes usar 'instanceof Error'
      console.error("Error al enviar el formulario:", error); // Log del error completo para depuración
      toast.error(`Hubo un error al enviar tu mensaje: ${error.message || 'Error desconocido'}. Por favor, inténtalo de nuevo más tarde.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-transparent flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border bg-background/90 shadow-2xl backdrop-blur-sm dark:bg-background/80">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Contáctanos</CardTitle>
          <CardDescription>
            ¿Tienes alguna pregunta o comentario? Completa el formulario y nos pondremos en contacto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl><Input placeholder="Tu nombre completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl><Input type="email" placeholder="tu@correo.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <FormControl><Input placeholder="Asunto de tu mensaje" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensaje</FormLabel>
                    <FormControl><Textarea placeholder="Escribe tu mensaje aquí..." rows={5} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mb-8" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar Mensaje"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Toaster richColors />
    </div>
  );
}