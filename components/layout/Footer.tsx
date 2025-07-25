import React from 'react';
import Link from 'next/link'; // Importar Link de next/link
import { Mail, Phone } from 'lucide-react'; // Usando lucide-react para consistencia

interface FooterLinkItem {
  href: string;
  label: string;
}

const footerLinks: FooterLinkItem[] = [
  { href: '/contact', label: 'Contacto' },
  { href: '/terms-and-conditions', label: 'Términos y Condiciones' },
  { href: '/privacy-policy', label: 'Política de Privacidad' },
];


const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-transparent text-muted-foreground backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* En móvil (por defecto), los elementos se apilan (flex-col) con un espacio (gap-8). */}
        {/* En pantallas más grandes (sm:), cambian a una fila (flex-row) y se distribuyen (justify-between). */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-8 sm:gap-4">
          {/* Sección Información del Hotel */}
          <div className="space-y-4">
            <h5 className="text-lg font-semibold text-gray-100">Reservas Online</h5>
            <address className="not-italic space-y-2 text-sm">
              
              <p className="flex items-center">
                <Phone size={16} className="mr-2 flex-shrink-0" />
                <a href="tel:+15551234567" className="hover:text-gray-100 transition-colors">
                  (53) 55405073
                </a>
              </p>
              <p className="flex items-center">
                <Mail size={16} className="mr-2 flex-shrink-0" />
                <a href="mailto:reservas@hoteldeluxe.com" className="hover:text-gray-100 transition-colors">
                  reservasonline@gmail.com
                </a>
              </p>
            </address>
          </div>

          {/* Sección Enlaces Útiles */}
          <div className="space-y-3">
            <h5 className="text-lg font-semibold text-gray-100">Enlaces Útiles</h5>
            <ul className="space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-gray-100 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
      {/* Separador y copyright */}
      <div className="border-t border-gray-800/50 p-4 mt-4 text-center">
        <p className="text-sm text-gray-100">
          &copy; {currentYear} Reservas Online. Todos los derechos reservados.
          </p>
        </div>
    </footer>
  );
};
export default Footer;