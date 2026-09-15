import { supabase, type Operation } from "./supabaseClient";

const OPERATION_CACHE_KEY = "calc:lastOperation";
const PENDING_QUEUE_KEY = "calc:pendingSync";

export type PendingCalculation = {
  a: number;
  b: number;
  c: number;
  operation: Operation;
  result: number;
  created_at: string;
};

export function getCachedOperation(): Operation | null {
  const v = localStorage.getItem(OPERATION_CACHE_KEY);
  return v ? (v as Operation) : null;
}

export function setCachedOperation(op: Operation): void {
  localStorage.setItem(OPERATION_CACHE_KEY, op);
}

export function computeLocally(op: Operation, a: number, b: number, c: number): number {
  switch (op) {
    case "sum": return a + b + c;
    case "average": return (a + b + c) / 3;
    case "subtract": return a - b - c;
    case "multiply": return a * b * c;
  }
}

function readQueue(): PendingCalculation[] {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingCalculation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingCalculation[]): void {
  localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(items));
}

export function enqueuePending(entry: PendingCalculation): void {
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
}

export function getPendingCount(): number {
  return readQueue().length;
}

export async function flushPendingQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const stillPending: PendingCalculation[] = [];
  let synced = 0;

  for (const entry of queue) {
    const { error } = await supabase.rpc("sync_offline_calculation", {
      input_a: entry.a,
      input_b: entry.b,
      input_c: entry.c,
      input_operation: entry.operation,
      input_result: entry.result,
      input_created_at: entry.created_at,
    });
    if (error) {
      stillPending.push(entry);
    } else {
      synced += 1;
    }
  }

  writeQueue(stillPending);
  return { synced, remaining: stillPending.length };
}
