'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Pencil, Check } from 'lucide-react'

interface EditableTextProps {
  value: string
  onSave: (newValue: string) => void
  className?: string
  tag?: 'h2' | 'p' | 'span'
  placeholder?: string
}

export function EditableText({ value, onSave, className, tag: Tag = 'span', placeholder = 'Clique para editar' }: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    setDraft(value)
  }, [value])

  function handleSave() {
    setEditing(false)
    if (draft.trim() !== value) {
      onSave(draft.trim())
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setDraft(value)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="relative group">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full resize-none bg-white/10 rounded px-1.5 py-0.5 text-white outline-none ring-1 ring-white/30 focus:ring-white/60',
            className
          )}
          rows={Math.max(1, draft.split('\n').length)}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); handleSave() }}
          className="absolute -right-6 top-0 rounded bg-white/20 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Check className="h-3 w-3 text-white" />
        </button>
      </div>
    )
  }

  return (
    <div className="group relative cursor-pointer" onClick={() => setEditing(true)}>
      <Tag className={cn(className, !value && 'opacity-40 italic')}>
        {value || placeholder}
      </Tag>
      <Pencil className="absolute -right-4 top-0 h-3 w-3 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}
