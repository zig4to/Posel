export function ColorDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={"inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full " + (className ?? "")}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export function ClientBadge({ color, name }: { color: string; name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      <ColorDot color={color} />
      {name}
    </span>
  );
}
