import { Link } from "react-router";
import { ArrowLeftIcon } from "lucide-react";

// The header of a full page on the right (or the whole screen on a phone).
export default function PageHeader({ title, children }) {
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-2 border-b border-tile-edge bg-board px-3 sm:px-5">
      <Link to="/" className="icon-btn lg:hidden" aria-label="Back to board">
        <ArrowLeftIcon className="size-5" />
      </Link>
      <h1 className="panel-title flex-1 truncate text-[24px]">{title}</h1>
      {children}
    </header>
  );
}
