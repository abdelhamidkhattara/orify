"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  addAgent,
  setAgentPassword,
  updateOwnerSettings,
  ownerLogout,
} from "@/app/actions/owner";

export function SettingsClient({
  locale,
  agents,
  settings,
  appUrl,
  qrBaseUrl,
}: {
  locale: "fr" | "ar";
  agents: Array<{ id: string; name: string; phone: string | null }>;
  settings: {
    homeTitleFr: string;
    homeTitleAr: string;
    homeBodyFr: string;
    homeBodyAr: string;
    homeCtaFr: string;
    homeCtaAr: string;
  };
  appUrl: string;
  qrBaseUrl: string;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentPassword, setAgentPassword] = useState("");
  const [form, setForm] = useState(settings);
  const [ownerPwd, setOwnerPwd] = useState("");

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <Toast message={toast} onDone={() => setToast(null)} />
      <h1 className="text-2xl font-bold">{isAr ? "المزيد" : "Plus"}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {isAr ? "الوكلاء" : "Agents"}
        </h2>
        <div className="space-y-2">
          {agents.map((a) => (
            <AgentRow key={a.id} agent={a} isAr={isAr} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder={isAr ? "الاسم" : "Nom"}
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
            <Input
              placeholder={isAr ? "الهاتف" : "Téléphone"}
              value={agentPhone}
              onChange={(e) => setAgentPhone(e.target.value)}
            />
          </div>
          <Input
            type="password"
            placeholder={
              isAr ? "كلمة المرور (6+ أحرف)" : "Mot de passe (6+ car.)"
            }
            value={agentPassword}
            onChange={(e) => setAgentPassword(e.target.value)}
            hint={
              isAr
                ? "للدخول إلى /seller"
                : "Pour la connexion sur /seller"
            }
          />
          <Button
            type="button"
            className="sm:w-auto sm:self-start"
            disabled={
              pending ||
              !agentName.trim() ||
              (agentPassword.length > 0 && agentPassword.length < 6)
            }
            onClick={() =>
              start(async () => {
                await addAgent(
                  agentName,
                  agentPhone,
                  agentPassword || undefined,
                );
                setAgentName("");
                setAgentPhone("");
                setAgentPassword("");
                router.refresh();
              })
            }
          >
            {isAr ? "إضافة" : "Ajouter"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {isAr ? "نصوص الصفحة الرئيسية" : "Textes d’accueil"}
        </h2>
        <Input
          label="Title FR"
          value={form.homeTitleFr}
          onChange={(e) => setForm({ ...form, homeTitleFr: e.target.value })}
        />
        <Input
          label="Title AR"
          value={form.homeTitleAr}
          onChange={(e) => setForm({ ...form, homeTitleAr: e.target.value })}
        />
        <Textarea
          label="Body FR"
          value={form.homeBodyFr}
          onChange={(e) => setForm({ ...form, homeBodyFr: e.target.value })}
        />
        <Textarea
          label="Body AR"
          value={form.homeBodyAr}
          onChange={(e) => setForm({ ...form, homeBodyAr: e.target.value })}
        />
        <Input
          label="CTA FR"
          value={form.homeCtaFr}
          onChange={(e) => setForm({ ...form, homeCtaFr: e.target.value })}
        />
        <Input
          label="CTA AR"
          value={form.homeCtaAr}
          onChange={(e) => setForm({ ...form, homeCtaAr: e.target.value })}
        />
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await updateOwnerSettings(form);
              setToast(isAr ? "تم الحفظ" : "Enregistré");
              router.refresh();
            })
          }
        >
          {isAr ? "حفظ النصوص" : "Enregistrer les textes"}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {isAr ? "كلمة مرور المالك" : "Mot de passe propriétaire"}
        </h2>
        <Input
          type="password"
          value={ownerPwd}
          onChange={(e) => setOwnerPwd(e.target.value)}
        />
        <Button
          type="button"
          disabled={pending || ownerPwd.length < 6}
          onClick={() =>
            start(async () => {
              await updateOwnerSettings({ password: ownerPwd });
              setOwnerPwd("");
              setToast(isAr ? "تم الحفظ" : "Enregistré");
            })
          }
        >
          {isAr ? "تغيير" : "Changer"}
        </Button>
      </section>

      <section className="space-y-2 rounded-[16px] border border-line bg-surface p-4 text-[13px]">
        <h2 className="text-base font-semibold">
          {isAr ? "الروابط" : "Liens"}
        </h2>
        <div>
          APP_URL: <bdi className="font-mono">{appUrl}</bdi>
        </div>
        <div>
          QR_BASE_URL: <bdi className="font-mono">{qrBaseUrl}</bdi>
        </div>
        <p className="text-muted">
          {isAr
            ? "النطاق المطبوع في الرمز (QR_BASE_URL) لا يتغير إذا غيّرتم اسم الموقع. أبقوه حياً."
            : "Le domaine imprimé dans le QR (QR_BASE_URL) ne change pas si vous renommez le site. Gardez-le en vie."}
        </p>
      </section>

      <Button
        type="button"
        variant="danger"
        onClick={() =>
          start(async () => {
            await ownerLogout();
            router.refresh();
          })
        }
      >
        {isAr ? "خروج" : "Déconnexion"}
      </Button>
    </div>
  );
}

function AgentRow({
  agent,
  isAr,
}: {
  agent: { id: string; name: string; phone: string | null };
  isAr: boolean;
}) {
  const [pwd, setPwd] = useState("");
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[12px] border border-line bg-surface px-4 py-3">
      <Toast message={toast} onDone={() => setToast(null)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">{agent.name}</div>
          {agent.phone && (
            <div className="text-[13px] text-muted">
              <bdi>{agent.phone}</bdi>
            </div>
          )}
        </div>
        <button
          type="button"
          className="min-h-10 rounded-[10px] border border-line bg-bg px-3 text-[13px] font-medium"
          onClick={() => setOpen((v) => !v)}
        >
          {isAr ? "كلمة المرور" : "Mot de passe"}
        </button>
      </div>
      {open ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            placeholder={isAr ? "كلمة مرور جديدة (6+)" : "Nouveau mot de passe (6+)"}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          <Button
            type="button"
            className="sm:w-auto"
            disabled={pending || pwd.length < 6}
            onClick={() =>
              start(async () => {
                const res = await setAgentPassword(agent.id, pwd);
                setToast(
                  res.ok
                    ? isAr
                      ? "تم التحديث"
                      : "Mis à jour"
                    : isAr
                      ? "خطأ"
                      : "Erreur",
                );
                if (res.ok) {
                  setPwd("");
                  setOpen(false);
                }
              })
            }
          >
            {pending
              ? "…"
              : isAr
                ? "تثبيت كلمة مرور البائع"
                : "Définir le mot de passe vendeur"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
