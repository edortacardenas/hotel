import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./prisma";
import { sendMail } from "./mail";
import * as bcrypt from 'bcryptjs';


export const auth = betterAuth({
    
    database: prismaAdapter(db, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        // requireEmailVerification: true, // Se comenta para permitir el flujo de vinculación de cuentas.
                                        // `sendOnSignUp` en `emailVerification` se encargará de la verificación.
        enabled: true,
        autoSignIn: false,
        password: {
            hash: async (password) => {
                // Hashea la contraseña con un factor de sal de 10
                return await bcrypt.hash(password, 10);
            },
            verify: async ({ hash, password }) => {
                // Verifica la contraseña contra el hash almacenado
                return await bcrypt.compare(password, hash);
            },
        },
        requireEmailVerification: true,
        sendResetPassword: async ({user, url}) => {
            await sendMail({
                to: user.email,
                subject: "Reset your password",
                text: `Click the link to reset your password: ${url}`,
            });
        },
    },
    emailVerification: {
        autoSignInAfterVerification: true, //  true to auto sign in after email verification
        sendOnSignUp: true, // true to auto send email verification link after sign up
        expiresIn: 3600, // 1 hour
        sendVerificationEmail: async ( { user, url}) => {
            await sendMail({
                to: user.email,
                subject: "Verify your email address",
                text: `Click the link to verify your email: ${url}`,
            });
        },
      },
    socialProviders: { 
        github: { 
           clientId: process.env.GITHUB_CLIENT_ID as string, 
           clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
        }, 
    }, 

    account: {
        // Hacemos la configuración más explícita para asegurar que la librería la lea correctamente.
        // Estos son los valores por defecto, pero especificarlos puede resolver problemas sutiles.
        modelName: "account",
        fields: {
            userId: "userId"
        },
        accountLinking: {
            enabled: true,
            // Lista de proveedores que pueden vincularse a una cuenta existente.
            // 'credential' es el ID interno que `better-auth` usa para el proveedor `emailAndPassword`.
            // Nos aseguramos de que 'github' y 'credential' confíen el uno en el otro.
            trustedProviders: ["github", "credential"],
            allowDifferentEmails: false
        }
    },
    user: {
      
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async (
          { newEmail, url }
        ) => {
            await sendMail({
                to: newEmail, // Send to the new email for verification
                subject: "Verify your email change",
                text: `Click the link to change your email: ${url}`,
            });
        },
      },

      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: async (
          { user, url} ) => {
            await sendMail({
                to: user.email,
                subject: "Verify your identity to delete account",
                text: `Click the link to delete the account: ${url}`,
            });
        },
      },
    },
    
});
