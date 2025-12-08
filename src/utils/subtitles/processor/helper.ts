export interface SubtitleFragment {
  text: string
  start: number
  end: number
  [key: string]: any
}

export interface RawSubtitleFragment {
  text: string
  start: number
  end: number
  [key: string]: any
}

export interface ProcessedSentence {
  text: string
  translation: string
  start: number
  end: number
}

export interface ProcessorConfig {
  targetChars?: number
}

export interface ProcessOptions {
  onProgress?: (progress: number, message?: string) => void
  onUpdate?: (sentences: ProcessedSentence[]) => void
  signal?: AbortSignal
}

export interface FragmentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateFragmentsContinuity(fragments: SubtitleFragment[]): FragmentValidationResult {
  const result: FragmentValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  if (!fragments || fragments.length === 0) {
    result.isValid = false
    result.errors.push('Fragments array is empty')
    return result
  }

  for (let i = 0; i < fragments.length; i++) {
    const fragment = fragments[i]

    if (fragment.start < 0 || fragment.end < 0) {
      result.errors.push(`Fragment ${i} has negative timestamp: start=${fragment.start}, end=${fragment.end}`)
      result.isValid = false
    }

    if (fragment.start > fragment.end) {
      result.errors.push(`Fragment ${i} has invalid time range: start=${fragment.start} >= end=${fragment.end}`)
      result.isValid = false
    }

    if (i < fragments.length - 1) {
      const nextFragment = fragments[i + 1]
      const gap = nextFragment.start - fragment.end

      if (gap < 0) {
        result.warnings.push(
          `Fragment ${i} and ${i + 1} overlap or out of order: `
          + `current end=${fragment.end}, next start=${nextFragment.start}, gap=${gap}ms`,
        )
      }
    }
  }

  return result
}
