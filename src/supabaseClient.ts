import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Role = "admin" | "user";

export type Operation = "sum" | "average" | "subtract" | "multiply";

export type CalculationRow = {
  id: string;
  user_id: string | null;
  a: number;
  b: number;
  operation: Operation;
  result: number;
  created_at: string;
};
