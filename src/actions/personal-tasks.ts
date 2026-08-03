"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Result<T = void> = { success: true; data: T } | { success: false; error: string };

const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título").max(200),
    description: z.string().trim().max(2000).optional().nullable(),
    task_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido").optional().nullable(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido").optional().nullable(),
    period: z.enum(["manha", "tarde", "noite"]),
  })
  .transform((v) => ({
    title: v.title,
    description: v.description?.trim() || null,
    task_date: v.task_date,
    start_time: v.start_time || null,
    end_time: v.end_time || null,
    period: v.period,
  }));

export type PersonalTaskInput = z.input<typeof taskSchema>;

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

export async function createPersonalTask(input: PersonalTaskInput): Promise<Result<{ id: string }>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { data, error } = await supabase
    .from("personal_tasks")
    .insert({ ...parsed.data, owner_id: profile.id })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("createPersonalTask", error?.message);
    return { success: false, error: "Erro ao criar tarefa" };
  }

  revalidatePath("/admin/minhas-tarefas");
  return { success: true, data: { id: data.id } };
}

export async function updatePersonalTask(id: string, input: PersonalTaskInput): Promise<Result> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("personal_tasks")
    .update(parsed.data)
    .eq("id", id)
    .eq("owner_id", profile.id);

  if (error) {
    logger.error("updatePersonalTask", error.message);
    return { success: false, error: "Erro ao atualizar tarefa" };
  }

  revalidatePath("/admin/minhas-tarefas");
  return { success: true, data: undefined };
}

export async function toggleTaskDone(id: string, done: boolean): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("personal_tasks")
    .update({ done })
    .eq("id", id)
    .eq("owner_id", profile.id);

  if (error) {
    logger.error("toggleTaskDone", error.message);
    return { success: false, error: "Erro ao atualizar tarefa" };
  }

  revalidatePath("/admin/minhas-tarefas");
  return { success: true, data: undefined };
}

export async function deletePersonalTask(id: string): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const profile = await requireStaff(supabase);
  if (!profile) return { success: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("personal_tasks")
    .delete()
    .eq("id", id)
    .eq("owner_id", profile.id);

  if (error) {
    logger.error("deletePersonalTask", error.message);
    return { success: false, error: "Erro ao excluir tarefa" };
  }

  revalidatePath("/admin/minhas-tarefas");
  return { success: true, data: undefined };
}
