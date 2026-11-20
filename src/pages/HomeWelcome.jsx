import { useChatStore } from "../store/useChatStore";
import FlapText from "../components/ui/FlapText";
import InviteCard from "../components/InviteCard";

// The right-hand side on desktop before a chat is open.
export default function HomeWelcome() {
  const hasFriends = useChatStore((s) => s.friends.length > 0);

  return (
    <div className="grid flex-1 place-items-center overflow-y-auto p-10">
      <div className="flex max-w-[520px] flex-col items-center text-center">
        <FlapText
          text={hasFriends ? "PICK A FRIEND" : "BRING YOUR PEOPLE"}
          reveal
          className="text-[clamp(26px,2.9vw,42px)]"
        />
        <p className="mt-7 max-w-[40ch] text-[16px] leading-relaxed text-ink-muted">
          {hasFriends ? (
            <>
              Choose someone on the board, or press{" "}
              <kbd className="rounded border border-tile-line px-1.5 font-board text-[13px]">Ctrl</kbd>{" "}
              <kbd className="rounded border border-tile-line px-1.5 font-board text-[13px]">K</kbd> to jump to
              anyone.
            </>
          ) : (
            "Chatify only works with your people on it. Send your link: whoever opens it lands on your board."
          )}
        </p>
        <InviteCard className="mt-10 w-full" qr={!hasFriends} />
      </div>
    </div>
  );
}
