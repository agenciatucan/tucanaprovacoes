"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getActiveGoogleConnection } from "@/lib/google/connection";
import { insertEvent, updateEvent, deleteEvent, toGoogleEvent, type InternalEventRecord } from "@/lib/google/calendar";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título").max(200),
    description: z.string().trim().max(2000).optional().nullable(),
    location: z.string().trim().max(200).optional().nullable(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido").optional().nullable(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido").optional().nullable(),
  })
  .transform((v) => ({
    title: v.title,
    description: v.description?.trim() || null,
    location: v.location?.trim() || null,
    event_date: v.event_date,
    start_time: v.start_time || null,
    end_time: v.end_time || null,
  }));

export type InternalEventInput = z.input<typeof eventSchema>;

async function requireStaff(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!data || !["admin", "equipe"].includes(data.role)) return null;
  return data;
}

/** Empurra criação/atualização para o Google Agenda (best-effort — falhas não bloqueiam o salvamento local). */
async function pushToGoogle(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  event: InternalEventRecord & { google_event_id: string | null }
): Promise<{ google_event_id: string | null; google_updated_at: string | null } | null> {
  try {
    const connection = await getActiveGoogleConnection(supabase);
    if (!connection) return null;

    const body = toGoogleEvent(event);
    const result = event.google_event_id
      ? await updateEvent(connection.accessToken, connection.calendarId, event.google_event_id, body)
      : await insertEvent(connection.accessToken, connection.calendarId, body);

    return { google_event_id: result.id, google_updated_at: result.updated ?? null };
  } catch (err) {
    logger.error("pushInternalEventToGoogle", err instanceof Error ? err.message : "Erro desconhecido");
    return null;
  }
}

export async function createInternalEvent(input: InternalEventInput): Promise<Result<{ id: string }>> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data, error } = await supabase
    .from("internal_events")
    .insert({ ...parsed.data, created_by: profile.id })
    .select("id, title, description, location, event_date, start_time, end_time, google_event_id")
    .single();

  if (error || !data) {
    logger.error("createInternalEvent", error?.message);
    return { success: false, error: "Erro ao criar evento" };
  }

  const sync = await pushToGoogle(supabase, data);
  if (sync) {
    await supabase.from("internal_events").update(sync).eq("id", data.id);
  }

  revalidatePath("/admin/calendario");
  return { success: true, data: { id: data.id } };
}

export async function updateInternalEvent(id: string, input: InternalEventInput): Promise<Result> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data, error } = await supabase
    .from("internal_events")
    .update(parsed.data)
    .eq("id", id)
    .select("id, title, description, location, event_date, start_time, end_time, google_event_id")
    .single();

  if (error || !data) {
    logger.error("updateInternalEvent", error?.message);
    return { success: false, error: "Erro ao atualizar evento" };
  }

  const sync = await pushToGoogle(supabase, data);
  if (sync) {
    await supabase.from("internal_events").update(sync).eq("id", data.id);
  }

  revalidatePath("/admin/calendario");
  return { success: true, data: undefined };
}

export async function deleteInternalEvent(id: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data: existing } = await supabase
    .from("internal_events")
    .select("id, google_event_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Evento não encontrado" };

  const { error } = await supabase.from("internal_events").delete().eq("id", id);
  if (error) {
    logger.error("deleteInternalEvent", error.message);
    return { success: false, error: "Erro ao excluir evento" };
  }

  if (existing.google_event_id) {
    try {
      const connection = await getActiveGoogleConnection(supabase);
      if (connection) {
        await deleteEvent(connection.accessToken, connection.calendarId, existing.google_event_id as string);
      }
    } catch (err) {
      logger.error("deleteInternalEventFromGoogle", err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  revalidatePath("/admin/calendario");
  return { success: true, data: undefined };
}
