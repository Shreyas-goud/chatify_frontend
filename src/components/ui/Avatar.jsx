// Initials of the first two words, or the first two letters of a single word.
const initialsOf = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

// A flap module carrying the person's initials, or their photo. Small ones drop the hinge,
// which would read as a strikethrough.
export default function Avatar({ user, size = 44, online = false, className = "" }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      {user?.profilePic ? (
        <img
          src={user.profilePic}
          alt=""
          className="size-full rounded-[10px] bg-tile object-cover"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <span
          style={style}
          className={`relative grid place-items-center overflow-hidden rounded-[10px] ${size >= 40 ? "bg-[linear-gradient(to_bottom,#2E2F34_50%,#26272B_50%)]" : "bg-tile-hi"} font-board font-bold tracking-[0.04em] text-ink`}
        >
          {initialsOf(user?.fullName)}
          {size >= 40 && <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-tile-edge" />}
        </span>
      )}
      {online && (
        <span
          className="lamp absolute -bottom-0.5 -right-0.5 bg-go"
          style={{ width: Math.max(8, size * 0.24), height: Math.max(8, size * 0.24) }}
          aria-label="Online"
        />
      )}
    </span>
  );
}
