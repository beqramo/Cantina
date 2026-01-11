import { Resend } from 'resend';
import { ReactElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to?: string;
  subject: string;
  react: ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email sending');
    return null;
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'beqa31198@gmail.com';

  try {
    const { render } = await import('@react-email/render');
    const html = await render(react);

    const data = await resend.emails.send({
      from: 'Cantina <onboarding@resend.dev>', // Default Resend test sender
      to: to || adminEmail,
      subject,
      html, // Send the rendered HTML
    });
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
