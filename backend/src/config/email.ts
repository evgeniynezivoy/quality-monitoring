import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.itclouddelivery.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'no-reply@reports.infuse.com',
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const mailOptions = {
    from: `"Quality Monitor" <${process.env.SMTP_USER || 'no-reply@reports.infuse.com'}>`,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email sent to: ${mailOptions.to}`);
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('SMTP connection verified');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}

export default transporter;
