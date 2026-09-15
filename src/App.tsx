import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Role } from "./supabaseClient";
import type { UpdateStatus } from "./updateStatus";
import Login from "./components/Login";
import Calculator from "./components/Calculator";
import AdminPanel from "./components/AdminPanel";

function updateMessage(status: UpdateStatus): string | null {
  switch (status.type) {
    case "available": return `Update ${status.version} found, downloading…`;
    case "downloading": return `Downloading update… ${status.percent}%`;
    case "downloaded": return `Update ${status.version} ready — restart the app to apply`;
    case "error": return `Update check failed: ${status.message}`;
    default: return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    return window.electronAPI?.onUpdateStatus(setUpdateStatus);
  }, []);

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

  const updateText = updateStatus ? updateMessage(updateStatus) : null;
  const updateBanner = updateText && (
    <div className="offline-banner">{updateText}</div>
  );

  if (loading) {
    return (
      <div className="wrap">
        {updateBanner}
        <p className="eyebrow">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="wrap">
        {updateBanner}
        <p className="eyebrow">Sign in to continue</p>
        <Login />
      </div>
    );
  }

  return (
    <div className="wrap">
      {updateBanner}
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
