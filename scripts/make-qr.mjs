// Regenerates qr.png / qr.svg from SURVEY_URL in config.js. Run after changing the link.
//   node scripts/make-qr.mjs
import { readFile } from 'node:fs/promises'
import QRCode from 'qrcode'

const src = await readFile(new URL('../config.js', import.meta.url), 'utf8')
const url = src.match(/const SURVEY_URL\s*=\s*"([^"]+)"/)[1]
const opts = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#3D1060', light: '#FFFFFF' } }
await QRCode.toFile(new URL('../qr.png', import.meta.url).pathname, url, { ...opts, width: 1024 })
await QRCode.toFile(new URL('../qr.svg', import.meta.url).pathname, url, { ...opts, type: 'svg' })
console.log('QR →', url)
