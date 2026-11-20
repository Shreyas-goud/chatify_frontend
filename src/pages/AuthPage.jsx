import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { LoaderIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { peekPendingInvite } from "../lib/invite";
import { suggestUsername, useUsernameCheck } from "../hooks/useUsernameCheck";
import FlapText from "../components/ui/FlapText";
import FlipClock from "../components/ui/FlipClock";
import Logo from "../components/ui/Logo";
import Field from "../components/ui/Field";
import Avatar from "../components/ui/Avatar";
import DemoBoard from "../components/DemoBoard";

const HEADLINE = ["DON'T LET", "YOUR PEOPLE", "GO QUIET"];

// Who sent the invite this visitor opened before signing in, if any.
function useInviter() {
  const [inviter, setInviter] = useState(null);
  useEffect(() => {
    const code = peekPendingInvite();
    if (!code) return;
    axiosInstance
      .get(`/friends/invite/${code}`)
      .then((res) => setInviter(res.data))
      .catch(() => {});
  }, []);
  return inviter;
}

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const [params] = useSearchParams();
  const { signup, login, isSubmitting } = useAuthStore();
  const inviter = useInviter();

  const [form, setForm] = useState({ fullName: "", username: "", email: "", identifier: "", password: "" });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const username = usernameTouched ? form.username : suggestUsername(form.fullName);
  const check = useUsernameCheck(isSignup ? username : "");
  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    if (isSignup) {
      if (check.state === "bad") return;
      signup({ fullName: form.fullName, username, email: form.email, password: form.password });
    } else {
      login({ identifier: form.identifier, password: form.password });
    }
  };

  const switchTo = `${isSignup ? "/login" : "/signup"}${params.toString() ? `?${params}` : ""}`;

  return (
    <div className="min-h-dvh bg-board-deep lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,34vw)]">
      <section className="flex flex-col gap-10 px-5 pb-10 pt-6 sm:px-10 lg:min-h-dvh lg:justify-between lg:px-14 lg:py-10">
        <header className="flex items-center justify-between">
          <Logo className="text-[17px]" />
          <FlipClock className="text-[17px]" />
        </header>

        <div>
          <h1 className="flex flex-col gap-[0.14em] text-[clamp(30px,8.4vw,80px)] lg:text-[clamp(40px,4.6vw,80px)] leading-none">
            {HEADLINE.map((line, i) => (
              <FlapText key={line} text={line} reveal delay={150 + i * 260} stagger={40} />
            ))}
          </h1>
          <p className="mt-7 max-w-[36ch] text-[17px] leading-relaxed text-ink-muted sm:text-[19px]">
            Friendships don’t end, they go quiet. Chatify gives yours a reason to talk every day, and shows
            you who’s drifting before it’s too late.
          </p>
        </div>

        <DemoBoard className="hidden max-w-[560px] md:block" />
      </section>

      <section className="flex items-start justify-center border-t border-tile-edge bg-board px-5 py-10 sm:px-10 lg:items-center lg:border-l lg:border-t-0">
        <form onSubmit={submit} className="w-full max-w-[380px]" noValidate>
          {inviter && (
            <div className="mb-8 flex items-center gap-3 rounded-[12px] bg-tile p-3">
              <Avatar user={inviter} size={40} />
              <p className="text-[14px] leading-snug text-ink-muted">
                <span className="text-ink">{inviter.fullName}</span> invited you.{" "}
                {isSignup ? "Create an account" : "Sign in"} and you’re friends.
              </p>
            </div>
          )}

          <h2 className="panel-title">{isSignup ? "Get on the board" : "Welcome back"}</h2>
          <p className="mt-2 text-[15px] text-ink-muted">
            {isSignup ? "Takes 20 seconds. Bring your people after." : "Your board missed you."}
          </p>

          <div className="mt-8 space-y-5">
            {isSignup ? (
              <>
                <Field
                  label="Name"
                  autoComplete="name"
                  placeholder="Ravi Mehta"
                  value={form.fullName}
                  onChange={update("fullName")}
                  maxLength={60}
                  required
                />
                <Field
                  label="Username"
                  prefix="@"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="ravi"
                  value={username}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    setForm((f) => ({ ...f, username: e.target.value }));
                  }}
                  maxLength={21}
                  hint={check.message || "Friends find you by this."}
                  hintTone={check.state === "ok" ? "ok" : check.state === "bad" ? "bad" : "muted"}
                />
                <Field
                  label="Email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder="ravi@example.com"
                  value={form.email}
                  onChange={update("email")}
                  required
                />
              </>
            ) : (
              <Field
                label="Email or username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="ravi@example.com or @ravi"
                value={form.identifier}
                onChange={update("identifier")}
                required
              />
            )}
            <Field
              label="Password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 6 characters" : "Your password"}
              value={form.password}
              onChange={update("password")}
              required
            />
          </div>

          <button type="submit" className="btn-primary mt-8 w-full" disabled={isSubmitting || check.state === "bad"}>
            {isSubmitting ? <LoaderIcon className="size-5 animate-spin" /> : isSignup ? "Create account" : "Sign in"}
          </button>

          <p className="mt-6 text-center text-[14px] text-ink-muted">
            {isSignup ? "Already on the board? " : "New here? "}
            <Link to={switchTo} className="font-semibold text-signal underline-offset-4 hover:underline">
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
