export const FONT_FAMILY = "'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif"

let ctx: CanvasRenderingContext2D | null | undefined

function measure(text: string, fontSize: number, bold: boolean): number {
  if (ctx === undefined) {
    ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
  }
  if (!ctx) return text.length * fontSize * 0.55
  ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${FONT_FAMILY}`
  return ctx.measureText(text).width
}

const cache = new Map<string, string[]>()

/** Quebra o texto em linhas que cabem em `maxWidth`, respeitando quebras manuais. */
export function wrapText(text: string, fontSize: number, maxWidth: number, bold = false): string[] {
  const key = `${fontSize}|${bold ? 1 : 0}|${Math.round(maxWidth)}|${text}`
  const hit = cache.get(key)
  if (hit) return hit
  const lines: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/(\s+)/).filter((w) => w.length)
    let line = ''
    for (const word of words) {
      const candidate = line + word
      if (!line.trim() || measure(candidate.trimEnd(), fontSize, bold) <= maxWidth) {
        line = candidate
      } else {
        lines.push(line.trimEnd())
        line = word.trimStart()
      }
      // Palavra maior que a largura: corta por caractere.
      while (line && !/\s/.test(line.trim()) && measure(line.trimEnd(), fontSize, bold) > maxWidth && line.length > 1) {
        let cut = line.length - 1
        while (cut > 1 && measure(line.slice(0, cut), fontSize, bold) > maxWidth) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    lines.push(line.trimEnd())
  }
  if (cache.size > 2000) cache.clear()
  cache.set(key, lines)
  return lines
}
