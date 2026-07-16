export const MASTERS_CHANGED_EVENT = 'buddget:masters-changed'

export function notifyMastersChanged() {
  window.dispatchEvent(new CustomEvent(MASTERS_CHANGED_EVENT))
}
