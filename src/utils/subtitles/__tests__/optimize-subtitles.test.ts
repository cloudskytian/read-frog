import type { SubtitlesFragment } from '../types'
import { describe, expect, it } from 'vitest'
import { optimizeSubtitles } from '../processor/optimizer'

describe('optimizeSubtitles', () => {
  it('should return empty array when input is empty', () => {
    const result = optimizeSubtitles([], 'en')
    expect(result).toEqual([])
  })

  it('should merge simple consecutive fragments', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'Hello', start: 0, end: 500 },
      { text: 'world.', start: 500, end: 1000 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Hello world.')
    expect(result[0].start).toBe(0)
    expect(result[0].end).toBe(1000)
  })

  it('should split fragments when gap exceeds MAX_GAP_MS', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'First sentence.', start: 0, end: 1000 },
      { text: 'Second sentence.', start: 3500, end: 4500 }, // 2500ms gap
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('First sentence.')
    expect(result[1].text).toBe('Second sentence.')
  })

  it('should split text by sentence boundaries', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'First sentence.', start: 0, end: 1000 },
      { text: 'Second sentence.', start: 1000, end: 2000 },
      { text: 'Third sentence.', start: 2000, end: 3000 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('First sentence.')
    expect(result[1].text).toBe('Second sentence.')
    expect(result[2].text).toBe('Third sentence.')
  })

  it('should handle "5 a.m" abbreviation without splitting', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'I wake up at 5', start: 0, end: 800 },
      { text: 'a.m.', start: 800, end: 1200 },
      { text: 'every day.', start: 1200, end: 2000 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('I wake up at 5 a.m. every day.')
    expect(result[0].start).toBe(0)
    expect(result[0].end).toBe(2000)
  })

  it('should handle "p.m" abbreviation correctly', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'The meeting is at 3', start: 0, end: 700 },
      { text: 'p.m.', start: 700, end: 1100 },
      { text: 'today.', start: 1100, end: 1500 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('The meeting is at 3 p.m. today.')
  })

  it('should handle titles like "Mr." "Mrs." "Ms."', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'Mr.Johnson', start: 0, end: 300 },
      { text: 'and', start: 300, end: 900 },
      { text: 'Mrs.Johnson are here.', start: 900, end: 1500 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Mr.Johnson and Mrs.Johnson are here.')
  })

  it('should handle number and unit combinations like "5 kg" "10 cm"', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'The package weighs 5', start: 0, end: 700 },
      { text: 'kg.', start: 700, end: 1000 },
      { text: 'It measures 10', start: 1000, end: 1500 },
      { text: 'cm.', start: 1500, end: 1800 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('The package weighs 5 kg.')
    expect(result[1].text).toBe('It measures 10 cm.')
  })

  it('should handle fragments with spaces correctly', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'Hello ', start: 0, end: 500 },
      { text: ' world.', start: 500, end: 1000 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Hello  world.')
  })

  it('should handle complex multi-sentence scenarios', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'I wake up at 6', start: 0, end: 600 },
      { text: 'a.m.', start: 600, end: 900 },
      { text: 'Then I have breakfast.', start: 900, end: 1800 },
      { text: 'After that, I go to work.', start: 1800, end: 2800 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('I wake up at 6 a.m.')
    expect(result[1].text).toBe('Then I have breakfast.')
    expect(result[2].text).toBe('After that, I go to work.')
  })

  it('should handle Chinese subtitles (no space between CJK characters)', () => {
    const fragments: SubtitlesFragment[] = [
      { text: '我每天早上5点', start: 0, end: 800 },
      { text: '起床。', start: 800, end: 1200 },
      { text: '然后去跑步。', start: 1200, end: 2000 },
    ]
    const result = optimizeSubtitles(fragments, 'zh')

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('我每天早上5点起床。')
    expect(result[0].start).toBe(0)
    expect(result[0].end).toBe(1200)
    expect(result[1].text).toBe('然后去跑步。')
    expect(result[1].start).toBe(1200)
    expect(result[1].end).toBe(2000)
  })

  it('should handle Japanese subtitles (hiragana and katakana)', () => {
    const fragments: SubtitlesFragment[] = [
      { text: '私は毎朝', start: 0, end: 600 },
      { text: '起きます。', start: 600, end: 1200 },
      { text: 'それから', start: 1200, end: 1600 },
      { text: 'ランニング', start: 1600, end: 2000 },
      { text: 'します。', start: 2000, end: 2500 },
    ]
    const result = optimizeSubtitles(fragments, 'ja')

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('私は毎朝起きます。')
    expect(result[1].text).toBe('それからランニングします。')
  })

  it('should handle Korean subtitles', () => {
    const fragments: SubtitlesFragment[] = [
      { text: '저는 매일', start: 0, end: 600 },
      { text: '아침에', start: 600, end: 1000 },
      { text: '일어납니다.', start: 1000, end: 1500 },
    ]
    const result = optimizeSubtitles(fragments, 'ko')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('저는 매일아침에일어납니다.')
  })

  it('should handle mixed Chinese-English subtitles (space between CJK and English)', () => {
    const fragments: SubtitlesFragment[] = [
      { text: '我喜欢用', start: 0, end: 600 },
      { text: 'Claude', start: 600, end: 1000 },
      { text: '来编程。', start: 1000, end: 1500 },
    ]
    const result = optimizeSubtitles(fragments, 'zh')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('我喜欢用 Claude 来编程。')
  })

  it('should handle time range like "9 a.m. - 5 p.m."', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'Office hours are 9', start: 0, end: 600 },
      { text: 'a.m.', start: 600, end: 900 },
      { text: 'to 5', start: 900, end: 1200 },
      { text: 'p.m.', start: 1200, end: 1500 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Office hours are 9 a.m. to 5 p.m.')
  })

  it('should handle the last fragment correctly', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'This is', start: 0, end: 400 },
      { text: 'the end.', start: 400, end: 1000 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('This is the end.')
    expect(result[0].end).toBe(1000)
  })

  it('should handle "etc." abbreviation', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'We need apples, oranges,', start: 0, end: 800 },
      { text: 'etc.', start: 800, end: 1200 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('We need apples, oranges, etc.')
  })

  it('should handle Chinese mixed with numbers (space between number and Chinese)', () => {
    const fragments: SubtitlesFragment[] = [
      { text: '我有', start: 0, end: 400 },
      { text: '3', start: 400, end: 600 },
      { text: '个苹果。', start: 600, end: 1000 },
    ]
    const result = optimizeSubtitles(fragments, 'zh')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('我有 3 个苹果。')
  })

  it('should handle fragments that already contain spaces', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'Hello ', start: 0, end: 500 },
      { text: 'world', start: 500, end: 1000 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    // No additional space added since first fragment already ends with space
    expect(result[0].text).toBe('Hello world')
  })

  it('should handle Chinese punctuation marks', () => {
    const fragments: SubtitlesFragment[] = [
      { text: '你好!', start: 0, end: 500 },
      { text: '很高兴认识你。', start: 700, end: 1500 },
    ]
    const result = optimizeSubtitles(fragments, 'zh')

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('你好!')
    expect(result[1].text).toBe('很高兴认识你。')
  })

  it('should handle consecutive English abbreviations', () => {
    const fragments: SubtitlesFragment[] = [
      { text: 'I woke up at 5', start: 0, end: 700 },
      { text: 'a.m.,', start: 700, end: 1000 },
      { text: 'had breakfast at 7', start: 1000, end: 1600 },
      { text: 'a.m.,', start: 1600, end: 1900 },
      { text: 'and started work at 9', start: 1900, end: 2500 },
      { text: 'a.m.', start: 2500, end: 2800 },
    ]
    const result = optimizeSubtitles(fragments, 'en')

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('I woke up at 5 a.m., had breakfast at 7 a.m., and started work at 9 a.m.')
  })
})
