type LoadingOverlayProps = {
  message?: string
  fullscreen?: boolean
}

export function LoadingOverlay({ message = 'טוען...', fullscreen = false }: LoadingOverlayProps) {
  const positioning = fullscreen ? 'fixed inset-0' : 'absolute inset-0 rounded-md2'

  return (
    <div
      className={`${positioning} z-40 flex flex-col items-center justify-center bg-cream/92 text-ink`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 h-12 w-12 rounded-pill border-4 border-track border-t-sky animate-spin" />
      <p className="text-lg font-bold">{message}</p>
    </div>
  )
}
