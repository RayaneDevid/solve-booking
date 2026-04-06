import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner',
  disabled = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full bg-dark-700 border rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between gap-2 transition-colors ${
          disabled
            ? 'border-dark-500 text-gray-500 cursor-not-allowed opacity-50'
            : open
            ? 'border-accent/50 ring-1 ring-accent/30'
            : 'border-dark-500 hover:border-dark-400 cursor-pointer'
        }`}
      >
        <span className={selectedLabel ? 'text-white' : 'text-gray-500'}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-[200] top-full mt-1 w-full bg-dark-700 border border-dark-500 rounded-lg shadow-2xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                value === ''
                  ? 'bg-accent/20 text-accent'
                  : 'text-gray-400 hover:bg-dark-600 hover:text-white'
              }`}
            >
              {placeholder}
            </button>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => !option.disabled && handleSelect(option.value)}
                className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                  option.disabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : value === option.value
                    ? 'bg-accent/20 text-accent'
                    : 'text-white hover:bg-dark-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
