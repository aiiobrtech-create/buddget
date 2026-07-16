import { LogOut, Menu, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/context/auth-context'
import { roleLabels } from '@/modules/auth/permissions'
import { SearchInput } from '@/components/ui/SearchInput'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const SEARCH_INDEX = [
  { title: 'Dashboard Executivo', path: '/', keywords: 'home inicio kpi' },
  { title: 'Resumo', path: '/resumo', keywords: 'resumo panorama indicadores kpi' },
  { title: 'Orçamentos', path: '/orcamentos', keywords: 'orcamento budget versao criar novo' },
  { title: 'Planejamento Orçamentário', path: '/planejamento', keywords: 'orcamento budget metas incluir grid' },
  { title: 'Realizado (Actuals)', path: '/realizado', keywords: 'notas despesas contabilidade' },
  { title: 'Comparativo Orçado × Realizado', path: '/comparativo', keywords: 'desvios variacao' },
  { title: 'Relatórios Gerenciais', path: '/relatorios', keywords: 'export pdf planilhas' },
  { title: 'Grupos de Empresas', path: '/cadastros/grupos-de-empresas', keywords: 'grupo holding conglomerado orcamento' },
  { title: 'Empresas (Cadastro)', path: '/cadastros/empresas', keywords: 'filiais cnpjs' },
  { title: 'Centros de Custo', path: '/cadastros/cc', keywords: 'departamentos' },
  { title: 'Categorias (Grupos)', path: '/cadastros/categorias', keywords: 'macro' },
  { title: 'Classes (DRE)', path: '/cadastros/classes', keywords: 'contas dre' },
  { title: 'Naturezas', path: '/cadastros/naturezas', keywords: 'finanças' },
  { title: 'Projetos', path: '/cadastros/projetos', keywords: 'capex wbs' },
  { title: 'Gestão de Usuários', path: '/admin/usuarios', keywords: 'admin perfis acessos' },
  { title: 'Integrações (ERP)', path: '/admin/integracoes', keywords: 'api webhooks' },
]

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)

  const normalizedQ = debouncedQ.toLowerCase().trim()
  const results = normalizedQ.length >= 2
    ? SEARCH_INDEX.filter((x) => x.title.toLowerCase().includes(normalizedQ) || x.keywords.includes(normalizedQ)).slice(0, 6)
    : []

  const handleLogout = () => {
    void logout().then(() => nav('/login', { replace: true }))
  }

  return (
    <header className="app-shell-chrome sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/55 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 md:px-8">
        <button type="button" className="btn-ghost rounded-lg p-2 md:hidden" onClick={onOpenMobileNav} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" aria-hidden />

        <div className="relative hidden w-[min(420px,40vw)] lg:block">
          <SearchInput value={q} onChange={setQ} placeholder="Busca rápida (módulos, CC, categorias)…" />
          <AnimatePresence>
            {q.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg3)]/95 shadow-2xl backdrop-blur-xl"
              >
                <div className="px-3 py-6 text-center text-[13px] text-[var(--color-text2)]">
                  {debouncedQ.length < 2 ? (
                    'Digite no mínimo 2 letras...'
                  ) : results.length === 0 ? (
                    <div className="space-y-1 py-3 text-center">
                      <div className="font-semibold text-[var(--color-text)]">Nenhum módulo encontrado para "{debouncedQ}"</div>
                      <div>Tente usar sinônimos. (Contexto: Busca restrita aos módulos)</div>
                    </div>
                  ) : (
                    <div className="flex flex-col text-left">
                      <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">Módulos da Plataforma</div>
                      {results.map((r) => (
                        <button
                          key={r.path}
                          type="button"
                          onClick={() => {
                            nav(r.path)
                            setQ('')
                          }}
                          className="flex items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-bg)]"
                        >
                          <span className="text-[13px] font-medium text-[var(--color-text)]">{r.title}</span>
                          <span className="text-[11px] font-mono text-[var(--color-text2)] opacity-50">{r.path}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button type="button" className="btn-ghost rounded-xl p-2 lg:hidden" aria-label="Buscar">
          <Search className="h-5 w-5 text-[var(--color-text2)]" />
        </button>

        <div className="hidden h-9 w-px bg-[var(--color-border)] md:block" />

        <div className="flex items-center gap-2">
          <div
            className="hidden max-w-[220px] items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg3)]/35 px-3 py-2 md:flex"
            aria-label="Usuário logado"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-[var(--color-text)]">{user?.name ?? '—'}</div>
              <div className="truncate text-[10px] text-[var(--color-text2)]">{user ? roleLabels[user.role] : ''}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-toolbar-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
            aria-label="Sair da aplicação"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
