import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { LoaderIcon } from "lucide-react";
import { axiosInstance, errorMessage } from "../lib/axios";
import { savePendingInvite } from "../lib/invite";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import Avatar from "../components/ui/Avatar";
import FlapText from "../components/ui/FlapText";
import Logo from "../components/ui/Logo";

// /i/<code>: someone shared their invite link. Signed in, one tap makes you friends;
// signed out, the code waits in this tab until sign-up or sign-in finishes.
export default function InvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.authUser);
  const acceptInvite = useChatStore((s) => s.acceptInvite);
  const [state, setState] = useState({ status: "loading", inviter: null, error: "" });
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    axiosInstance
      .get(`/friends/invite/${code}`)
      .then((res) => setState({ status: "ready", inviter: res.data, error: "" }))
      .catch((error) => setState({ status: "error", inviter: null, error: errorMessage(error) }));
  }, [code]);

  const { inviter } = state;
  const ownLink = authUser && inviter && authUser._id === inviter._id;

  const connect = async () => {
    setJoining(true);
    const friend = await acceptInvite(code);
    setJoining(false);
    if (friend) navigate(`/c/${friend.username}`, { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-board-deep px-5 py-6 sm:px-10">
      <header>
        <Link to="/" aria-label="Chatify home">
          <Logo className="text-[17px]" />
        </Link>
      </header>

      <main className="grid flex-1 place-items-center py-10">
        {state.status === "loading" && <LoaderIcon className="size-6 animate-spin text-ink-muted" />}

        {state.status === "error" && (
          <div className="max-w-[420px] text-center">
            <FlapText text="NO SERVICE" className="text-[clamp(26px,7vw,44px)]" reveal />
            <p className="mt-5 text-ink-muted">{state.error}</p>
            <Link to="/" className="btn-quiet mt-8">
              Go to Chatify
            </Link>
          </div>
        )}

        {state.status === "ready" && (
          <div className="w-full max-w-[420px] rounded-[16px] bg-board p-6 text-center sm:p-8">
            <Avatar user={inviter} size={88} className="mx-auto" />
            <p className="label mt-6">Invitation</p>
            <h1 className="board-name mt-2 text-[34px] leading-none">{inviter.fullName}</h1>
            <p className="mt-1 text-ink-muted">@{inviter.username}</p>
            <p className="mx-auto mt-5 max-w-[30ch] text-[15px] text-ink-muted">
              wants you on their Chatify board, so the two of you never go quiet.
            </p>

            {ownLink ? (
              <p className="mt-8 rounded-[10px] bg-tile p-3 text-[14px] text-ink-muted">
                This is your own invite link. Send it to a friend.
              </p>
            ) : authUser ? (
              <button className="btn-primary mt-8 w-full" onClick={connect} disabled={joining}>
                {joining ? <LoaderIcon className="size-5 animate-spin" /> : `Connect with ${inviter.fullName.split(" ")[0]}`}
              </button>
            ) : (
              <div className="mt-8 grid gap-3">
                <Link to="/signup" className="btn-primary w-full" onClick={() => savePendingInvite(code)}>
                  Create account
                </Link>
                <Link to="/login" className="btn-quiet w-full" onClick={() => savePendingInvite(code)}>
                  I have an account
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
