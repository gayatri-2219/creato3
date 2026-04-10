export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-xl bg-black/5 dark:bg-white/10 ${className}`} />
  )
}
