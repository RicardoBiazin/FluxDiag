import { useEffect, useState } from 'react'

/** Campo que só grava no documento ao sair (um passo de desfazer por edição). */
export default function CommitInput({ value, onCommit, multiline, placeholder, className, ariaLabel }: { value: string; onCommit: (v: string) => void; multiline?: boolean; placeholder?: string; className?: string; ariaLabel?: string }) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  const commit = () => {
    if (local !== value) onCommit(local)
  }
  const props = {
    className: className ?? `text-input${multiline ? ' notes' : ''}`,
    'aria-label': ariaLabel,
    value: local,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLocal(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Enter' && (!multiline || e.ctrlKey)) (e.target as HTMLElement).blur()
    },
  }
  return multiline ? <textarea {...props} /> : <input {...props} />
}
