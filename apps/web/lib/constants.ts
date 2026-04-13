/**
 * Centralized labels and badge mappings for approval statuses.
 * Import these instead of defining local copies per page.
 */

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  IN_REVIEW: 'Em revisão',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  ARCHIVED: 'Arquivado',
}

export const STATUS_BADGE_VARIANT: Record<string, 'default' | 'accent' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'default',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
}
