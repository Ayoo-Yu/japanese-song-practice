import { describe, expect, it } from 'vitest'
import { computeFuriganaFromSources, tokensToDisplayRomaji } from './furigana-service'
import type { JapaneseToken } from './japanese-tokenizer'

function token(surface: string, reading: string, extra: Partial<JapaneseToken> = {}): JapaneseToken {
  return { surface_form: surface, reading, word_type: 'KNOWN', ...extra }
}

describe('furigana source reconciliation', () => {
  it('keeps tokenizer word boundaries when line-level romaji would merge kanji runs', () => {
    const result = computeFuriganaFromSources(
      'きっともうこれ以上傷つくことなど',
      'kitto mou kore ijou kizutsuku koto nado',
      [
        token('きっと', 'キット'), token('もう', 'モウ'), token('これ', 'コレ'),
        token('以上', 'イジョウ'), token('傷つく', 'キズツク'), token('こと', 'コト'), token('など', 'ナド'),
      ],
    )

    expect(result?.filter((item) => item.isKanji).map(({ surface, reading }) => ({ surface, reading }))).toEqual([
      { surface: '以上', reading: 'いじょう' },
      { surface: '傷', reading: 'きず' },
    ])
  })

  it('does not let corrupted legacy romaji overwrite dictionary readings', () => {
    const result = computeFuriganaFromSources(
      'きっともうこれ以上傷つくことなど',
      'kitto mou kore ijouki zutsuku koto nado',
      [
        token('きっと', 'キット'), token('もう', 'モウ'), token('これ', 'コレ'),
        token('以上', 'イジョウ'), token('傷つく', 'キズツク'), token('こと', 'コト'), token('など', 'ナド'),
      ],
    )

    expect(result?.filter((item) => item.isKanji).map(({ surface, reading }) => ({ surface, reading }))).toEqual([
      { surface: '以上', reading: 'いじょう' },
      { surface: '傷', reading: 'きず' },
    ])
  })

  it('uses the known artist-name override and marks it trusted', () => {
    const result = computeFuriganaFromSources(
      '米津玄師',
      'kenshi yonezu',
      [
        token('米津', 'ヨネツ', { pos_detail_1: '固有名詞', pos_detail_2: '人名' }),
        token('玄', 'ゲン', { pos_detail_1: '固有名詞', pos_detail_2: '人名' }),
        token('師', 'シ'),
      ],
    )

    expect(result?.map(({ surface, reading, confidence, source }) => ({ surface, reading, confidence, source }))).toEqual([
      { surface: '米津', reading: 'よねづ', confidence: 'high', source: 'reading_override' },
      { surface: '玄師', reading: 'けんし', confidence: 'high', source: 'reading_override' },
    ])
  })

  it('uses the irregular counter reading for one person', () => {
    const result = computeFuriganaFromSources(
      'もう１人の僕',
      'mou hitori no boku',
      [
        token('もう', 'モウ'), token('１', '*', { word_type: 'UNKNOWN' }),
        token('人', 'ニン'), token('の', 'ノ', { pos: '助詞' }), token('僕', 'ボク'),
      ],
    )

    expect(result?.filter((item) => item.isKanji).map(({ surface, reading, source }) => ({ surface, reading, source }))).toEqual([
      { surface: '１人', reading: 'ひとり', source: 'reading_override' },
      { surface: '僕', reading: 'ぼく', source: 'tokenizer' },
    ])
  })

  it('keeps romaji at tokenizer word boundaries instead of one kana per syllable', () => {
    const result = computeFuriganaFromSources(
      '夢ならばどれほどよかったでしょう',
      'yume naraba dorehodo yokatta deshou',
      [
        token('夢', 'ユメ'), token('なら', 'ナラ', { pos: '助動詞' }),
        token('ば', 'バ', { pos: '助詞', pos_detail_1: '接続助詞' }),
        token('どれほど', 'ドレホド'), token('よかっ', 'ヨカッ'),
        token('た', 'タ', { pos: '助動詞' }), token('でしょ', 'デショ', { pos: '助動詞' }),
        token('う', 'ウ', { pos: '助動詞' }),
      ],
    )

    expect(tokensToDisplayRomaji(result ?? [])).toBe('yume naraba dorehodo yokatta deshou')
  })

  it('uses tokenizer word groups for kana-only lines', () => {
    const result = computeFuriganaFromSources(
      'ありはしないとわかっている',
      'a ri wa shi na i to wa ka te i ru',
      [
        token('あり', 'アリ'), token('は', 'ハ', { pos: '助詞' }), token('し', 'シ'),
        token('ない', 'ナイ', { pos: '助動詞' }), token('と', 'ト', { pos: '助詞' }),
        token('わかっ', 'ワカッ'), token('て', 'テ', { pos: '助詞', pos_detail_1: '接続助詞' }),
        token('いる', 'イル'),
      ],
    )

    expect(tokensToDisplayRomaji(result ?? [])).toBe('ari wa shinai to wakatte iru')
  })
})
