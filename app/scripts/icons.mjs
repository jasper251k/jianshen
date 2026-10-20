// 生成主屏幕图标：深色底 + 四个不同颜色的圆点（对应第 1～4 组）
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [28, 28, 30]
const DOTS = [
  [0.32, 0.32, [255, 59, 48]],
  [0.68, 0.32, [255, 149, 0]],
  [0.32, 0.68, [52, 199, 89]],
  [0.68, 0.68, [0, 122, 255]],
]
const R = 0.15

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size) {
  const S = 4 // 每像素 4×4 采样，边缘平滑
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0]
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const u = (x + (sx + 0.5) / S) / size
          const v = (y + (sy + 0.5) / S) / size
          let col = BG
          for (const [cx, cy, c] of DOTS) if ((u - cx) ** 2 + (v - cy) ** 2 < R * R) col = c
          for (let i = 0; i < 3; i++) acc[i] += col[i]
        }
      const o = y * (size * 3 + 1) + 1 + x * 3
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(acc[i] / (S * S))
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = new URL('../public/', import.meta.url)
writeFileSync(new URL('apple-touch-icon.png', out), png(180))
writeFileSync(new URL('icon-192.png', out), png(192))
writeFileSync(new URL('icon-512.png', out), png(512))
const svgDots = DOTS.map(
  ([cx, cy, c]) => `<circle cx="${cx * 100}" cy="${cy * 100}" r="${R * 100}" fill="rgb(${c.join(',')})"/>`,
).join('')
writeFileSync(
  new URL('icon.svg', out),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="rgb(${BG.join(',')})"/>${svgDots}</svg>\n`,
)
console.log('图标已生成')
