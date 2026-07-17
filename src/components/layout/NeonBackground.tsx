/** Soft drifting neon blobs behind the whole app. Purely decorative. */
export function NeonBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute -top-24 -left-24 h-72 w-72 rounded-full animate-drift"
        style={{ background: '#00D4FF', opacity: 0.08, filter: 'blur(130px)' }}
      />
      <div
        className="absolute top-1/3 -right-28 h-80 w-80 rounded-full animate-drift"
        style={{
          background: '#FF2D95',
          opacity: 0.07,
          filter: 'blur(140px)',
          animationDelay: '-8s',
        }}
      />
      <div
        className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full animate-drift"
        style={{
          background: '#39FF88',
          opacity: 0.06,
          filter: 'blur(130px)',
          animationDelay: '-16s',
        }}
      />
    </div>
  )
}
