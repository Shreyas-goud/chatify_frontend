import { Suspense, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { LoaderIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useCircleStore } from "../store/useCircleStore";
import { NudgePopup } from "../components/circle/GlassParts";
import Board from "../components/board/Board";
import QuickSwitcher from "../components/QuickSwitcher";

// Desktop: the board on the left, the open page on the right.
// Phone: the board is the home screen and every other page takes the whole screen.
export default function AppShell() {
  const { pathname } = useLocation();
  const atHome = pathname === "/";
  const unread = useChatStore((s) => s.friends.reduce((sum, f) => sum + f.unread, 0));
  const requests = useChatStore((s) => s.incoming.length);
  const circleUnread = useCircleStore((s) => s.circles.reduce((sum, c) => sum + (c.unread ?? 0) + (c.myStatus === "invited" ? 1 : 0), 0));
  const nudge = useCircleStore((s) => s.incomingNudges[0]);
  const answerNudge = useCircleStore((s) => s.answerNudge);
  const navigate = useNavigate();

  useEffect(() => {
    const count = unread + requests + circleUnread;
    document.title = nudge ? "Nudge · Chatify" : count ? `(${count}) Chatify` : "Chatify";
  }, [unread, requests, circleUnread, nudge]);

  return (
    <div className="flex h-dvh overflow-hidden bg-board-deep">
      <aside
        className={`${atHome ? "flex" : "hidden"} w-full shrink-0 flex-col bg-board lg:flex lg:w-[392px] lg:border-r lg:border-tile-edge`}
      >
        <Board />
      </aside>
      <main key={pathname} className={`${atHome ? "hidden" : "flex"} page-enter min-w-0 flex-1 flex-col lg:flex`}>
        <Suspense
          fallback={
            <div className="grid flex-1 place-items-center">
              <LoaderIcon className="size-6 animate-spin text-ink-faint" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <QuickSwitcher />
      {nudge && (
        <NudgePopup
          key={nudge._id}
          nudge={nudge}
          onAnswer={(outcome) => {
            answerNudge(nudge, outcome);
            if (outcome === "opened") navigate(`/g/${nudge.circleId}`);
          }}
        />
      )}
    </div>
  );
}
