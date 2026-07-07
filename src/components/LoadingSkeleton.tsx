export function LoadingSkeleton({ label = "Загрузка..." }: { label?: string }) {
  return (
    <div className="loading-block">
      <div className="skeleton wide" />
      <div className="skeleton" />
      <div className="skeleton short" />
      <p>{label}</p>
    </div>
  );
}
