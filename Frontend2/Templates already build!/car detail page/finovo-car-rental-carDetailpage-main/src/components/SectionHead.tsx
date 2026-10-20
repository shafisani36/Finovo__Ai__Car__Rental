export function SectionHead({ title, sub, tag }: { title: string; sub: string; tag?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-3xl font-semibold text-foreground md:text-4xl">{title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{sub}</p>
      </div>
      {tag && <span className="hidden text-xs font-bold tracking-[0.2em] text-plum md:block">— {tag}</span>}
    </div>
  );
}
