import { useEffect, useRef, useState } from "react";
import { supabase, type Operation } from "../supabaseClient";
import {
  computeLocally,
  enqueuePending,
  flushPendingQueue,
  getCachedOperation,
  getPendingCount,
  setCachedOperation,
} from "../offlineSync";

const OPERATION_LABEL: Record<Operation, string> = {
  sum: "sum",
  average: "average",
  subtract: "difference",
  multiply: "product",
};

function formatNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const s = String(n);
  return s.length > 14 ? Number(n).toPrecision(10).replace(/\.?0+$/, "") : s;
}

export default function Calculator() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [operation, setOperation] = useState<Operation>(getCachedOperation() ?? "sum");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getPendingCount());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase
      .from("settings")
      .select("operation")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setOperation(data.operation as Operation);
          setCachedOperation(data.operation as Operation);
        }
      });
  }, []);

  useEffect(() => {
    async function handleOnline() {
      setIsOffline(false);
      const { remaining } = await flushPendingQueue();
      setPendingCount(remaining);
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (navigator.onLine) handleOnline();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const rawA = a.trim();
    const rawB = b.trim();
    const rawC = c.trim();

    if (rawA === "" || rawB === "" || rawC === "") {
      setResult(null);
      setError("");
      return;
    }
    if (isNaN(Number(rawA)) || isNaN(Number(rawB)) || isNaN(Number(rawC))) {
      setResult(null);
      setError("Enter valid numbers.");
      return;
    }

    setError("");
    const numA = Number(rawA);
    const numB = Number(rawB);
    const numC = Number(rawC);

    debounceRef.current = setTimeout(async () => {
      if (!navigator.onLine) {
        const local = computeLocally(operation, numA, numB, numC);
        setResult(local);
        enqueuePending({
          a: numA, b: numB, c: numC,
          operation, result: local,
          created_at: new Date().toISOString(),
        });
        setPendingCount(getPendingCount());
        return;
      }

      const { data, error } = await supabase.rpc("calculate", {
        input_a: numA,
        input_b: numB,
        input_c: numC,
      });
      if (error) {
        const local = computeLocally(operation, numA, numB, numC);
        setResult(local);
        enqueuePending({
          a: numA, b: numB, c: numC,
          operation, result: local,
          created_at: new Date().toISOString(),
        });
        setPendingCount(getPendingCount());
        return;
      }
      setResult(data as number);

      const { data: settings } = await supabase
        .from("settings")
        .select("operation")
        .eq("id", 1)
        .single();
      if (settings) {
        setOperation(settings.operation as Operation);
        setCachedOperation(settings.operation as Operation);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [a, b, c, operation]);

  return (
    <div className="case">
      {(isOffline || pendingCount > 0) && (
        <div className="offline-banner">
          {isOffline ? "Offline — using last known operation" : `Syncing ${pendingCount} calculation${pendingCount === 1 ? "" : "s"}…`}
        </div>
      )}
      <div className="row">
        <span className="slot-label" aria-hidden="true">Number 1</span>
        <input
          className="slot"
          type="number"
          inputMode="decimal"
          placeholder="0"
          aria-label="Number 1"
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </div>
      <div className="row">
        <span className="slot-label" aria-hidden="true">Number 2</span>
        <input
          className="slot"
          type="number"
          inputMode="decimal"
          placeholder="0"
          aria-label="Number 2"
          value={b}
          onChange={(e) => setB(e.target.value)}
        />
      </div>
      <div className="row">
        <span className="slot-label" aria-hidden="true">Number 3</span>
        <input
          className="slot"
          type="number"
          inputMode="decimal"
          placeholder="0"
          aria-label="Number 3"
          value={c}
          onChange={(e) => setC(e.target.value)}
        />
      </div>
      <div className="divider" />
      <div className="screen" role="status" aria-live="polite">
        <span className="sum-label">{OPERATION_LABEL[operation]}</span>
        <span className="result">{result === null ? "–" : formatNum(result)}</span>
      </div>
      <div className="err">{error}</div>
    </div>
  );
}
