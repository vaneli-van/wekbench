import { useEffect, useState } from "react"
import type { PipelineQuote } from "./pipeline"

const STORAGE_KEY = "wekbench.manualQuotes.v1"
const listeners = new Set<() => void>()

function read(): PipelineQuote[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PipelineQuote[]) : []
  } catch {
    return []
  }
}

function write(quotes: PipelineQuote[]) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(quotes))
  listeners.forEach((l) => l())
}

export function getManualQuotes(): PipelineQuote[] {
  return read()
}

export function getManualQuote(id: string): PipelineQuote | undefined {
  return read().find((q) => q.id === id)
}

export function addManualQuote(
  input: { title: string; buyer: string; sector: string; assignee: string },
): PipelineQuote {
  const today = new Date().toISOString().slice(0, 10)
  const id = `QT-${Date.now().toString(36).toUpperCase()}`
  const quote: PipelineQuote = {
    id,
    title: input.title,
    buyer: input.buyer,
    sector: input.sector,
    value: 0,
    stage: "drafted",
    daysInStage: 0,
    lineItems: 0,
    attachments: 0,
    comments: 0,
    assignee: input.assignee,
    createdAt: today,
    updatedAt: today,
  }
  write([quote, ...read()])
  return quote
}

export function useManualQuotes(): PipelineQuote[] {
  const [quotes, setQuotes] = useState<PipelineQuote[]>(() => read())
  useEffect(() => {
    const update = () => setQuotes(read())
    listeners.add(update)
    update()
    return () => {
      listeners.delete(update)
    }
  }, [])
  return quotes
}
