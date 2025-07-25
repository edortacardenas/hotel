import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-10">Política de Privacidad</h1>

      <div className="prose prose-lg dark:prose-invert max-w-none mx-auto">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <p>
        Bienvenido/a a nuestra Política de Privacidad. Su privacidad es de suma importancia para nosotros. Esta política de privacidad explica cómo recopilamos, usamos, divulgamos y salvaguardamos su información cuando visita nuestro sitio web HotelApp, incluyendo cualquier otra forma de medio, canal de medios, sitio web móvil o aplicación móvil relacionada o conectada al mismo (colectivamente, el "Sitio"). Por favor, lea esta política de privacidad cuidadosamente. Si no está de acuerdo con los términos de esta política de privacidad, por favor no acceda al sitio.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Recopilación de su información</h2>
         
        <p>
          Podemos recopilar información sobre usted de varias maneras. La información que podemos recopilar en el Sitio incluye:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Datos Personales:</strong> Información de identificación personal, como su nombre, dirección de envío, dirección de correo electrónico y número de teléfono, e información demográfica, como su edad, sexo, ciudad natal e intereses, que usted nos proporciona voluntariamente cuando se registra en el Sitio o cuando elige participar en diversas actividades relacionadas con el Sitio, como chat en línea y tablones de mensajes.
            </li>
          <li>
            <strong>Datos Derivados:</strong> Información que nuestros servidores recopilan automáticamente cuando accede al Sitio, como su dirección IP, tipo de navegador, sistema operativo, tiempos de acceso y páginas visitadas, conforme a las políticas de privacidad aplicables.
            </li> 
          <li>
            <strong>Datos Financieros:</strong> Información financiera, como datos relacionados con su método de pago (por ejemplo, número de tarjeta de crédito válido, marca de la tarjeta, fecha de caducidad) que podemos recopilar cuando compra, ordena, devuelve, intercambia o solicita información sobre nuestros servicios desde el Sitio. [Tenga en cuenta: Elimine esta sección si no recopila datos financieros].
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Uso de su Información</h2>
        <p>
          Tener información precisa sobre usted nos permite ofrecerle una experiencia fluida, eficiente y personalizada. Específicamente, podemos usar la información recopilada sobre usted a través del Sitio para:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Administrar su cuenta y proporcionar acceso a los servicios del sitio.</li>
          <li>Gestionar sus transacciones y enviarle detalles relacionados, como confirmaciones y recibos.</li>
          <li>Enviarle correos electrónicos administrativos, técnicos o de marketing.</li>
          <li>Mejorar la eficiencia y el funcionamiento del Sitio.</li>
          <li>Monitorear y analizar el uso y las tendencias para mejorar su experiencia con el Sitio.</li>
          <li>Notificarle las actualizaciones del Sitio.</li>
          {/* Agrega más usos según sea necesario */}
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Divulgación de su Información</h2>
        <p>
          Podemos compartir información que hemos recopilado sobre usted en ciertas situaciones. Su información puede ser divulgada de la siguiente manera:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Por Ley o para Proteger Derechos:</strong> Si creemos que la divulgación de información sobre usted es necesaria para responder a un proceso legal, para investigar o remediar posibles violaciones de nuestras políticas, o para proteger los derechos, la propiedad y la seguridad de otros, podemos compartir su información según lo permita o exija cualquier ley, regla o regulación aplicable.
          </li>
          <li>
            <strong>Proveedores de Servicios de Terceros:</strong> Podemos compartir su información con terceros que realizan servicios para nosotros o en nuestro nombre, incluyendo procesamiento de pagos, análisis de datos, entrega de correo electrónico, servicios de alojamiento, servicio al cliente y asistencia de marketing.
          </li>
          {/* Agrega más escenarios de divulgación según sea necesario */}
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Seguridad de su Información</h2>
        <p>
          Utilizamos medidas de seguridad administrativas, técnicas y físicas para ayudar a proteger su información personal. Si bien hemos tomado medidas razonables para proteger la información personal que nos proporciona, tenga en cuenta que a pesar de nuestros esfuerzos, ninguna medida de seguridad es perfecta o impenetrable, y ningún método de transmisión de datos puede garantizarse contra cualquier interceptación u otro tipo de uso indebido.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Política para Niños</h2>
        <p>
          No solicitamos conscientemente información ni comercializamos a niños menores de 13 años. Si se da cuenta de cualquier dato que hayamos recopilado de niños menores de 13 años, contáctenos utilizando la información de contacto proporcionada a continuación.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Opciones Respecto a su Información</h2>
        <p>
          Puede revisar o cambiar la información de su cuenta o cancelar su cuenta en cualquier momento. Si desea cancelar su cuenta, desactive o elimine su cuenta. Parte de la información puede conservarse en nuestros archivos para prevenir fraudes, solucionar problemas, ayudar con cualquier investigación, hacer cumplir nuestros Términos de Uso y/o cumplir con los requisitos legales.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Contáctenos</h2>
        <p>
          Si tiene preguntas o comentarios sobre esta Política de Privacidad, puede contactarnos a través de nuestro        
                    
          <a 
          href="/contact" // Asume que tienes una página de contacto
          className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
          >
            Formulario de Contacto
          </a>
        </p>
        
      </div>
    </div>
  );
}