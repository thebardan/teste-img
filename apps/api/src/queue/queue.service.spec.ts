import { QueueService } from './queue.service'

function makeQueue(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(10),
    getFailedCount: jest.fn().mockResolvedValue(2),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    isPaused: jest.fn().mockResolvedValue(false),
    getFailed: jest.fn().mockResolvedValue([]),
    getJob: jest.fn(),
    ...overrides,
  }
}

describe('QueueService', () => {
  let service: QueueService
  let generationQueue: ReturnType<typeof makeQueue>
  let exportQueue: ReturnType<typeof makeQueue>
  let driveSyncQueue: ReturnType<typeof makeQueue>

  beforeEach(() => {
    generationQueue = makeQueue()
    exportQueue = makeQueue({ getCompletedCount: jest.fn().mockResolvedValue(5) })
    driveSyncQueue = makeQueue()
    service = new QueueService(generationQueue as any, exportQueue as any, driveSyncQueue as any)
  })

  describe('getStats', () => {
    it('returns stats for both queues', async () => {
      const stats = await service.getStats()
      expect(stats).toHaveLength(3)
      expect(stats[0].name).toBe('generation')
      expect(stats[1].name).toBe('export')
      expect(stats[0].completed).toBe(10)
      expect(stats[1].completed).toBe(5)
      expect(stats[0].paused).toBe(false)
    })

    it('reports failed count', async () => {
      generationQueue.getFailedCount.mockResolvedValue(3)
      const stats = await service.getStats()
      expect(stats[0].failed).toBe(3)
    })
  })

  describe('retryFailed', () => {
    it('calls job.retry() for a valid job ID', async () => {
      const retry = jest.fn()
      generationQueue.getJob.mockResolvedValue({ id: 'j1', retry })
      await service.retryFailed('generation', 'j1')
      expect(retry).toHaveBeenCalled()
    })

    it('throws when job is not found', async () => {
      generationQueue.getJob.mockResolvedValue(null)
      await expect(service.retryFailed('generation', 'missing')).rejects.toThrow(
        /not found/i,
      )
    })
  })
})
