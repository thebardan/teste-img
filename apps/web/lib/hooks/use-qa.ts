'use client'
import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type QACheckLevel = 'ERROR' | 'WARNING' | 'INFO'

export interface QACheck {
  rule: string
  level: QACheckLevel
  message: string
  passed: boolean
  explanation?: string
  fixSuggestion?: string
  targetField?: string
}

export interface AiFinding {
  field?: string
  severity: QACheckLevel
  message: string
  fixSuggestion?: string
}

export interface QAResult {
  score: number
  passed: boolean
  checks: QACheck[]
  aiFindings: AiFinding[]
  checkedAt: string
}

export function useQASalesSheet() {
  return useMutation<QAResult, Error, string>({
    mutationFn: (id) => apiFetch(`/qa/sales-sheet/${id}`, { method: 'POST' }),
  })
}

export function useQAPresentation() {
  return useMutation<QAResult, Error, string>({
    mutationFn: (id) => apiFetch(`/qa/presentation/${id}`, { method: 'POST' }),
  })
}
