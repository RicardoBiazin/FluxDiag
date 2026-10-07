import type { Diagram } from './types'
import { validateDiagram } from './model'

export interface DocMeta {
  id: string
  name: string
  updatedAt: number
}

const INDEX_KEY = 'fluxdiag:index'
const DOC_KEY = (id: string) => `fluxdiag:doc:${id}`
const CURRENT_KEY = 'fluxdiag:current'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function listDocs(): DocMeta[] {
  try {
    const raw = JSON.parse(safeGet(INDEX_KEY) ?? '[]')
    return Array.isArray(raw) ? (raw as DocMeta[]).sort((a, b) => b.updatedAt - a.updatedAt) : []
  } catch {
    return []
  }
}

export function loadDoc(id: string): Diagram | null {
  const raw = safeGet(DOC_KEY(id))
  if (!raw) return null
  try {
    return validateDiagram(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveDoc(id: string, d: Diagram): boolean {
  const ok = safeSet(DOC_KEY(id), JSON.stringify(d))
  if (!ok) return false
  const docs = listDocs().filter((m) => m.id !== id)
  docs.push({ id, name: d.name, updatedAt: Date.now() })
  safeSet(INDEX_KEY, JSON.stringify(docs))
  safeSet(CURRENT_KEY, id)
  return true
}

export function deleteDoc(id: string) {
  try {
    localStorage.removeItem(DOC_KEY(id))
  } catch {
    /* ignora */
  }
  safeSet(INDEX_KEY, JSON.stringify(listDocs().filter((m) => m.id !== id)))
}

export function currentDocId(): string | null {
  return safeGet(CURRENT_KEY)
}

export function setCurrentDocId(id: string) {
  safeSet(CURRENT_KEY, id)
}

export function getPref(key: string, fallback: string): string {
  return safeGet(`fluxdiag:pref:${key}`) ?? fallback
}

export function setPref(key: string, value: string) {
  safeSet(`fluxdiag:pref:${key}`, value)
}
