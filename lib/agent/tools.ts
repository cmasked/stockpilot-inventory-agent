import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { isoDate } from "../schemas";

/*
 * EXAMPLE TOOLS for the starter "tasks" table (seed/00_starter_example.sql).
 * They show the pattern: 1 read tool + 2 write tools.
 *
 * YOUR JOB: replace these with tools for your problem statement.
 * Tips:
 *  - Write the description as "Use this when ..." so Gemini knows WHEN to call it.
 *  - Describe every field, including its format (for example YYYY-MM-DD).
 *  - Return small, clean objects. Gemini reads what you return.
 *  - Throw an Error with a clear message when something is wrong. The agent will explain it.
 */

const listTasks = defineTool({
  name: "listTasks",
  description:
    "Use this when the user wants to see their tasks. Can filter by status. Returns at most 20 tasks, newest first.",
  schema: z.object({
    status: z
      .enum(["open", "done", "all"])
      .optional()
      .describe("Which tasks to return. Default is all."),
  }),
  run: async ({ status }) => {
    let query = getSupabase()
      .from("tasks")
      .select("id, title, due_date, status")
      .order("created_at", { ascending: false })
      .limit(20);
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data.length, tasks: data };
  },
});

const createTask = defineTool({
  name: "createTask",
  description: "Use this when the user asks to add, create or remember a new task.",
  writes: true,
  schema: z.object({
    title: z.string().trim().min(1).max(200).describe("Short title of the task"),
    due_date: isoDate.optional().describe("Due date in YYYY-MM-DD format, if the user gave one"),
  }),
  run: async ({ title, due_date }) => {
    const { data, error } = await getSupabase()
      .from("tasks")
      .insert({ title, due_date: due_date ?? null })
      .select("id, title, due_date, status")
      .single();
    if (error) throw new Error(error.message);
    return { created: data };
  },
});

const completeTask = defineTool({
  name: "completeTask",
  description:
    "Use this when the user says a task is finished. Needs the task id, so call listTasks first if you do not know it.",
  writes: true,
  schema: z.object({
    id: z.number().int().positive().describe("The id of the task"),
  }),
  run: async ({ id }) => {
    const { data, error } = await getSupabase()
      .from("tasks")
      .update({ status: "done" })
      .eq("id", id)
      .select("id, title, status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`No task found with id ${id}`);
    return { updated: data };
  },
});

/** Every tool in this list is given to Gemini. Add your own tools here. */
export const tools: AgentTool[] = [listTasks, createTask, completeTask];
