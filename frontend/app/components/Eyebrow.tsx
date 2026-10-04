export function Eyebrow({ children }: { children: string }) {
  return (
    <div className="eyebrow">
      <span /> {children} <span className="eyebrow-line" />
    </div>
  );
}
