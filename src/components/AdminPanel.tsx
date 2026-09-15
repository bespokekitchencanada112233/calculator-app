import { useEffect, useState } from "react";
import { supabase, type CalculationRow, type Operation } from "../supabaseClient";

const OPERATIONS: { value: Operation; label: string }[] = [
  { value: "sum", label: "Sum (a + b + c)" },
  { value: "average", label: "Average" },
  { value: "subtract", label: "Subtract (a − b − c)" },
  { value: "multiply", label: "Multiply" },
];

function formatNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const s = String(n);
  return s.length > 14 ? Number(n).toPrecision(10).replace(/\.?0+$/, "") : s;
}

export default function AdminPanel() {
  const [operation, setOperation] = useState<Operation>("sum");
  const [savingOp, setSavingOp] = useState(false);
  const [history, setHistory] = useState<CalculationRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  async function loadSettings() {
    const { data } = await supabase.from("settings").select("operation").eq("id", 1).single();
    if (data) setOperation(data.operation as Operation);
  }

  async function loadHistory() {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("calculations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as CalculationRow[]) ?? []);
    setLoadingHistory(false);
  }

  useEffect(() => {
    loadSettings();
    loadHistory();
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleOperationChange(next: Operation) {
    setSavingOp(true);
    setOperation(next);
    await supabase.from("settings").update({ operation: next }).eq("id", 1);
    setSavingOp(false);
  }

  return (
    <div className="admin-panel">
      <div className="admin-head">
        <span className="history-title">Admin</span>
      </div>

      <label className="field">
        <span>Active operation</span>
        <select
          value={operation}
          disabled={savingOp}
          onChange={(e) => handleOperationChange(e.target.value as Operation)}
        >
          {OPERATIONS.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </label>

      <div className="history">
        <div className="history-head">
          <span className="history-title">History</span>
          <button type="button" className="btn btn-ghost btn-small" onClick={loadHistory}>
            Refresh
          </button>
        </div>
        <ul className="history-list">
          {loadingHistory && history.length === 0 && (
            <li className="history-empty">Loading…</li>
          )}
          {!loadingHistory && history.length === 0 && (
            <li className="history-empty">No calculations yet</li>
          )}
          {history.map((row) => (
            <li key={row.id} className="history-row">
              <span className="history-expr">{exprFor(row)}</span>
              <span>{formatNum(row.result)}</span>
              <span className="history-expr">{new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function exprFor(row: CalculationRow): string {
  const [a, b, c] = [formatNum(row.a), formatNum(row.b), formatNum(row.c)];
  switch (row.operation) {
    case "sum": return `${a} + ${b} + ${c}`;
    case "subtract": return `${a} − ${b} − ${c}`;
    case "multiply": return `${a} × ${b} × ${c}`;
    case "average": return `avg(${a}, ${b}, ${c})`;
  }
}
