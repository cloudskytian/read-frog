import type { YoutubeSubtitle } from './types'
import { logger } from '@/utils/logger'

export class VTTStreamParser {
  private buffer = ''
  private currentTimeCode: string | null = null
  private currentLines: string[] = []
  private allSubtitles: YoutubeSubtitle[] = []
  private onSubtitle: (subtitle: YoutubeSubtitle) => void

  constructor(options: { onSubtitle: (subtitle: YoutubeSubtitle) => void }) {
    this.onSubtitle = options.onSubtitle
  }

  feedChunk(chunk: string) {
    this.buffer += chunk
    this.processBuffer()
  }

  private processBuffer() {
    const lines = this.buffer.split('\n')

    this.buffer = lines.pop() || ''

    for (const line of lines) {
      this.processLine(line.trim())
    }
  }

  private processLine(line: string) {
    if (!line) {
      this.emitCurrentBlock()
      return
    }

    if (line === 'WEBVTT' || line.startsWith('```')) {
      return
    }

    if (line.includes('-->')) {
      if (this.currentTimeCode) {
        this.emitCurrentBlock()
      }

      this.currentTimeCode = line
    }
    else {
      this.currentLines.push(line)
    }
  }

  private emitCurrentBlock() {
    if (!this.currentTimeCode || this.currentLines.length === 0) {
      return
    }

    try {
      const subtitle = this.parseBlock(this.currentTimeCode, this.currentLines)
      this.allSubtitles.push(subtitle)
      this.onSubtitle(subtitle)
    }
    catch (error) {
      logger.error('[VTTStreamParser] Failed to parse block:', error, {
        timecode: this.currentTimeCode,
        lines: this.currentLines,
      })
    }

    this.currentTimeCode = null
    this.currentLines = []
  }

  private parseBlock(timecode: string, lines: string[]): YoutubeSubtitle {
    const [startStr, endStr] = timecode.split('-->').map(s => s.trim())

    const text = lines[0] || ''
    const translation = lines[1] || undefined

    return {
      text,
      start: this.parseTime(startStr),
      end: this.parseTime(endStr),
      translation,
    }
  }

  private parseTime(timeStr: string): number {
    if (/^\d+$/.test(timeStr)) {
      return Number.parseInt(timeStr) / 1000
    }

    const match = timeStr.match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/)
    if (match) {
      const [, hours = '0', minutes, seconds] = match
      return Number.parseInt(hours) * 3600 + Number.parseInt(minutes) * 60 + Number.parseFloat(seconds)
    }

    return Number.parseFloat(timeStr)
  }

  flush() {
    if (this.buffer.trim()) {
      this.processLine(this.buffer.trim())
    }

    this.emitCurrentBlock()
  }

  getAllSubtitles(): YoutubeSubtitle[] {
    return this.allSubtitles
  }
}
