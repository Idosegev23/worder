type LoadingOverlayProps = {
  message?: string
  fullscreen?: boolean
}

export function LoadingOverlay({ message = 'טוען...', fullscreen = false }: LoadingOverlayProps) {
  const positioning = fullscreen
    ? 'fixed inset-0'
    : 'absolute inset-0 rounded-2xl border border-white/10'

  return (
    <div
      className={`${positioning} z-40 flex flex-col items-center justify-center bg-[rgba(8,10,25,0.8)] backdrop-blur-md text-white`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex items-center justify-center">
        <div className="h-14 w-14 rounded-full border-4 border-white/30 border-t-accent animate-spin" />
      </div>
      <p className="text-lg font-semibold tracking-wide drop-shadow-lg">{message}</p>
    </div>
  )
}

