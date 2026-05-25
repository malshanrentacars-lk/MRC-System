import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, message: string) {
  if (!process.env.SMTP_FROM) {
    throw new Error("Missing SMTP_FROM environment variable");
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: message,
    html: `<p>${message.replace(/\n/g, "<br/>")}</p>`,
  });
}
