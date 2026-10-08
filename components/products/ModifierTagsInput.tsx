'use client'

import { useState, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface ModifierTagsInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function ModifierTagsInput({
  value = [],
  onChange,
  placeholder = 'Ej. Sin cebolla, con extra aguacate...'
}: ModifierTagsInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    // Evitar duplicados exactos (insensible a mayúsculas/minúsculas o sensible? "mantener mayúsculas/minúsculas como las escribió el usuario" but "evitar duplicados exactos")
    const exists = value.some(tag => tag.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      toast.warning('Este modificador ya ha sido agregado')
      return
    }

    const nextValue = [...value, trimmed]
    onChange(nextValue)
    setInputValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRemove = (indexToRemove: number) => {
    const nextValue = value.filter((_, i) => i !== indexToRemove)
    onChange(nextValue)
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAdd}
          variant="outline"
          disabled={!inputValue.trim()}
          className="shrink-0 hover:bg-stone-100 dark:hover:bg-stone-900"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Agregar
        </Button>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/40 min-h-[40px] items-center">
          {value.map((tag, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="pl-2.5 pr-1 py-1 flex items-center gap-1.5 text-xs font-semibold rounded-full border border-stone-200 shadow-sm bg-white dark:bg-stone-900 text-foreground transition-all hover:scale-105 active:scale-95"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="h-4 w-4 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                aria-label={`Eliminar modificador ${tag}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic pl-1">
          No hay modificadores agregados. Escribe y presiona Enter para agregar.
        </p>
      )}
    </div>
  )
}
