const SIZES = {
  sm: "max-w-2xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
} as const;

/** Page width + padding used by the signed-in pages. */
export default function Container({
  children,
  size = "lg",
  className = "",
}: {
  children: React.ReactNode;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return <div className={`mx-auto w-full ${SIZES[size]} px-4 py-8 sm:px-6 sm:py-10 ${className}`}>{children}</div>;
}
