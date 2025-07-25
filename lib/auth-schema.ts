import * as z from 'zod';

export const signUpSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50),
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must have than 8 characters'),
  })
  

  export const signInSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must have than 8 characters'),
  });

  
  export const forgetPasswordFormSchema = z.object({
    email: z.string().email(),
  });

  export const passwordFormSchema = z.object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(30, "Password must be at less than 30 characters"),
  });

  
  export const otpFormSchema = z.object({
    otp: z
      .string()
      .min(6, "OTP must be at least 6 digit")
      .max(16, "OTP must be at most 6 digit"),
  });