"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { forgetPasswordFormSchema } from "@/lib/auth-schema"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Dispatch, SetStateAction } from "react";
import { Loader2 } from "lucide-react";


const ForgetPasswordForm = ({
setIsDialogOpen,
}: {setIsDialogOpen: Dispatch<SetStateAction<boolean>>}) => {

    const form = useForm<z.infer<typeof forgetPasswordFormSchema>>({
      resolver: zodResolver(forgetPasswordFormSchema),
      defaultValues: {
        email: "",
      },
    });
  
    const {
      formState: { isSubmitting },
    } = form;
  
    async function onSubmit(values: z.infer<typeof forgetPasswordFormSchema>) {
        
      await authClient.forgetPassword({
        email: values.email,
        redirectTo: "/reset-password",
      },{
        onSuccess() {
          toast.success("Please verify your email to reset password.");
          setIsDialogOpen(false);
        },
        onError(ctx) {
          const errorMessage = ctx.error.message || "Ocurrió un error inesperado.";
          toast.error("Error al cambiar la contraseña", {
            description: errorMessage,
          });
        },
      });
      
    }
  
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="faizan@gmail.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isSubmitting ? (
            <Button type="submit">Send Reset Email</Button>
          ) : (
            <Loader2 className="animate-spin" />
          )}
        </form>
      </Form>
    );
  }


export default ForgetPasswordForm;
  