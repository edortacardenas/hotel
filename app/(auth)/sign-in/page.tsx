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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"
import { signInSchema } from "@/lib/auth-schema"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { GithubButton } from "./oauth-button"
import { useState } from "react"
import { useRouter } from "next/navigation";
import  ForgotPasswordForm  from "../forgot-password/page"

const SignIn = () => {
  const route = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 1. Define your form.
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })
 
  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setIsLoading(true);
    const {email, password } = values
    //const toastId = toast.loading("Signing in...");

    await authClient.signIn.email({
      email,
      password,
      rememberMe: false,
    },{
      onSuccess: async() => {
        toast.success("Signed in successfully!");
        route.push('/');
      },
      onError(ctx) {
        // Maneja el error genérico de credenciales inválidas de forma más útil
        if (ctx.error.message.includes("Invalid email or password")) {
          toast.error("Credenciales inválidas. Si te registraste con GitHub, usa 'Forgot Password' para establecer una.");
        } else if (ctx.error.status === 403) {
          toast.error("Please verify your email address to sign in.");
        } else {
          toast.error(ctx.error.message);
        }
        setIsLoading(false);
        },
      },
    ); 
  }

    return (
      <div className="flex items-center justify-center m-auto">
        <Card className="w-full max-w-md my-14 border-gray-700 bg-black/30 backdrop-blur-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gray-100">Sign In</CardTitle>
                <CardDescription>
                    Welcome back! Please sign in to continue.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-100">Email</FormLabel>
                          <FormControl>
                              <Input 
                                placeholder="john@gmail.com" {...field} 
                                type='email'
                                disabled={isLoading}
                                className="text-gray-100"
                              />
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
                          <div className="flex justify-between items-center">
                            <FormLabel className="text-gray-100">Password</FormLabel>
                            <Button
                              type="button"
                              variant="link"
                              className="p-0 h-auto text-xs  text-gray-100"
                              onClick={() => setIsDialogOpen(true)}
                              disabled={isLoading}
                            >
                              Forgot Password?
                            </Button>
                          </div>
                          <FormControl>
                              <Input 
                                placeholder="Enter your password" 
                                {...field} 
                                type='password'
                                disabled={isLoading}
                                className="text-gray-100"
                              />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button className="w-full mt-3" type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                </form>
                </Form>
                <GithubButton />
            </CardContent>

            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground mb-4">
                    Don&apos;t have an account yet?{' '}
                    <Link href="/sign-up" className="text-gray-100 hover:underline">
                      Sign up
                    </Link>
                </p>
            </CardFooter>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent aria-describedby="Dialogo" className="sm:max-w-[425px]">
          <DialogHeader>
                <DialogTitle>Reset your password</DialogTitle>
          </DialogHeader>
          <div>
                <ForgotPasswordForm setIsDialogOpen={setIsDialogOpen} />
          </div>
        </DialogContent>
      </Dialog>
    </div> 
    )
  }
  
  export default SignIn