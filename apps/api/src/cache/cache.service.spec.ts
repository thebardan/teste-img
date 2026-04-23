import { CacheService } from './cache.service'

describe('CacheService', () => {
  describe('hashInput', () => {
    it('produces stable hash for same input', () => {
      const a = CacheService.hashInput({ foo: 'bar', n: 1 })
      const b = CacheService.hashInput({ foo: 'bar', n: 1 })
      expect(a).toBe(b)
    })

    it('changes hash when input changes', () => {
      const a = CacheService.hashInput({ foo: 'bar' })
      const b = CacheService.hashInput({ foo: 'baz' })
      expect(a).not.toBe(b)
    })

    it('ignores key ordering', () => {
      const a = CacheService.hashInput({ a: 1, b: 2 })
      const b = CacheService.hashInput({ b: 2, a: 1 })
      expect(a).toBe(b)
    })
  })

  describe('with no Redis URL', () => {
    const noConfig = { get: jest.fn().mockReturnValue(undefined) }
    const svc = new CacheService(noConfig as any)

    it('get returns null when disabled', async () => {
      expect(await svc.get('k')).toBeNull()
    })

    it('set is no-op', async () => {
      await svc.set('k', { a: 1 }, 60)
      expect(await svc.get('k')).toBeNull()
    })

    it('wrap runs factory + returns result', async () => {
      const factory = jest.fn().mockResolvedValue({ v: 42 })
      const out = await svc.wrap('k', 60, factory)
      expect(out).toEqual({ v: 42 })
      expect(factory).toHaveBeenCalledTimes(1)
    })
  })
})
