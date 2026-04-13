'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface QueueStats {
  [queueName: string]: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }
}

export interface FailedJob {
  id: string
  name: string
  data: any
  failedReason: string
  timestamp: number
  processedOn: number
  finishedOn: number
}

export function useQueueStats() {
  return useQuery<QueueStats>({
    queryKey: ['queue-stats'],
    queryFn: () => apiFetch('/queues/stats'),
    refetchInterval: 5000,
  })
}

export function useFailedJobs(queue: string) {
  return useQuery<FailedJob[]>({
    queryKey: ['queue-failed', queue],
    queryFn: () => apiFetch(`/queues/${queue}/failed`),
    enabled: !!queue,
    refetchInterval: 10000,
  })
}

export function useRetryJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) =>
      apiFetch(`/queues/${queue}/jobs/${jobId}/retry`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-stats'] })
      queryClient.invalidateQueries({ queryKey: ['queue-failed'] })
    },
  })
}
