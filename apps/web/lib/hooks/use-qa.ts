'use client'
import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type QACheckLevel = 'ERROR' | 'WARNING' | 'INFO'

export interface QACheck {
  rule: string
  level: QACheckLevel
  message: string
  passed: boolean
}

export interface QAResult {
  score: number
  passed: boolean
  checks: QACheck[]
  aiFindings: string[]
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
