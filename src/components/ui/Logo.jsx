import FlapText from "./FlapText";

export default function Logo({ className = "text-[18px]", reveal = false }) {
  return <FlapText text="CHATIFY" className={className} reveal={reveal} stagger={45} />;
}
