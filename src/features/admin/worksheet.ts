import { WordStat } from '../../lib/progressAnalytics'

/**
 * דף תרגול להדפסה.
 *
 * השלד נבנה בקוד ולא דורש AI — רשימת המילים היא נתון שכבר קיים,
 * וטבלת תרגום לא מרוויחה כלום ממודל שפה. ה-AI מוסיף רק את משפטי
 * ההשלמה, ואם הוא נופל הדף עדיין נוצר ומודפס.
 */

export type WorksheetSentence = {
  sentence: string   // המשפט עם ___ במקום המילה
  answer: string     // המילה באנגלית
}

export type WorksheetInput = {
  title: string
  words: Pick<WordStat, 'en' | 'he'>[]
  sentences?: WorksheetSentence[]
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** ערבוב דטרמיניסטי לפי אינדקס — כדי ששני הטורים לא יהיו באותו סדר */
function rotate<T>(arr: T[], by: number): T[] {
  if (arr.length === 0) return arr
  const n = by % arr.length
  return [...arr.slice(n), ...arr.slice(0, n)]
}

export function buildWorksheetHtml({ title, words, sentences }: WorksheetInput): string {
  const heToEn = rotate(words, Math.ceil(words.length / 2))

  const rows = (list: Pick<WordStat, 'en' | 'he'>[], showEn: boolean) =>
    list
      .map(
        (w, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="given" ${showEn ? 'dir="ltr"' : ''}>${esc(showEn ? w.en : w.he)}</td>
          <td class="blank"></td>
        </tr>`
      )
      .join('')

  const sentenceBlock =
    sentences && sentences.length > 0
      ? `
      <section>
        <h2>3 · השלימי את המילה החסרה</h2>
        <ol class="sentences">
          ${sentences.map(s => `<li dir="ltr">${esc(s.sentence)}</li>`).join('')}
        </ol>
      </section>`
      : ''

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Rubik", system-ui, sans-serif; color: #2A1B10; margin: 0; }
  header { border-bottom: 2.5px solid #2A1B10; padding-bottom: 10px; margin-bottom: 18px;
           display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
  h1 { font-size: 20px; margin: 0; }
  .name { font-size: 12px; color: #7A6555; }
  h2 { font-size: 14px; margin: 20px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { border: 1.5px solid #2A1B10; padding: 7px 9px; font-size: 13px; }
  td.num { width: 28px; text-align: center; color: #7A6555; }
  td.given { width: 42%; font-weight: 600; }
  td.blank { }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .sentences { padding-inline-start: 20px; }
  .sentences li { font-size: 13px; margin-bottom: 11px; line-height: 1.9; }
  footer { margin-top: 22px; font-size: 10px; color: #7A6555; text-align: center; }
  @media print { .noprint { display: none; } }
  .noprint { margin-bottom: 14px; }
  .noprint button { font: inherit; font-weight: 700; padding: 8px 16px; border: 2.5px solid #2A1B10;
                    border-radius: 10px; background: #FFD166; box-shadow: 3px 4px 0 #2A1B10; cursor: pointer; }
</style>
</head>
<body>
  <div class="noprint"><button onclick="window.print()">הדפסה</button></div>

  <header>
    <h1>${esc(title)}</h1>
    <div class="name">שם: ____________________  תאריך: ____________</div>
  </header>

  <div class="cols">
    <section>
      <h2>1 · תרגמי לעברית</h2>
      <table>${rows(words, true)}</table>
    </section>
    <section>
      <h2>2 · תרגמי לאנגלית</h2>
      <table>${rows(heToEn, false)}</table>
    </section>
  </div>

  ${sentenceBlock}

  <footer>${words.length} מילים · WordQuest</footer>
</body>
</html>`
}

/** פותח את הדף בחלון חדש ומפעיל את תיבת ההדפסה */
export function openWorksheet(input: WorksheetInput): void {
  const html = buildWorksheetHtml(input)
  const win = window.open('', '_blank')
  if (!win) {
    alert('הדפדפן חסם את החלון. אפשרי חלונות קופצים לאתר הזה ונסי שוב.')
    return
  }
  win.document.write(html)
  win.document.close()
}
