interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      {label && <span className="text-ink font-medium">{label}</span>}
      <div
        className={`relative w-14 h-7 rounded-pill border-2 border-ink transition-colors ${
          checked ? 'bg-mint' : 'bg-track'
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-[2px] w-[20px] h-[20px] rounded-pill bg-surface border-2 border-ink transition-transform ${
            checked ? 'translate-x-1' : 'translate-x-[30px]'
          }`}
        />
      </div>
    </label>
  )
}
