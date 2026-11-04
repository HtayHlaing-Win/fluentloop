import Link from "next/link";
import { Mic } from "lucide-react";

export default function Brand({
  href = "/",
  inverted = false,
  hideTextOnMobile = false,
}: {
  href?: string;
  inverted?: boolean;
  /** Show only the logo mark on very small screens (used where space is tight). */
  hideTextOnMobile?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          inverted ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        <Mic size={16} aria-hidden="true" />
      </span>
      <span
        className={`font-display text-lg font-bold ${inverted ? "text-primary-foreground" : ""} ${
          hideTextOnMobile ? "hidden sm:inline" : ""
        }`}
      >
        FluentLoop
      </span>
    </Link>
  );
}
