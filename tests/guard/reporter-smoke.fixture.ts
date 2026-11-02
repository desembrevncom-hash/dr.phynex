/** Reporter smoke only: twelve I-numbered cases with no database, Docker or env file. */
import { it, expect } from 'vitest'
const mode = process.env.B5_SMOKE_MODE
for (let i = 1; i <= 12; i++)
  it('I' + i + ' smoke case SMOKE_TITLE_SENTINEL', () => {
    if (mode === 'fail' && i === 5) expect('SMOKE_ERROR_SENTINEL').toBe('a passing value')
  })
