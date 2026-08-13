import { Resend } from "resend";

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "faktury@fkscaffolding.sk";
