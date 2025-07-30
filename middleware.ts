import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// La causa más común de error es el nombre de la cookie.
// Asegúrate de que este valor coincida EXACTAMENTE con la cookie que establece tu librería de autenticación.
// Por ejemplo, para Lucia Auth, el nombre por defecto es 'auth_session'.
const isAuthenticated = (request: NextRequest): boolean => {
  const sessionCookie = request.cookies.get('__Secure-better-auth.session_token'); //
  return !!sessionCookie;
}

// Rutas que son accesibles para todos los usuarios, independientemente del estado de autenticación.
const publicRoutes = [
  '/', // Página de inicio
  '/hotels', // Página de búsqueda de hoteles
  '/api/webhook', // ¡MUY IMPORTANTE! La ruta del webhook de Stripe debe ser pública.
  '/reset-password'//Para poder resetear la password tiene que ser publica
];

// Rutas utilizadas para la autenticación.
// Los usuarios que hayan iniciado sesión y que intenten acceder a ellas serán redirigidos.
const authRoutes = [
  '/sign-in',
  '/sign-up',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = isAuthenticated(request);

  const isAuthRoute = authRoutes.some(path => pathname.startsWith(path));
  const isPublicRoute = publicRoutes.some(path =>
    pathname === path || (path !== '/' && pathname.startsWith(path))
  );

  // Lógica de redirección mejorada y más clara:

  // 1. Si es una ruta de autenticación (/sign-in, /sign-up)
  if (isAuthRoute) {
    // Si el usuario ya está logueado, redirigirlo a la página de inicio.
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Si no está logueado, permitirle el acceso a la página de login/registro.
    return NextResponse.next();
  }

  // 2. Si la ruta NO es pública y el usuario NO está logueado, es una ruta protegida.
  // Redirigirlo a la página de inicio de sesión.
  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // 3. En cualquier otro caso (usuario logueado en ruta protegida, o cualquier usuario en ruta pública), permitir el acceso.
  return NextResponse.next();
}

export const config = {
  // El matcher evita que el middleware se ejecute en rutas de archivos estáticos.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};