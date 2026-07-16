export function validateAdminPassword(password: string): string | null {
  if (password.length < 10) {
    return 'A senha deve ter no mínimo 10 caracteres.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula.'
  }
  if (!/[a-z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra minúscula.'
  }
  if (!/[0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um número.'
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um símbolo (ex.: @, #, !).'
  }
  return null
}
