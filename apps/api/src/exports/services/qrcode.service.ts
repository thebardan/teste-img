import { Injectable } from '@nestjs/common'
import QRCode from 'qrcode'

@Injectable()
export class QrCodeService {
  async toBuffer(url: string, size = 200): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
  }

  async toDataUrl(url: string, size = 200): Promise<string> {
    return QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
  }
}
