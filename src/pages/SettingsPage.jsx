import { useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { CameraIcon, LoaderIcon, LogOutIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { usePrefsStore } from "../store/usePrefsStore";
import { toSendableImage } from "../lib/image";
import { canInstall, isInstalled, isIOS, promptInstall, subscribeInstall } from "../lib/install";
import { normalizeUsername, useUsernameCheck } from "../hooks/useUsernameCheck";
import { usePush } from "../hooks/usePush";
import { normalizePhone } from "../lib/phone";
import Avatar from "../components/ui/Avatar";
import Field from "../components/ui/Field";
import PageHeader from "../components/PageHeader";

function Switch({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 py-3">
      <span>
        <span className="block text-[15px] text-ink">{label}</span>
        <span className="mt-0.5 block text-[13px] text-ink-muted">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out ${checked ? "bg-signal" : "bg-tile-line"}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-ink transition-transform duration-200 ease-out ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </label>
  );
}

function Profile() {
  const authUser = useAuthStore((s) => s.authUser);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [fullName, setFullName] = useState(authUser.fullName);
  const [username, setUsername] = useState(authUser.username);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);
  const check = useUsernameCheck(username, authUser.username);

  const changed = fullName.trim() !== authUser.fullName || normalizeUsername(username) !== authUser.username;

  const save = async (event) => {
    event.preventDefault();
    if (!changed || check.state === "bad" || check.state === "checking") return;
    setSaving(true);
    if (await updateProfile({ fullName: fullName.trim(), username: normalizeUsername(username) })) {
      toast.success("Saved.");
    }
    setSaving(false);
  };

  const changePhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const profilePic = await toSendableImage(file, { maxSide: 800, quality: 0.9 });
      if (await updateProfile({ profilePic })) toast.success("New photo is up.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section>
      <h2 className="label">Profile</h2>
      <div className="mt-4 flex items-center gap-5">
        <Avatar user={authUser} size={84} />
        <div>
          <button
            type="button"
            className="btn-quiet h-10 px-4 text-[13px]"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? <LoaderIcon className="size-4 animate-spin" /> : <CameraIcon className="size-4" />}
            {authUser.profilePic ? "Change photo" : "Add a photo"}
          </button>
          <p className="mt-2 text-[13px] text-ink-faint">Friends see it on their board.</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            changePhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <form onSubmit={save} className="mt-8 space-y-5">
        <Field label="Name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={60} />
        <Field
          label="Username"
          prefix="@"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={21}
          hint={check.message || "Changing it doesn’t break your invite link."}
          hintTone={check.state === "ok" ? "ok" : check.state === "bad" ? "bad" : "muted"}
        />
        <div>
          <p className="label mb-2">Email</p>
          <p className="text-[15px] text-ink-muted">{authUser.email}</p>
        </div>
        <button type="submit" className="btn-primary" disabled={!changed || saving || check.state === "bad"}>
          {saving ? <LoaderIcon className="size-5 animate-spin" /> : "Save changes"}
        </button>
      </form>
    </section>
  );
}

function Notifications() {
  const { status, busy, turnOn, turnOff } = usePush();
  if (status === null) return null;
  const copy = {
    unsupported: isIOS()
      ? "On iPhone, add Chatify to your Home Screen first, then turn notifications on from there."
      : "This browser can't receive notifications.",
    blocked: "Notifications are blocked for Chatify. Allow them in your browser's site settings.",
  };
  if (copy[status]) return <p className="py-3 text-[14px] text-ink-muted">{copy[status]}</p>;
  return (
    <Switch
      checked={status === "on"}
      onChange={busy ? undefined : status === "on" ? turnOff : turnOn}
      label="Notifications on this device"
      description="Messages and nudges reach you when Chatify isn’t open. In Glass circles, members see when a notification arrived and if you swiped it away."
    />
  );
}

function Phone() {
  const authUser = useAuthStore((s) => s.authUser);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = Boolean(normalizePhone(phone, "91"));

  const save = async (value) => {
    setSaving(true);
    if (await updateProfile({ phone: value })) {
      setPhone("");
      toast.success(value ? "Number saved." : "Number removed.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {authUser.phoneHint ? (
        <div className="flex items-center justify-between gap-4">
          <span className="text-[15px] tabular text-ink">{authUser.phoneHint}</span>
          <button type="button" className="btn-quiet h-9 px-3.5 text-[13px]" disabled={saving} onClick={() => save("")}>
            Remove
          </button>
        </div>
      ) : (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save(phone);
          }}
        >
          <Field
            className="flex-1"
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit" className="btn-quiet h-12" disabled={!valid || saving}>
            Save
          </button>
        </form>
      )}
      <Switch
        checked={authUser.discoverableByPhone}
        onChange={() => updateProfile({ discoverableByPhone: !authUser.discoverableByPhone })}
        label="Friends with my number can find me"
        description="Only a scrambled fingerprint of your number is stored, never the number itself."
      />
    </div>
  );
}

function InstallApp() {
  const installable = useSyncExternalStore(subscribeInstall, canInstall);
  if (isInstalled()) return <p className="py-3 text-[15px] text-ink-muted">Chatify is installed on this device.</p>;
  if (installable) {
    return (
      <div className="flex items-center justify-between gap-6 py-3">
        <span className="text-[15px] text-ink">Put Chatify on your home screen</span>
        <button type="button" className="btn-quiet h-10 px-4 text-[13px]" onClick={promptInstall}>
          Install
        </button>
      </div>
    );
  }
  return (
    <p className="py-3 text-[14px] text-ink-muted">
      {isIOS()
        ? "On iPhone: tap Share, then “Add to Home Screen”."
        : "Open your browser’s menu and choose “Install app” or “Add to Home screen”."}
    </p>
  );
}

export default function SettingsPage() {
  const logout = useAuthStore((s) => s.logout);
  const soundOn = usePrefsStore((s) => s.soundOn);
  const toggleSound = usePrefsStore((s) => s.toggleSound);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[560px] space-y-10 px-5 py-8 pb-[max(32px,env(safe-area-inset-bottom))]">
          <Profile />
          <section>
            <h2 className="label">Phone</h2>
            <div className="mt-3">
              <Phone />
            </div>
          </section>
          <section>
            <h2 className="label">Notifications</h2>
            <Notifications />
          </section>
          <section>
            <h2 className="label">Preferences</h2>
            <Switch
              checked={soundOn}
              onChange={toggleSound}
              label="Sounds"
              description="A chime for new messages and a soft flap click when you send."
            />
          </section>
          <section>
            <h2 className="label">App</h2>
            <InstallApp />
          </section>
          <section>
            <button
              type="button"
              className="btn-danger -ml-5"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOutIcon className="size-4" /> Log out
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
