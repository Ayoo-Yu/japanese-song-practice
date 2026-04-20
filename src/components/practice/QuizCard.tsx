import type { QuizQuestion } from '../../services/quiz-service'

interface QuizCardProps {
  question: QuizQuestion
  selectedAnswer: number | null
  showResult: boolean
  onAnswer: (index: number) => void
}

export function QuizCard({ question, selectedAnswer, showResult, onAnswer }: QuizCardProps) {
  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        {question.type === 'furigana' && question.highlightedWord ? (
          <p className="text-xl font-medium text-text leading-relaxed">
            {renderWithHighlight(question.japaneseText, question.highlightedWord)}
          </p>
        ) : (
          <p className="text-xl font-medium text-text leading-relaxed">
            {question.japaneseText}
          </p>
        )}
        <p className="text-sm text-text-muted mt-2">
          {question.type === 'romaji'
            ? '选择正确的罗马音'
            : question.type === 'furigana'
              ? '选择正确的读法'
              : '选择正确的翻译'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {question.choices.map((choice, i) => {
          let cls = 'w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border '

          if (!showResult) {
            cls += 'bg-surface-alt text-text border-border hover:bg-surface-muted active:scale-[0.98]'
          } else if (i === question.correctIndex) {
            cls += 'bg-success text-white border-success'
          } else if (i === selectedAnswer && i !== question.correctIndex) {
            cls += 'bg-danger text-white border-danger'
          } else {
            cls += 'bg-surface-alt text-text-muted border-border opacity-50'
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
    </div>
  )
}

function renderWithHighlight(text: string, word: string) {
  const idx = text.indexOf(word)
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-accent/15 text-accent rounded px-1">{word}</span>
      {text.slice(idx + word.length)}
    </>
  )
}
