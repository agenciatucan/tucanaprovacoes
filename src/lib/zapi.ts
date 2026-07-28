import { logger } from "@/lib/logger";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const baseUrl  = process.env.EVOLUTION_API_URL;
  const apiKey   = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl || !apiKey || !instance) {
    logger.error("sendWhatsApp", "Variáveis EVOLUTION_API não configuradas");
    return false;
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    logger.error("sendWhatsApp", `Número inválido: ${phone}`);
    return false;
  }

  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify({
        number: normalized,
        text: message,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("sendWhatsApp", `Erro Evolution API ${res.status}: ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    logger.error("sendWhatsApp", String(err));
    return false;
  }
}
