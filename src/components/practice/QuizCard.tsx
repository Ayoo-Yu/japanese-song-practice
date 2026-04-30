import type { QuizQuestion } from '../../services/quiz-service'

interface QuizCardProps {
  question: QuizQuestion
  selectedAnswer: number | null
  showResult: boolean
  onAnswer: (index: number) => void
  onSpeak?: (text: string) => void
}

export function QuizCard({ question, selectedAnswer, showResult, onAnswer, onSpeak }: QuizCardProps) {
  return (
    <div className="learning-panel space-y-5 px-4 py-5">
      <div className="text-center">
        <p className="mb-3 text-xs font-semibold text-accent">
          {getPromptLabel(question.type)}
        </p>
        {question.type === 'furigana' && question.highlightedWord ? (
          <p className="text-2xl font-bold leading-relaxed text-text">
            {renderWithHighlight(question.japaneseText, question.highlightedWord)}
          </p>
        ) : (
          <p className="text-2xl font-bold leading-relaxed text-text">
            {question.japaneseText}
          </p>
        )}
        <div className="mt-3 flex items-center justify-center gap-3">
          <p className="text-sm text-text-secondary">{getPromptHint(question.type)}</p>
          {question.type === 'pronunciation' && onSpeak && (
            <button
              onClick={() => onSpeak(question.japaneseText)}
              className="rounded-full border border-accent/25 bg-accent-bg px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/15"
            >
              听一遍
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {question.choices.map((choice, i) => {
          let cls = 'w-full break-words text-left px-4 py-3 rounded-lg text-sm font-semibold leading-6 transition-all duration-200 border '

          if (!showResult) {
            cls += 'bg-surface-alt text-text border-border hover:border-accent active:scale-[0.98]'
          } else if (i === question.correctIndex) {
            cls += 'bg-success text-white border-success'
          } else if (i === selectedAnswer && i !== question.correctIndex) {
            cls += 'bg-danger text-white border-danger'
          } else {
            cls += 'bg-surface-alt text-text-muted border-border opacity-55'
          }

          return (
            <button
              key={i}
              onClick={() => !showResult && onAnswer(i)}
              disabled={showResult}
              className={cls}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {showResult && selectedAnswer !== null && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            selectedAnswer === question.correctIndex
              ? 'bg-success/10 text-success'
              : 'bg-warning/12 text-text'
          }`}
        >
          {selectedAnswer === question.correctIndex
            ? '顺口，下一句继续。'
            : '这句先慢一点，听熟以后再选会更稳。'}
        </div>
      )}
    </div>
  )
}

function renderWithHighlight(text: string, word: string) {
  const idx = text.indexOf(word)
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="rounded bg-highlight px-1 text-accent">{word}</span>
      {text.slice(idx + word.length)}
    </>
  )
}

function getPromptLabel(type: QuizQuestion['type']): string {
  if (type === 'romaji') return '看歌词，选罗马音'
  if (type === 'furigana') return '看汉字，选读法'
  if (type === 'pronunciation') return '听读音，选罗马音'
  return '看歌词，选意思'
}

function getPromptHint(type: QuizQuestion['type']): string {
  if (type === 'romaji') return '先在心里唱一遍，再点最顺口的答案'
  if (type === 'furigana') return '注意高亮词的读法'
  if (type === 'pronunciation') return '可以先听，再跟读'
  return '不用死背，先抓住这一句的大意'
}
