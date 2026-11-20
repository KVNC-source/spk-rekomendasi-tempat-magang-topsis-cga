// Not every card is equal: `plain` is the ordinary surface, `quiet` is for
// secondary content and drops the border so it recedes.
const tones = {
  plain: "border border-line bg-surface",
  quiet: "bg-mist-200/60",
};

/** Surface container. `as` lets callers pick the right semantic element. */
export default function Card({
  as: Tag = "div",
  tone = "plain",
  padded = true,
  interactive = false,
  className = "",
  children,
  ...rest
}) {
  return (
    <Tag
      className={`rounded-card ${tones[tone]} ${padded ? "p-4 md:p-5" : ""} ${
        interactive ? "press hover:border-line-strong" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
