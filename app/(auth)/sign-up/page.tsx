"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

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
import { signUpSchema } from "@/lib/auth-schema"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { GithubButton } from "../sign-in/oauth-button"



//import { useRouter } from "next/navigation"
import { useState } from "react"

const SignUp = () => {

  //const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

    // 1. Define your form.
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })
 
  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    const { name, email, password} = values
    //const toastId = toast.loading("Signing up...");
    await authClient.signUp.email({
      email,
      password,
      name,
    },{
      onSuccess: () => {
        form.reset()
        toast.success("Signed up successfully! Correo de verificación enviado a tu correo electrónico.");
        //router.push("/sign-in");
      },
      onError(ctx) {
        if (ctx.error?.message?.includes("User already exists")) {
          // ¡Aquí está la mejora!
          toast.error("El usuario ya existe. Por favor, inicia sesión o utiliza otro correo electrónico para registrarte.");
        }else {
          toast.error(ctx.error.message);
        }  
        
        setIsLoading(false);
      },
    } );

  }

    return (
      <div className="flex items-center justify-center m-auto">
        <Card className="w-full max-w-md my-14 border-gray-700 bg-black/30 backdrop-blur-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gray-100">Sign Up</CardTitle>
                <CardDescription>
                    Create your account to get started
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-gray-100">Name</FormLabel>
                        <FormControl>
                            <Input placeholder="John Doe" {...field} type="text" className="text-gray-100"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-gray-100">Email</FormLabel>
                        <FormControl>
                            <Input placeholder="john@gmail.com" {...field} type="email" className="text-gray-100"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-gray-100">Password</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter your password" {...field} type="password" className="text-gray-100"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <Button className="w-full mt-3" type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign up
                    </Button>
                </form>
                </Form>
                <GithubButton />
            </CardContent>

            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground mb-4">
                    Already have an account{' '}
                    <Link href="/sign-in" className="text-gray-100 hover:underline">
                      Sign in
                    </Link>
                </p>
            </CardFooter>
        </Card>
      </div>
    )
  }
  
  export default SignUp