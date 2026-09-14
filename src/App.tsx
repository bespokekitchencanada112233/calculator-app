import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Role } from "./supabaseClient";
import Login from "./components/Login";
import Calculator from "./components/Calculator";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setRole(null);
      return;
    }
    supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setRole((data?.role as Role) ?? "user"));
  }, [session]);

  if (loading) {
    return (
      <div className="wrap">
        <p className="eyebrow">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="wrap">
        <p className="eyebrow">Sign in to continue</p>
        <Login />
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <span className="eyebrow">{session.user.email}{role === "admin" ? " · admin" : ""}</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>

      <Calculator />

      {role === "admin" && <AdminPanel />}
    </div>
  );
}
