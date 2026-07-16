import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/context/toast-context'
import { getErrorMessage } from '@/services/api/errors'
import { isValidEmail } from '@/lib/validators/email'
import { env } from '@/lib/env'

export function LoginPage() {
  const { user, login } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={from} replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      toast.push({ variant: 'error', title: 'E-mail inválido', message: 'Verifique o formato do e-mail corporativo.' })
      return
    }
    setLoading(true)
    try {
      await login({ email, password })
      toast.push({ variant: 'success', title: 'Autenticação concluída', message: 'Carregando seu workspace...' })
      nav(from, { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err)
      toast.push({ variant: 'error', title: 'Falha no login', message: msg })
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="mesh-bg relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[var(--color-brand)]/20 blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-20%] h-[520px] w-[520px] rounded-full bg-[var(--color-accent)]/10 blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="w-full">
          <div className="mb-8 w-full">
            <div className="mb-6 flex w-full justify-center">
              <img
                src="/logo-buddget-b.svg"
                alt={env.appName}
                className="h-20 w-auto max-w-full select-none sm:h-24"
                draggable="false"
              />
            </div>
            <h1 className="text-center text-3xl font-semibold tracking-tight text-[var(--color-text)]">Entrar no Cockpit</h1>
          </div>

          <div className="glass glass-hover rounded-[var(--radius-lg)] p-8 shadow-2xl ring-1 ring-[var(--color-border-strong)]">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  E-mail corporativo
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input id="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="email@email.com" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="password">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    id="password"
                    type="password"
                    className="input pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder=""
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Autenticando...' : 'Acessar painel'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {env.useMockApi ? (
              <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-4 text-[11px] leading-relaxed text-[var(--color-text2)]">
                <span className="font-semibold text-[var(--color-text)]">Dica (mock):</span> qualquer senha com 4+ caracteres funciona. Perfis por e-mail:
                contém <span className="font-mono text-[var(--color-accent)]">admin</span>,{' '}
                <span className="font-mono">operador</span> ou <span className="font-mono">consulta</span>.
              </div>
            ) : null}
          </div>

          <div className="mt-8 text-center text-[11px] text-[var(--color-muted)]">
            Problemas de acesso?{' '}
            <a href="mailto:suporte@empresa.com" className="text-[var(--color-text2)] hover:text-[var(--color-text)]">
              Fale com a equipe AIIO
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
