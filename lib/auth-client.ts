import { createAuthClient } from "better-auth/react"
//import { stripeClient } from "@better-auth/stripe/client"

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: process.env.BETTER_AUTH_URL,
    
        
})

export const { 
       signIn,
       signUp,
       useSession,
       signOut, 
       changePassword,
       forgetPassword, 
       sendVerificationEmail, 
       updateUser,
       changeEmail,
       deleteUser
    } = createAuthClient()