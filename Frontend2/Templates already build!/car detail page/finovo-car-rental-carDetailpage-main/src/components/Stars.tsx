import { Star } from "lucide-react";

export function Stars({ size = 14 }: { size?: number }) {
  return (
    <span className="flex gap-0.5 text-gold">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}
