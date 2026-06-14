import { useEffect, useState } from "react"

const STORAGE_KEY = "wekbench.sessionBuyers.v1"
const listeners = new Set<() => void>()

function read(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function write(names: string[]) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(names))
  listeners.forEach((l) => l())
}

export function getSessionBuyers(): string[] {
  return read()
}

export function addSessionBuyer(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const current = read()
  if (current.includes(trimmed)) return trimmed
  write([trimmed, ...current])
  return trimmed
}

export function useSessionBuyers(): string[] {
  const [names, setNames] = useState<string[]>(() => read())
  useEffect(() => {
    const update = () => setNames(read())
    listeners.add(update)
    update()
    return () => {
      listeners.delete(update)
    }
  }, [])
  return names
}
