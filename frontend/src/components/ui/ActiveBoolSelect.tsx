import { Select } from './Select'

export function ActiveBoolSelect({
  value,
  onChange,
  activeLabel = 'Ativo',
  inactiveLabel = 'Inativo',
}: {
  value: boolean
  onChange: (v: boolean) => void
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <Select
      value={value ? '1' : '0'}
      onChange={(v) => onChange(v === '1')}
      options={[
        { value: '1', label: activeLabel },
        { value: '0', label: inactiveLabel },
      ]}
      placeholder=""
    />
  )
}
