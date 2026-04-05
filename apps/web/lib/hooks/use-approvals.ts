'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type ApprovalStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

export interface ApprovalRecord {
  id: string
  status: ApprovalStatus
  comment: string | null
  approver: { name: string; email: string }
  createdAt: string
}

export interface AuditLogRecord {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, any> | null
  user: { name: string; email: string }
  createdAt: string
}

export interface ApprovalHistory {
  approvals: ApprovalRecord[]
  auditLogs: AuditLogRecord[]
}

export interface PendingSheet {
  id: string
  title: string
  status: ApprovalStatus
  product: { name: string }
  author: { name: string }
  updatedAt: string
}

export interface PendingPresentation {
  id: string
  title: string
  status: ApprovalStatus
  client: { name: string } | null
  author: { name: string }
  updatedAt: string
}

export interface PendingItems {
  sheets: PendingSheet[]
  presentations: PendingPresentation[]
  total: number
}

export function usePendingApprovals() {
  return useQuery<PendingItems>({
    queryKey: ['approvals', 'pending'],
    queryFn: () => apiFetch('/approvals/pending'),
  })
}

export function useAllApprovals(status?: ApprovalStatus) {
  return useQuery<{ sheets: PendingSheet[]; presentations: PendingPresentation[]; total: number }>({
    queryKey: ['approvals', 'all', status],
    queryFn: () => apiFetch(`/approvals${status ? `?status=${status}` : ''}`),
  })
}

export function useSalesSheetApprovals(id: string) {
  return useQuery<ApprovalHistory>({
    queryKey: ['approvals', 'sales-sheet', id],
    queryFn: () => apiFetch(`/approvals/sales-sheet/${id}`),
    enabled: !!id,
  })
}

export function usePresentationApprovals(id: string) {
  return useQuery<ApprovalHistory>({
    queryKey: ['approvals', 'presentation', id],
    queryFn: () => apiFetch(`/approvals/presentation/${id}`),
    enabled: !!id,
  })
}

function makeTransitionMutation(
  endpoint: (id: string) => string,
  invalidateKeys: (id: string) => string[][],
) {
  return function useTransition() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
        apiFetch(endpoint(id), {
          method: 'POST',
          body: JSON.stringify({ comment: comment ?? null }),
        }),
      onSuccess: (_data, { id }) => {
        invalidateKeys(id).forEach((key) => qc.invalidateQueries({ queryKey: key }))
      },
    })
  }
}

// Sales sheet transitions
export const useSubmitSalesSheet = makeTransitionMutation(
  (id) => `/approvals/sales-sheet/${id}/submit`,
  (id) => [['approvals', 'sales-sheet', id], ['sales-sheets'], ['sales-sheet', id], ['approvals', 'pending']],
)
export const useApproveSalesSheet = makeTransitionMutation(
  (id) => `/approvals/sales-sheet/${id}/approve`,
  (id) => [['approvals', 'sales-sheet', id], ['sales-sheets'], ['sales-sheet', id], ['approvals', 'pending']],
)
export const useRejectSalesSheet = makeTransitionMutation(
  (id) => `/approvals/sales-sheet/${id}/reject`,
  (id) => [['approvals', 'sales-sheet', id], ['sales-sheets'], ['sales-sheet', id], ['approvals', 'pending']],
)
export const useArchiveSalesSheet = makeTransitionMutation(
  (id) => `/approvals/sales-sheet/${id}/archive`,
  (id) => [['approvals', 'sales-sheet', id], ['sales-sheets'], ['sales-sheet', id], ['approvals', 'pending']],
)

// Presentation transitions
export const useSubmitPresentation = makeTransitionMutation(
  (id) => `/approvals/presentation/${id}/submit`,
  (id) => [['approvals', 'presentation', id], ['presentations'], ['presentation', id], ['approvals', 'pending']],
)
export const useApprovePresentation = makeTransitionMutation(
  (id) => `/approvals/presentation/${id}/approve`,
  (id) => [['approvals', 'presentation', id], ['presentations'], ['presentation', id], ['approvals', 'pending']],
)
export const useRejectPresentation = makeTransitionMutation(
  (id) => `/approvals/presentation/${id}/reject`,
  (id) => [['approvals', 'presentation', id], ['presentations'], ['presentation', id], ['approvals', 'pending']],
)
export const useArchivePresentation = makeTransitionMutation(
  (id) => `/approvals/presentation/${id}/archive`,
  (id) => [['approvals', 'presentation', id], ['presentations'], ['presentation', id], ['approvals', 'pending']],
)
