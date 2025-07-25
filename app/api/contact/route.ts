import { NextResponse } from 'next/server';
import { transporter } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();

    // Opcional: Validación básica en el backend (Zod ya lo hace en el frontend)
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ message: 'Faltan campos requeridos.' }, { status: 400 });
    }

    // Definir las opciones del correo electrónico
    const mailOptions = {
      from: process.env.USER_MAIL, // La dirección de correo electrónico del remitente
      to: email, // La dirección a la que se enviará el formulario
      subject: `Nuevo mensaje de hotel.SA`,
      html: `
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Asunto:</strong> ${subject}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${message}</p>
      `,
    };

    // Enviar el correo electrónico
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Mensaje enviado con éxito.' }, { status: 200 });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    // Proporciona un mensaje de error más genérico al cliente por seguridad
    return NextResponse.json(
      { message: 'Hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.' },
      { status: 500 }
    );
  }
}