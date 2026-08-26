"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, UserPlus, UsersRound } from "lucide-react";

type Props = { hasGroup: boolean };

type Member = { id: string; label: string };

const SCOPES = ["booking", "records", "emergency"];

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/**
 * Family write ops (parity #15): create/join/invite/leave + per-member
 * permission scopes and removal — every action hits a real BFF route that
 * calls /family/* upstream. No optimistic success; the page refreshes.
 */
export function FamilyManagePanel({ hasGroup }: Props) {
  // Member identifiers are fetched post-mount so they never render in the
  // SSR HTML (privacy boundary covered by family-ssr.test).
  const [members, setMembers] = useState<Member[]>([]);
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!hasGroup || loadedRef.current) return;
    loadedRef.current = true;
    fetch("/api/family/members")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.members) ? data.members : [];
        setMembers(list.flatMap((m: any) => typeof m?.id === "string"
          ? [{ id: m.id, label: String(m.display_name || m.relation || m.id).slice(0, 80) }]
          : []));
      })
      .catch(() => null);
  }, [hasGroup]);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [scopes, setScopes] = useState<string[]>(["booking"]);

  async function call(action: string, path: string, init: RequestInit) {
    if (busy) return;
    setBusy(action); setError(null); setMessage(null);
    try {
      const res = await fetch(path, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر تنفيذ العملية");
        return;
      }
      setMessage("تمت العملية");
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(null);
    }
  }

  function post(action: string, path: string, body: unknown) {
    return call(action, path, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify(body),
    });
  }

  const invite = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    await post("invite", "/api/family/invite", { channel: String(form.get("channel") || "sms"), target: String(form.get("target") || "") });
  };
  const join = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    await post("join", "/api/family/join", { invite_code: String(form.get("invite_code") || ""), display_name: String(form.get("display_name") || "") || undefined });
  };
  const create = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    await post("create", "/api/family/create", { name: String(form.get("name") || "") });
  };

  return (
    <section style={{ marginTop: "1rem", display: "grid", gap: ".8rem" }} aria-label="إدارة العائلة">
      {!hasGroup && (
        <div style={{ display: "grid", gap: ".5rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }}>
          <strong style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}><UsersRound size={16} aria-hidden="true" />أنشئ مجموعة عائلية</strong>
          <form onSubmit={create} style={{ display: "grid", gap: ".5rem", gridTemplateColumns: "1fr auto" }}>
            <input name="name" required minLength={2} maxLength={120} aria-label="اسم المجموعة" style={fieldStyle} />
            <button type="submit" disabled={busy === "create"}>{busy === "create" ? "..." : "إنشاء"}</button>
          </form>
          <strong style={{ display: "inline-flex", gap: ".4rem", alignItems: "center", marginTop: ".3rem" }}>أو انضم بكود دعوة</strong>
          <form onSubmit={join} style={{ display: "grid", gap: ".5rem", gridTemplateColumns: "1fr 1fr auto" }}>
            <input name="invite_code" required minLength={4} maxLength={40} aria-label="كود الدعوة" style={fieldStyle} />
            <input name="display_name" maxLength={120} aria-label="اسم العرض" style={fieldStyle} />
            <button type="submit" disabled={busy === "join"}>{busy === "join" ? "..." : "انضم"}</button>
          </form>
        </div>
      )}
      {hasGroup && (
        <div style={{ display: "grid", gap: ".6rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }}>
          <strong style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}><UserPlus size={16} aria-hidden="true" />دعوة فرد جديد</strong>
          <form onSubmit={invite} style={{ display: "grid", gap: ".5rem", gridTemplateColumns: "auto 1fr auto" }}>
            <select name="channel" aria-label="القناة" style={fieldStyle}><option value="sms">SMS</option><option value="email">Email</option></select>
            <input name="target" required minLength={5} maxLength={200} aria-label="الجوال أو البريد" style={fieldStyle} />
            <button type="submit" disabled={busy === "invite"}>{busy === "invite" ? "..." : "أرسل الدعوة"}</button>
          </form>
        </div>
      )}
      {hasGroup && members.length > 0 && (
        <div style={{ display: "grid", gap: ".6rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#fff", padding: "1rem" }}>
          <strong>صلاحيات الأفراد وإزالتهم</strong>
          <label style={{ display: "grid", gap: ".35rem", fontSize: ".85rem" }}>
            الفرد
            <select value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)} style={fieldStyle}>
              <option value="">— اختر —</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
            </select>
          </label>
          <fieldset style={{ border: "none", padding: 0, display: "flex", gap: ".9rem", fontSize: ".85rem" }}>
            <legend style={{ marginBottom: ".25rem" }}>الصلاحيات</legend>
            {SCOPES.map((scope) => (
              <label key={scope}>
                <input type="checkbox" checked={scopes.includes(scope)}
                  onChange={(event) => setScopes((prev) => event.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope))} />
                {" "}{scope}
              </label>
            ))}
          </fieldset>
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
            <button type="button" disabled={!selectedMember || busy === "perms"}
              onClick={() => selectedMember && call("perms", `/api/family/members/${encodeURIComponent(selectedMember)}/permissions`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ scopes }),
              })}>
              {busy === "perms" ? "..." : "حفظ الصلاحيات"}
            </button>
            <button type="button" disabled={!selectedMember || busy === "remove"}
              onClick={() => selectedMember && call("remove", `/api/family/members/${encodeURIComponent(selectedMember)}`, {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({}),
              })}
              style={{ display: "inline-flex", gap: ".35rem", alignItems: "center", color: "#c0392b" }}>
              <UserMinus size={15} aria-hidden="true" />{busy === "remove" ? "..." : "إزالة الفرد"}
            </button>
          </div>
          <button type="button" disabled={busy === "leave"}
            onClick={() => post("leave", "/api/family/leave", {})}
            style={{ justifySelf: "start", color: "#c0392b" }}>
            {busy === "leave" ? "..." : "مغادرة المجموعة"}
          </button>
        </div>
      )}
      {message ? <p role="status" style={{ margin: 0, fontSize: ".85rem", color: "#0b7a53" }}>{message}</p> : null}
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".85rem", color: "#c0392b" }}>{error}</p> : null}
    </section>
  );
}
