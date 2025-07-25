import React from 'react';

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-10">Términos y Condiciones</h1>

      <div className="prose prose-lg dark:prose-invert max-w-none mx-auto">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <p>
          Bienvenido/a a [Nombre de tu Sitio Web/Aplicación]. Estos términos y condiciones describen las reglas y regulaciones para el uso del sitio web de [Nombre de tu Empresa], ubicado en [URL de tu Sitio Web].
        </p>
        <p>
          Al acceder a este sitio web, asumimos que aceptas estos términos y condiciones. No continúes usando [Nombre de tu Sitio Web/Aplicación] si no estás de acuerdo con todos los términos y condiciones establecidos en esta página.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Cookies</h2>
        <p>
          Empleamos el uso de cookies. Al acceder a [Nombre de tu Sitio Web/Aplicación], aceptaste usar cookies de acuerdo con la Política de Privacidad de [Nombre de tu Empresa].
        </p>
        <p>
          La mayoría de los sitios web interactivos utilizan cookies para permitirnos recuperar los detalles del usuario para cada visita. Nuestro sitio web utiliza cookies para habilitar la funcionalidad de ciertas áreas para que sea más fácil para las personas que visitan nuestro sitio web. Algunos de nuestros socios afiliados/publicitarios también pueden usar cookies.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Licencia</h2>
        <p>
          A menos que se indique lo contrario, [Nombre de tu Empresa] y/o sus licenciantes poseen los derechos de propiedad intelectual de todo el material en [Nombre de tu Sitio Web/Aplicación]. Todos los derechos de propiedad intelectual son reservados. Puedes acceder a esto desde [Nombre de tu Sitio Web/Aplicación] para tu propio uso personal sujeto a las restricciones establecidas en estos términos y condiciones.
        </p>
        <p>No debes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Republicar material de [Nombre de tu Sitio Web/Aplicación]</li>
          <li>Vender, alquilar o sublicenciar material de [Nombre de tu Sitio Web/Aplicación]</li>
          <li>Reproducir, duplicar o copiar material de [Nombre de tu Sitio Web/Aplicación]</li>
          <li>Redistribuir contenido de [Nombre de tu Sitio Web/Aplicación]</li>
        </ul>
        <p>Este Acuerdo comenzará en la fecha del presente.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Hipervínculos a nuestro Contenido</h2>
        <p>
          Las siguientes organizaciones pueden enlazar a nuestro sitio web sin aprobación previa por escrito:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Agencias gubernamentales;</li>
          <li>Motores de búsqueda;</li>
          <li>Organizaciones de noticias;</li>
          <li>Distribuidores de directorios en línea pueden enlazar a nuestro sitio web de la misma manera que hacen hipervínculos a los sitios web de otras empresas listadas; y</li>
          <li>Empresas acreditadas en todo el sistema, excepto organizaciones sin fines de lucro, centros comerciales de caridad y grupos de recaudación de fondos de caridad que no pueden hacer hipervínculos a nuestro sitio web.</li>
        </ul>
        {/* Agrega más secciones según sea necesario, como:
            - Responsabilidad del Contenido
            - Tu Privacidad (enlace a la Política de Privacidad)
            - Reserva de Derechos
            - Eliminación de enlaces de nuestro sitio web
            - Descargo de Responsabilidad
        */}

        <h2 className="text-2xl font-semibold mt-8 mb-4">Reserva de Derechos</h2>
        <p>
          Nos reservamos el derecho de solicitar que elimines todos los enlaces o cualquier enlace particular a nuestro sitio web. Apruebas eliminar inmediatamente todos los enlaces a nuestro sitio web previa solicitud. También nos reservamos el derecho de modificar estos términos y condiciones y su política de vinculación en cualquier momento. Al vincular continuamente a nuestro sitio web, aceptas estar obligado y seguir estos términos y condiciones de vinculación.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Descargo de Responsabilidad</h2>
        <p>
          En la medida máxima permitida por la ley aplicable, excluimos todas las representaciones, garantías y condiciones relacionadas con nuestro sitio web y el uso de este sitio web. Nada en este descargo de responsabilidad:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>limitará o excluirá nuestra o tu responsabilidad por muerte o lesiones personales;</li>
          <li>limitará o excluirá nuestra o tu responsabilidad por fraude o tergiversación fraudulenta;</li>
          <li>limitará cualquiera de nuestras o tus responsabilidades de cualquier manera que no esté permitida por la ley aplicable; o</li>
          <li>excluirá cualquiera de nuestras o tus responsabilidades que no puedan ser excluidas bajo la ley aplicable.</li>
        </ul>
        <p>
          Las limitaciones y prohibiciones de responsabilidad establecidas en esta Sección y en otras partes de este descargo de responsabilidad: (a) están sujetas al párrafo anterior; y (b) rigen todas las responsabilidades que surjan bajo el descargo de responsabilidad, incluidas las responsabilidades que surjan en contrato, en agravio y por incumplimiento del deber legal.
        </p>
        <p>
          Mientras el sitio web y la información y los servicios en el sitio web se proporcionen de forma gratuita, no seremos responsables de ninguna pérdida o daño de ninguna naturaleza.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Información de Contacto</h2>
        <p>
          Si tienes alguna pregunta sobre alguno de nuestros términos, por favor contáctanos en:
        </p>
        <address className="not-italic">
          [Su Nombre/Nombre de la Empresa]<br />
          [Su Dirección de Correo Electrónico de Contacto]<br />
          [Su Dirección Física, si aplica]
        </address>
      </div>
    </div>
  );
}