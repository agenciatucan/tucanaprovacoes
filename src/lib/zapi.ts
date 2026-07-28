import { logger } from "@/lib/logger";

const WHAPI_BASE_URL = "https://gate.whapi.cloud";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const token = process.env.WHAPI_TOKEN;

  if (!token) {
    logger.error("sendWhatsApp", "Variável WHAPI_TOKEN não configurada");
    return false;
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    logger.error("sendWhatsApp", `Número inválido: ${phone}`);
    return false;
  }

  try {
    const res = await fetch(`${WHAPI_BASE_URL}/messages/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: normalized,
        body: message,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("sendWhatsApp", `Erro Whapi.Cloud ${res.status}: ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    logger.error("sendWhatsApp", String(err));
    return false;
  }
}
