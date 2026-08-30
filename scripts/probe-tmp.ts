import { readFileSync } from 'node:fs'
import { OffreSourceType } from '../shared/utils/enums.ts'

export function probe(): string {
  return `${process.env.DATABASE_URL ?? ''}${OffreSourceType.la_bonne_alternance}${readFileSync('/dev/null', 'utf8')}`
}
