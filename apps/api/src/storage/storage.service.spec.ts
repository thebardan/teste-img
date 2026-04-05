import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import { StorageService } from './storage.service'

describe('StorageService.validateUpload', () => {
  let service: StorageService

  beforeEach(() => {
    // We only need validateUpload — skip full init
    service = new StorageService({ get: jest.fn() } as any)
  })

  describe('image validation', () => {
    it('passes for valid image types', () => {
      const buf = Buffer.alloc(1024)
      expect(() => service.validateUpload(buf, 'image/jpeg', 'image')).not.toThrow()
      expect(() => service.validateUpload(buf, 'image/png', 'image')).not.toThrow()
      expect(() => service.validateUpload(buf, 'image/webp', 'image')).not.toThrow()
    })

    it('throws BadRequest for disallowed MIME type', () => {
      const buf = Buffer.alloc(1024)
      expect(() =>
        service.validateUpload(buf, 'application/octet-stream', 'image'),
      ).toThrow(BadRequestException)
    })

    it('throws PayloadTooLarge for images over 20MB', () => {
      const buf = Buffer.alloc(21 * 1024 * 1024)
      expect(() => service.validateUpload(buf, 'image/jpeg', 'image')).toThrow(
        PayloadTooLargeException,
      )
    })
  })

  describe('document validation', () => {
    it('passes for valid PDF', () => {
      const buf = Buffer.alloc(1024)
      expect(() => service.validateUpload(buf, 'application/pdf', 'document')).not.toThrow()
    })

    it('passes for valid PPTX', () => {
      const buf = Buffer.alloc(1024)
      expect(() =>
        service.validateUpload(
          buf,
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'document',
        ),
      ).not.toThrow()
    })

    it('throws BadRequest for image type in document category', () => {
      const buf = Buffer.alloc(1024)
      expect(() => service.validateUpload(buf, 'image/png', 'document')).toThrow(
        BadRequestException,
      )
    })

    it('throws PayloadTooLarge for docs over 100MB', () => {
      const buf = Buffer.alloc(101 * 1024 * 1024)
      expect(() =>
        service.validateUpload(buf, 'application/pdf', 'document'),
      ).toThrow(PayloadTooLargeException)
    })
  })

  describe('any category', () => {
    it('skips validation for "any" category', () => {
      const buf = Buffer.alloc(200 * 1024 * 1024)
      expect(() => service.validateUpload(buf, 'application/octet-stream', 'any')).not.toThrow()
    })
  })
})
