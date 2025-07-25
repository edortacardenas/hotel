
import nodemailer from 'nodemailer';
import dns from 'dns';

// Force Node.js to resolve DNS with IPv4 first.
// This is a common fix for ENETUNREACH errors in environments
// with problematic IPv6 configurations (like some cloud providers).
dns.setDefaultResultOrder('ipv4first');

//Email transporter setup
export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USER_MAIL,
        pass: process.env.USER_MAIL_PASSWORD,
    },
})


//Generate OTP
export const generateOTP = () => {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
};

interface MailPayload {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

/**
 * A centralized function to send emails.
 * @param payload - The email details.
 */
export const sendMail = async ({ to, subject, text, html }: MailPayload) => {
    const mailOptions = {
        from: process.env.USER_MAIL || '"Hptelsa" <no-reply@example.com>',
        to,
        subject,
        text,
        html,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
        // Re-throw a generic error to avoid leaking implementation details to the client.
        throw new Error('Failed to send the email.');
    }
};
