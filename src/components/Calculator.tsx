import { useEffect, useRef, useState } from "react";
import { supabase, type Operation } from "../supabaseClient";

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
  const [operation, setOperation] = useState<Operation>("sum");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase
      .from("settings")
      .select("operation")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setOperation(data.operation as Operation);
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const rawA = a.trim();
    const rawB = b.trim();

    if (rawA === "" || rawB === "") {
      setResult(null);
      setError("");
      return;
    }
    if (isNaN(Number(rawA)) || isNaN(Number(rawB))) {
      setResult(null);
      setError("Enter valid numbers.");
      return;
    }

    setError("");
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase.rpc("calculate", {
        input_a: Number(rawA),
        input_b: Number(rawB),
      });
      if (error) {
        setError(error.message);
        setResult(null);
        return;
      }
      setResult(data as number);

      const { data: settings } = await supabase
        .from("settings")
        .select("operation")
        .eq("id", 1)
        .single();
      if (settings) setOperation(settings.operation as Operation);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [a, b]);

  return (
    <div className="case">
      <div className="row">
        <span className="slot-label" aria-hidden="true">a</span>
        <input
          className="slot"
          type="number"
          inputMode="decimal"
          placeholder="0"
          aria-label="First number"
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </div>
      <div className="row">
        <span className="slot-label" aria-hidden="true">b</span>
        <input
          className="slot"
          type="number"
          inputMode="decimal"
          placeholder="0"
          aria-label="Second number"
          value={b}
          onChange={(e) => setB(e.target.value)}
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
