"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { passwordFormSchema } from "@/lib/auth-schema";


export default function SignInForm() {
  const route = useRouter();
  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: "",
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: z.infer<typeof passwordFormSchema>) {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      toast.error("Token not found in the URL");
      return
    }
    
    await authClient.resetPassword({ 
      newPassword: values.password,
      token,
     },{
      
      onSuccess() {
        toast.success("Success! Now you can sign-in");
        route.push("/sign-in");
      },
      onError(ctx) {
        toast.error(ctx.error.message);
      },
    });
   
  }

  return (
    <div className="flex items-center justify-center m-auto">
      <Card className="w-full max-w-md my-14 border-gray-700 bg-black/30 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-gray-100">Reset Password</CardTitle>
          <CardDescription>
            Please enter your new password to reset your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="mb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-100">Password</FormLabel>
                    <FormControl>
                      <Input placeholder="#$TYWv35w5344gf" {...field}
                      className="text-gray-100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isSubmitting ? (
                <Button type="submit">Reset Now</Button>
              ) : (
                <Loader2 className="animate-spin" />
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
