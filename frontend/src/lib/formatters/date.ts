import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDatePt(isoOrDate: string | Date, pattern = 'dd/MM/yyyy'): string {
  const d = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate
  return format(d, pattern, { locale: ptBR })
}

export function formatMonthYearPt(isoOrDate: string | Date): string {
  return formatDatePt(isoOrDate, 'MMMM yyyy')
}

export function formatDateTimePt(isoOrDate: string | Date): string {
  return formatDatePt(isoOrDate, "dd/MM/yyyy HH:mm")
}
