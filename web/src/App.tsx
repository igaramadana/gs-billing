import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileClock,
  History,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  Store,
  Tag,
  UserRound,
  WalletCards,
  X
} from 'lucide-react'

import type { Bill, BootstrapData, BillStatus, NuiResponse } from './types'
import { formatDate, formatMoney, isBrowserDev, nuiFetch } from './api'
import { mockBootstrap } from './dev/mockData'

type TabValue = 'create' | 'pending' | 'history' | 'issued' | 'webview'

type ToastState = {
  type: 'success' | 'error' | 'info'
  message: string
}

const emptyBootstrap: BootstrapData | null = null

const octaStyle = (cut = 12, bg = 'rgba(26,31,39,0.86)', border = 'rgba(255,255,255,0.09)') =>
  ({
    '--octa-cut': `${cut}px`,
    '--octa-bg': bg,
    '--octa-border': border
  }) as CSSProperties

const statusMap: Record<BillStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'border-yellow-300/25 bg-yellow-300/[0.08] text-yellow-200'
  },
  paid: {
    label: 'Paid',
    className: 'border-accent/25 bg-accent/[0.10] text-accent'
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-error/25 bg-error/[0.10] text-error'
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function safeAmountInput(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, 10)
}

function safeTextInput(value: string, max = 80) {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max)
}

function App() {
  const [visible, setVisible] = useState(isBrowserDev)
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(
    isBrowserDev ? mockBootstrap : emptyBootstrap
  )

  const [tab, setTab] = useState<TabValue>(isBrowserDev ? 'webview' : 'pending')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [nuiLogs, setNuiLogs] = useState<string[]>([])
  const [detailBill, setDetailBill] = useState<Bill | null>(null)
  const [detailAction, setDetailAction] = useState<'pay' | 'cancel' | 'none'>('none')

  const [label, setLabel] = useState('Billing')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDays, setDueDays] = useState('1')

  const pendingBills = bootstrap?.pendingBills ?? []
  const historyBills = bootstrap?.historyBills ?? []
  const issuedBills = bootstrap?.issuedBills ?? []
  const canCreateWithTarget = Boolean(bootstrap?.player?.canCreate && bootstrap?.target?.source)

  const tabs = useMemo(() => {
    const items: Array<{ value: TabValue; label: string; count?: number }> = [
      { value: 'pending', label: 'Tagihan', count: pendingBills.length },
      { value: 'history', label: 'History', count: historyBills.length }
    ]

    if (bootstrap?.player?.canCreate) {
      items.unshift({ value: 'create', label: 'Buat Billing' })
      items.push({ value: 'issued', label: 'Dibuat', count: issuedBills.length })
    }

    if (isBrowserDev) items.push({ value: 'webview', label: 'Webview' })
    return items
  }, [bootstrap?.player?.canCreate, historyBills.length, issuedBills.length, pendingBills.length])

  function showToast(type: ToastState['type'], message: string) {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 3200)
  }

  function openBillDetail(bill: Bill, action: 'pay' | 'cancel' | 'none') {
    setDetailBill(bill)
    setDetailAction(action)
  }

  async function closeUi() {
    if (isBrowserDev) {
      showToast('info', 'Close disabled di browser preview.')
      return
    }

    setVisible(false)
    await nuiFetch('close')
  }

  async function refreshData() {
    setLoading(true)

    try {
      if (isBrowserDev) {
        setBootstrap(mockBootstrap)
        setNuiLogs((current) => [`[${new Date().toLocaleTimeString()}] DEV refresh mock data`, ...current].slice(0, 80))
        showToast('success', 'Mock data berhasil di-reset.')
        return
      }

      const response = await nuiFetch<BootstrapData>('refresh')
      if (response.ok) setBootstrap(response)
    } finally {
      setLoading(false)
    }
  }

  async function createBill() {
    if (!bootstrap?.target?.source) {
      showToast('error', 'Target player tidak ditemukan.')
      return
    }

    const numericAmount = Number(amount)
    const numericDueDays = Number(dueDays || bootstrap.config.defaultDueDays)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('error', 'Nominal tidak valid.')
      return
    }

    if (numericAmount < bootstrap.config.minAmount || numericAmount > bootstrap.config.maxAmount) {
      showToast('error', `Nominal harus ${formatMoney(bootstrap.config.minAmount)} - ${formatMoney(bootstrap.config.maxAmount)}.`)
      return
    }

    if (!Number.isFinite(numericDueDays) || numericDueDays < 1) {
      showToast('error', 'Jatuh tempo tidak valid.')
      return
    }

    setLoading(true)

    try {
      if (isBrowserDev) {
        showToast('success', 'DEV MOCK: Billing berhasil dibuat.')
        setNuiLogs((current) => [
          `[${new Date().toLocaleTimeString()}] DEV createBill target=${bootstrap.target?.source} amount=${numericAmount}`,
          ...current
        ].slice(0, 80))
        setAmount('')
        setDescription('')
        setLabel('Billing')
        setDueDays(String(bootstrap.config.defaultDueDays))
        setTab('issued')
        return
      }

      const response = await nuiFetch<NuiResponse>('createBill', {
        targetServerId: bootstrap.target.source,
        label,
        amount: numericAmount,
        description,
        dueDays: numericDueDays
      })

      if (!response.ok) {
        showToast('error', response.message ?? 'Gagal membuat billing.')
        return
      }

      setAmount('')
      setDescription('')
      setLabel('Billing')
      setDueDays(String(bootstrap.config.defaultDueDays))
      showToast('success', response.message ?? 'Billing berhasil dibuat.')
      await refreshData()
      setTab('issued')
    } finally {
      setLoading(false)
    }
  }

  async function payBill(billId: number) {
    setLoading(true)

    try {
      if (isBrowserDev) {
        showToast('success', `DEV MOCK: Bill #${billId} berhasil dibayar.`)
        setNuiLogs((current) => [`[${new Date().toLocaleTimeString()}] DEV payBill billId=${billId}`, ...current].slice(0, 80))
        return
      }

      const response = await nuiFetch<NuiResponse>('payBill', { billId })
      if (!response.ok) {
        showToast('error', response.message ?? 'Gagal membayar billing.')
        return
      }

      showToast('success', response.message ?? 'Billing berhasil dibayar.')
      await refreshData()
    } finally {
      setLoading(false)
    }
  }

  async function cancelBill(billId: number) {
    setLoading(true)

    try {
      if (isBrowserDev) {
        showToast('success', `DEV MOCK: Bill #${billId} berhasil dicancel.`)
        setNuiLogs((current) => [`[${new Date().toLocaleTimeString()}] DEV cancelBill billId=${billId}`, ...current].slice(0, 80))
        return
      }

      const response = await nuiFetch<NuiResponse>('cancelBill', { billId })
      if (!response.ok) {
        showToast('error', response.message ?? 'Gagal cancel billing.')
        return
      }

      showToast('success', response.message ?? 'Billing berhasil dicancel.')
      await refreshData()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const payload = event.data
      if (!payload || typeof payload !== 'object') return

      const action = String(payload.action ?? 'unknown')
      setNuiLogs((current) => [`[${new Date().toLocaleTimeString()}] action=${action}`, ...current].slice(0, 80))

      if (payload.action === 'open') setVisible(true)
      if (payload.action === 'close' || payload.action === 'closeAll') setVisible(false)

      if (payload.action === 'bootstrap') {
        setBootstrap(payload.data)

        if (payload.data?.target?.source && payload.data?.player?.canCreate) {
          setTab('create')
        } else {
          setTab('pending')
        }

        if (payload.data?.config?.defaultDueDays) {
          setDueDays(String(payload.data.config.defaultDueDays))
        }
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && visible) closeUi()
    }

    window.addEventListener('message', onMessage)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [visible])

  if (!visible || !bootstrap) return null

  const totalAmountDue = pendingBills.reduce((total, bill) => total + (Number(bill.amountDue) || 0), 0)

  return (
    <main className="fixed inset-0 grid place-items-center overflow-hidden bg-transparent p-4 font-body text-fg sm:p-6">
      <section
        className="octagon-frame relative isolate h-[min(760px,calc(100vh-32px))] w-[min(1180px,calc(100vw-32px))] overflow-hidden"
        style={octaStyle(18, 'rgba(17,21,27,0.96)', 'rgba(255,255,255,0.11)')}
      >
        <div className="relative z-[1] flex h-full min-h-0 flex-col p-3 sm:p-4">
          <Header bootstrap={bootstrap} isLoading={loading} onClose={closeUi} onRefresh={refreshData} />

          <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 overflow-hidden lg:block">
              <Sidebar
                bootstrap={bootstrap}
                pendingCount={pendingBills.length}
                historyCount={historyBills.length}
                totalAmountDue={totalAmountDue}
              />
            </aside>

            <section className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
              <MobileSummary
                bootstrap={bootstrap}
                pendingCount={pendingBills.length}
                historyCount={historyBills.length}
                totalAmountDue={totalAmountDue}
              />

              <TabBar value={tab} items={tabs} onChange={(value) => setTab(value as TabValue)} />

              <div
                className="octagon-frame relative isolate min-h-0 flex-1 overflow-hidden"
                style={octaStyle(16, 'rgba(26,31,39,0.82)', 'rgba(255,255,255,0.085)')}
              >
                <div className="scrollbar-thin relative z-[1] h-full min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
                  {tab === 'create' && (
                    <CreateBillPanel
                      canCreateWithTarget={canCreateWithTarget}
                      bootstrap={bootstrap}
                      label={label}
                      amount={amount}
                      description={description}
                      dueDays={dueDays}
                      loading={loading}
                      setLabel={(value) => setLabel(safeTextInput(value, 80))}
                      setAmount={(value) => setAmount(safeAmountInput(value))}
                      setDescription={(value) => setDescription(safeTextInput(value, 160))}
                      setDueDays={(value) => setDueDays(safeAmountInput(value).slice(0, 2))}
                      createBill={createBill}
                    />
                  )}

                  {tab === 'pending' && (
                    <BillsList
                      title="Tagihan Masuk"
                      description="Daftar billing yang masih perlu dibayar."
                      bills={pendingBills}
                      emptyTitle="Tidak ada tagihan pending"
                      emptyDescription="Semua tagihan kamu sudah bersih."
                      action="pay"
                      loading={loading}
                      onPay={payBill}
                      onDetail={(bill) => openBillDetail(bill, 'pay')}
                    />
                  )}

                  {tab === 'history' && (
                    <BillsList
                      title="History Billing"
                      description="Riwayat billing yang pernah kamu terima atau selesaikan."
                      bills={historyBills}
                      emptyTitle="History kosong"
                      emptyDescription="Belum ada history billing."
                      loading={loading}
                      action="none"
                      onDetail={(bill) => openBillDetail(bill, 'none')}
                    />
                  )}

                  {tab === 'issued' && (
                    <BillsList
                      title="Billing Dibuat"
                      description="Billing yang kamu buat ke warga lain."
                      bills={issuedBills}
                      emptyTitle="Belum membuat billing"
                      emptyDescription="Billing yang kamu buat akan muncul di sini."
                      loading={loading}
                      action="cancel"
                      onCancel={cancelBill}
                      onDetail={(bill) => openBillDetail(bill, 'cancel')}
                    />
                  )}

                  {tab === 'webview' && (
                    <WebviewPanel bootstrap={bootstrap} nuiLogs={nuiLogs} onReset={refreshData} />
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        {detailBill && (
          <BillDetailModal
            bill={detailBill}
            action={detailAction}
            loading={loading}
            onClose={() => setDetailBill(null)}
            onPay={(billId) => {
              setDetailBill(null)
              void payBill(billId)
            }}
            onCancel={(billId) => {
              setDetailBill(null)
              void cancelBill(billId)
            }}
          />
        )}

        {toast && <Toast toast={toast} />}
      </section>
    </main>
  )
}

function Header({
  bootstrap,
  isLoading,
  onClose,
  onRefresh
}: {
  bootstrap: BootstrapData
  isLoading: boolean
  onClose: () => void
  onRefresh: () => void
}) {
  return (
    <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
      <div className="flex min-w-0 items-center gap-3">
        <Octagon className="grid size-[48px] shrink-0 place-items-center sm:size-[54px]" cut={11} bg="rgba(139,229,43,0.07)" border="rgba(139,229,43,0.24)">
          <ReceiptText className="size-6 text-accent" strokeWidth={1.8} />
        </Octagon>

        <div className="min-w-0">
          <span className="font-heading text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-accent">
            Gatrons Billing
          </span>
          <h1 className="mt-1 truncate font-heading text-[clamp(1.35rem,2vw,2.2rem)] font-bold uppercase leading-none tracking-[-0.045em] text-fg">
            Invoice Management
          </h1>
          <p className="mt-1.5 hidden truncate text-[12px] font-medium text-muted sm:block">
            {bootstrap.player.jobLabel} • {bootstrap.player.onduty ? 'On Duty' : 'Off Duty'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StatusChip label={isBrowserDev ? 'Webview' : 'Live NUI'} tone="accent" />
        <IconButton label="Refresh data" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </IconButton>
        <IconButton label="Close billing" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
      </div>
    </header>
  )
}

function Sidebar({
  bootstrap,
  pendingCount,
  historyCount,
  totalAmountDue
}: {
  bootstrap: BootstrapData
  pendingCount: number
  historyCount: number
  totalAmountDue: number
}) {
  return (
    <div
      className="octagon-frame relative isolate h-full min-h-0 overflow-hidden"
      style={octaStyle(16, 'rgba(26,31,39,0.72)', 'rgba(255,255,255,0.085)')}
    >
      <div className="relative z-[1] flex h-full min-h-0 flex-col p-4">
        <div className="border-b border-white/[0.06] pb-4">
          <div className="flex items-start gap-3">
            <Octagon className="grid size-12 shrink-0 place-items-center" cut={10} bg="rgba(255,255,255,0.04)" border="rgba(255,255,255,0.08)">
              <UserRound className="size-5 text-accent" />
            </Octagon>
            <div className="min-w-0">
              <p className="truncate font-heading text-[18px] font-bold uppercase leading-tight tracking-[-0.02em] text-fg">
                {bootstrap.player.name}
              </p>
              <p className="mt-1 truncate text-[12px] font-medium text-muted">
                {bootstrap.player.citizenid}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniMetric label="Pending" value={String(pendingCount)} />
            <MiniMetric label="History" value={String(historyCount)} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <InfoItem icon={<FileClock className="size-4" />} label="Pending Bills" value={String(pendingCount)} />
          <InfoItem icon={<WalletCards className="size-4" />} label="Total Due" value={formatMoney(totalAmountDue)} />
          <InfoItem icon={<CalendarClock className="size-4" />} label="Late Fee" value={`${bootstrap.config.lateFeePercent}% / hari`} />
          <InfoItem icon={<ShieldCheck className="size-4" />} label="Society" value={bootstrap.player.society ?? '-'} />
        </div>

        {bootstrap.target && (
          <div className="mt-auto pt-4">
            <Octagon className="w-full" cut={13} bg="rgba(139,229,43,0.07)" border="rgba(139,229,43,0.24)">
              <div className="p-4">
                <span className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                  Target Player
                </span>
                <p className="mt-2 truncate font-heading text-[18px] font-bold uppercase leading-none text-fg">
                  {bootstrap.target.name}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted">Server ID: {bootstrap.target.source}</p>
              </div>
            </Octagon>
          </div>
        )}
      </div>
    </div>
  )
}

function MobileSummary({
  bootstrap,
  pendingCount,
  historyCount,
  totalAmountDue
}: {
  bootstrap: BootstrapData
  pendingCount: number
  historyCount: number
  totalAmountDue: number
}) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:hidden sm:grid-cols-4">
      <MiniMetric label="Pending" value={String(pendingCount)} />
      <MiniMetric label="History" value={String(historyCount)} />
      <MiniMetric label="Total Due" value={formatMoney(totalAmountDue)} />
      <MiniMetric label="Job" value={bootstrap.player.jobLabel} />
    </div>
  )
}

function TabBar({
  value,
  items,
  onChange
}: {
  value: TabValue
  items: Array<{ value: TabValue; label: string; count?: number }>
  onChange: (value: TabValue) => void
}) {
  return (
    <div
      className="octagon-frame relative isolate overflow-hidden"
      style={octaStyle(13, 'rgba(26,31,39,0.74)', 'rgba(255,255,255,0.08)')}
    >
      <div className="scrollbar-thin relative z-[1] flex min-w-0 items-center gap-1.5 overflow-x-auto overflow-y-hidden p-2">
        {items.map((item) => (
          <button
            key={item.value}
            className={cn(
              'octagon-frame relative isolate shrink-0 px-3.5 py-2.5 font-heading text-[11px] font-bold uppercase leading-none tracking-[0.1em] transition duration-150',
              value === item.value ? 'text-accent' : 'text-muted hover:text-fg'
            )}
            style={octaStyle(
              8,
              value === item.value ? 'rgba(139,229,43,0.13)' : 'rgba(255,255,255,0.035)',
              value === item.value ? 'rgba(139,229,43,0.36)' : 'rgba(255,255,255,0.065)'
            )}
            type="button"
            onClick={() => onChange(item.value)}
          >
            <span className="relative z-[1] flex items-center gap-2">
              <span className="grid h-3 w-3 shrink-0 place-items-center overflow-visible">
                <span className="block h-1.5 w-1.5 rotate-45 bg-accent/80" />
              </span>
              {item.label}
              {typeof item.count === 'number' && (
                <span className="grid min-w-5 place-items-center rounded-full border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-fg">
                  {item.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CreateBillPanel({
  canCreateWithTarget,
  bootstrap,
  label,
  amount,
  description,
  dueDays,
  loading,
  setLabel,
  setAmount,
  setDescription,
  setDueDays,
  createBill
}: {
  canCreateWithTarget: boolean
  bootstrap: BootstrapData
  label: string
  amount: string
  description: string
  dueDays: string
  loading: boolean
  setLabel: (value: string) => void
  setAmount: (value: string) => void
  setDescription: (value: string) => void
  setDueDays: (value: string) => void
  createBill: () => void
}) {
  if (!canCreateWithTarget) {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-8" />}
        title="Tidak ada target / akses tidak valid"
        description="Gunakan ox_target ke player lain untuk membuat billing. Pastikan job kamu whitelist dan sedang on-duty."
      />
    )
  }

  const numericAmount = Number(amount) || 0
  const totalPreview = formatMoney(numericAmount)

  return (
    <div className="grid min-h-full grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-3">
        <SectionTitle title="Buat Billing Baru" description="Kirim invoice resmi ke target player terdekat." />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Target">
            <Input value={bootstrap.target?.name ?? '-'} disabled />
          </Field>
          <Field label="Society">
            <Input value={bootstrap.player.society ?? '-'} disabled />
          </Field>
          <Field label="Judul Billing">
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Contoh: Tilang Kendaraan" maxLength={80} />
          </Field>
          <Field label="Nominal">
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Contoh: 50000" inputMode="numeric" />
          </Field>
          <Field label="Jatuh Tempo Hari">
            <Input value={dueDays} onChange={(event) => setDueDays(event.target.value)} placeholder="1" inputMode="numeric" />
          </Field>
          <Field label="Denda Telat">
            <Input value={`${bootstrap.config.lateFeePercent}% per hari`} disabled />
          </Field>
        </div>

        <Field label="Deskripsi">
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Masukkan keterangan billing..." maxLength={160} />
        </Field>
      </div>

      <Octagon className="h-full min-h-[280px]" cut={15} bg="rgba(255,255,255,0.035)" border="rgba(255,255,255,0.075)">
        <div className="flex h-full flex-col p-4">
          <span className="font-heading text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Preview Billing</span>
          <h3 className="mt-2 truncate font-heading text-[1.65rem] font-bold uppercase leading-none tracking-[-0.04em] text-fg">
            {label || 'Billing'}
          </h3>
          <p className="mt-2 text-[12px] font-medium leading-relaxed text-muted">
            {description || 'Deskripsi billing akan tampil di sini.'}
          </p>

          <div className="mt-4 space-y-2">
            <InfoItem icon={<Tag className="size-4" />} label="Amount" value={totalPreview} />
            <InfoItem icon={<Clock3 className="size-4" />} label="Due" value={`${dueDays || bootstrap.config.defaultDueDays} hari`} />
          </div>

          <button
            className="octagon-frame relative isolate mt-auto flex h-[48px] w-full items-center justify-center font-heading text-[12px] font-bold uppercase tracking-[0.1em] text-accent transition duration-150 hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            style={octaStyle(12, 'rgba(139,229,43,0.18)', 'rgba(139,229,43,0.45)')}
            disabled={loading}
            onClick={createBill}
          >
            <span className="relative z-[1] flex h-full w-full items-center justify-center gap-2">
              {loading ? <Loader2 className="size-[18px] animate-spin" /> : <Send className="size-[18px]" />}
              Kirim Billing
              <ChevronRight className="size-[18px]" />
            </span>
          </button>
        </div>
      </Octagon>
    </div>
  )
}

function BillsList({
  title,
  description,
  bills,
  emptyTitle,
  emptyDescription,
  action,
  loading,
  onPay,
  onCancel,
  onDetail
}: {
  title: string
  description: string
  bills: Bill[]
  emptyTitle: string
  emptyDescription: string
  action: 'pay' | 'cancel' | 'none'
  loading: boolean
  onPay?: (billId: number) => void
  onCancel?: (billId: number) => void
  onDetail?: (bill: Bill) => void
}) {
  if (bills.length === 0) {
    return <EmptyState icon={<ReceiptText className="size-8" />} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-3">
      <SectionTitle title={title} description={description} />
      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
        {bills.map((bill) => (
          <BillCard key={bill.id} bill={bill} action={action} loading={loading} onPay={onPay} onCancel={onCancel} onDetail={onDetail} />
        ))}
      </div>
    </div>
  )
}

function BillCard({
  bill,
  action,
  loading,
  onPay,
  onCancel,
  onDetail
}: {
  bill: Bill
  action: 'pay' | 'cancel' | 'none'
  loading: boolean
  onPay?: (billId: number) => void
  onCancel?: (billId: number) => void
  onDetail?: (bill: Bill) => void
}) {
  const status = statusMap[bill.status] ?? statusMap.pending
  const canAct = bill.status === 'pending' && (action === 'pay' || action === 'cancel')

  return (
    <Octagon className="min-h-[255px]" cut={15} bg="rgba(255,255,255,0.035)" border="rgba(255,255,255,0.08)">
      <div className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.055] pb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-heading text-[1.45rem] font-bold uppercase leading-none tracking-[-0.04em] text-fg">
                #{bill.id} {bill.label}
              </h3>
              <StatusBadge className={status.className}>{status.label}</StatusBadge>
            </div>
            <p className="mt-2 line-clamp-2 text-[12px] font-medium leading-relaxed text-muted">
              {bill.description || 'Tidak ada deskripsi.'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Total</span>
            <p className="mt-1 font-heading text-[1.45rem] font-bold leading-none tracking-[-0.04em] text-accent">
              {formatMoney(bill.amountDue)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <BillMeta icon={<UserRound className="size-3.5" />} label="Dari" value={bill.issuerName} />
          <BillMeta icon={<CircleDollarSign className="size-3.5" />} label="Awal" value={formatMoney(bill.amount)} />
          <BillMeta icon={<CalendarClock className="size-3.5" />} label="Due" value={formatDate(bill.dueAt)} />
          <BillMeta icon={<Clock3 className="size-3.5" />} label="Dibuat" value={formatDate(bill.createdAt)} />
        </div>

        {bill.penaltyAmount > 0 && (
          <p className="mt-3 border-t border-white/[0.055] pt-3 text-[11px] font-semibold text-error">
            +{formatMoney(bill.penaltyAmount)} denda • {bill.daysLate} hari telat
          </p>
        )}

        <div className="mt-auto flex flex-wrap justify-end gap-2 pt-4">
          <DetailButton onClick={() => onDetail?.(bill)} />

          {canAct && action === 'pay' && (
            <ActionButton disabled={loading} onClick={() => onPay?.(bill.id)} icon={loading ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}>
              Bayar Sekarang
            </ActionButton>
          )}

          {canAct && action === 'cancel' && (
            <ActionButton danger disabled={loading} onClick={() => onCancel?.(bill.id)}>
              Cancel Billing
            </ActionButton>
          )}
        </div>
      </div>
    </Octagon>
  )
}

function DetailButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="octagon-frame relative isolate flex h-10 items-center justify-center px-4 font-heading text-[11px] font-bold uppercase tracking-[0.1em] text-fg transition duration-150 hover:text-accent hover:brightness-125"
      onClick={onClick}
      style={octaStyle(10, 'rgba(255,255,255,0.045)', 'rgba(255,255,255,0.10)')}
      type="button"
    >
      <span className="relative z-[1] flex items-center justify-center gap-2">
        <ReceiptText className="size-4" />
        Detail
      </span>
    </button>
  )
}

function BillDetailModal({
  bill,
  action,
  loading,
  onClose,
  onPay,
  onCancel
}: {
  bill: Bill
  action: 'pay' | 'cancel' | 'none'
  loading: boolean
  onClose: () => void
  onPay?: (billId: number) => void
  onCancel?: (billId: number) => void
}) {
  const status = statusMap[bill.status] ?? statusMap.pending
  const canAct = bill.status === 'pending' && (action === 'pay' || action === 'cancel')

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/55 p-3 sm:p-5">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close detail modal" onClick={onClose} />

      <section
        className="octagon-frame relative isolate w-[min(760px,calc(100vw-32px))] max-h-[min(690px,calc(100vh-48px))] overflow-hidden"
        style={octaStyle(18, 'rgba(17,21,27,0.98)', 'rgba(139,229,43,0.22)')}
      >
        <div className="relative z-[1] flex max-h-[min(690px,calc(100vh-48px))] min-h-0 flex-col p-4 sm:p-5">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div className="min-w-0">
              <span className="font-heading text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-accent">
                Billing Detail
              </span>
              <h2 className="mt-2 truncate font-heading text-[clamp(1.55rem,3vw,2.35rem)] font-bold uppercase leading-none tracking-[-0.045em] text-fg">
                #{bill.id} {bill.label}
              </h2>
              <p className="mt-2 text-[12px] font-medium text-muted">
                {bill.issuerJobLabel} • Society {bill.society || '-'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge className={status.className}>{status.label}</StatusBadge>
              <IconButton label="Close detail" onClick={onClose}>
                <X className="size-5" />
              </IconButton>
            </div>
          </header>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 pr-1">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <DetailMetric label="Total Tagihan" value={formatMoney(bill.amountDue)} tone="accent" />
              <DetailMetric label="Nominal Awal" value={formatMoney(bill.amount)} />
              <DetailMetric label="Denda" value={formatMoney(bill.penaltyAmount || 0)} tone={bill.penaltyAmount > 0 ? 'error' : 'default'} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <BillMeta icon={<UserRound className="size-3.5" />} label="Dari" value={bill.issuerName} />
              <BillMeta icon={<UserRound className="size-3.5" />} label="Untuk" value={bill.targetName} />
              <BillMeta icon={<CalendarClock className="size-3.5" />} label="Jatuh Tempo" value={formatDate(bill.dueAt)} />
              <BillMeta icon={<Clock3 className="size-3.5" />} label="Dibuat" value={formatDate(bill.createdAt)} />
              <BillMeta icon={<ShieldCheck className="size-3.5" />} label="Issuer Job" value={bill.issuerJobLabel || bill.issuerJob} />
              <BillMeta icon={<WalletCards className="size-3.5" />} label="Society" value={bill.society || '-'} />
            </div>

            <Octagon className="mt-3" cut={13} bg="rgba(255,255,255,0.035)" border="rgba(255,255,255,0.075)">
              <div className="p-4">
                <span className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                  Deskripsi
                </span>
                <p className="mt-2 whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-muted">
                  {bill.description || 'Tidak ada deskripsi.'}
                </p>
              </div>
            </Octagon>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <BillMeta icon={<Clock3 className="size-3.5" />} label="Late Fee" value={`${bill.lateFeePercent}% / hari`} />
              <BillMeta icon={<FileClock className="size-3.5" />} label="Terlambat" value={`${bill.daysLate || 0} hari`} />
              <BillMeta icon={<ReceiptText className="size-3.5" />} label="Status" value={status.label} />
            </div>

            {(bill.paidAt || bill.cancelledAt) && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {bill.paidAt && <BillMeta icon={<CheckCircle2 className="size-3.5" />} label="Dibayar" value={formatDate(bill.paidAt)} />}
                {bill.cancelledAt && <BillMeta icon={<X className="size-3.5" />} label="Dicancel" value={formatDate(bill.cancelledAt)} />}
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-4">
            <ActionButton onClick={onClose}>Tutup Detail</ActionButton>

            {canAct && action === 'pay' && (
              <ActionButton disabled={loading} onClick={() => onPay?.(bill.id)} icon={loading ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}>
                Bayar Sekarang
              </ActionButton>
            )}

            {canAct && action === 'cancel' && (
              <ActionButton danger disabled={loading} onClick={() => onCancel?.(bill.id)}>
                Cancel Billing
              </ActionButton>
            )}
          </footer>
        </div>
      </section>
    </div>
  )
}

function DetailMetric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'accent' | 'error' | 'default' }) {
  return (
    <Octagon cut={12} bg="rgba(255,255,255,0.035)" border={tone === 'accent' ? 'rgba(139,229,43,0.28)' : tone === 'error' ? 'rgba(255,90,95,0.28)' : 'rgba(255,255,255,0.075)'}>
      <div className="p-4">
        <span className="block font-heading text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-muted">
          {label}
        </span>
        <strong
          className={cn(
            'mt-2 block truncate font-heading text-[clamp(1.1rem,2vw,1.55rem)] font-bold leading-none tracking-[-0.03em]',
            tone === 'accent' && 'text-accent',
            tone === 'error' && 'text-error',
            tone === 'default' && 'text-fg'
          )}
        >
          {value}
        </strong>
      </div>
    </Octagon>
  )
}

function WebviewPanel({
  bootstrap,
  nuiLogs,
  onReset
}: {
  bootstrap: BootstrapData
  nuiLogs: string[]
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const json = useMemo(() => JSON.stringify(bootstrap, null, 2), [bootstrap])

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-3">
      <SectionTitle title="Webview Preview" description="Panel testing UI React tanpa perlu buka FiveM." />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <BillMeta icon={<UserRound className="size-3.5" />} label="Player" value={bootstrap.player.name} />
        <BillMeta icon={<ShieldCheck className="size-3.5" />} label="Job" value={bootstrap.player.jobLabel} />
        <BillMeta icon={<FileClock className="size-3.5" />} label="Pending" value={String(bootstrap.pendingBills.length)} />
        <BillMeta icon={<History className="size-3.5" />} label="History" value={String(bootstrap.historyBills.length)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={onReset} icon={<RefreshCw className="size-4" />}>Reset Mock Data</ActionButton>
        <ActionButton onClick={copyJson}>{copied ? 'Copied JSON' : 'Copy Mock JSON'}</ActionButton>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <CodePanel title="NUI Message Logs" data={nuiLogs.length === 0 ? ['Belum ada log message.'] : nuiLogs} />
        <CodePanel title="Full Bootstrap Mock JSON" data={bootstrap} />
      </div>
    </div>
  )
}

function Octagon({
  children,
  className,
  cut = 12,
  bg,
  border
}: {
  children: ReactNode
  className?: string
  cut?: number
  bg?: string
  border?: string
}) {
  return (
    <div className={cn('octagon-frame relative isolate min-w-0', className)} style={octaStyle(cut, bg, border)}>
      <div className="relative z-[1] min-h-0">{children}</div>
    </div>
  )
}

function IconButton({
  children,
  label,
  disabled,
  onClick
}: {
  children: ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      className="octagon-frame relative isolate grid size-10 place-items-center text-muted transition duration-150 hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      style={octaStyle(9, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.1)')}
      type="button"
    >
      <span className="relative z-[1] grid h-full w-full place-items-center">{children}</span>
    </button>
  )
}

function ActionButton({
  children,
  icon,
  danger = false,
  disabled,
  onClick
}: {
  children: ReactNode
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      className={cn(
        'octagon-frame relative isolate flex h-10 items-center justify-center px-4 font-heading text-[11px] font-bold uppercase tracking-[0.1em] transition duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        danger ? 'text-error hover:brightness-125' : 'text-accent hover:brightness-125'
      )}
      disabled={disabled}
      onClick={onClick}
      style={octaStyle(10, danger ? 'rgba(255,90,95,0.12)' : 'rgba(139,229,43,0.15)', danger ? 'rgba(255,90,95,0.34)' : 'rgba(139,229,43,0.40)')}
      type="button"
    >
      <span className="relative z-[1] flex items-center justify-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-11 w-full border border-white/[0.07] bg-black/20 px-3 text-[13px] font-semibold text-fg outline-none transition placeholder:text-muted/50 focus:border-accent/45 disabled:cursor-not-allowed disabled:opacity-60',
        props.className
      )}
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-[108px] w-full resize-none border border-white/[0.07] bg-black/20 px-3 py-3 text-[13px] font-medium leading-relaxed text-fg outline-none transition placeholder:text-muted/50 focus:border-accent/45 disabled:cursor-not-allowed disabled:opacity-60',
        props.className
      )}
    />
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block font-heading text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-1 flex items-end justify-between gap-4 border-b border-white/[0.055] pb-3">
      <div className="min-w-0">
        <span className="font-heading text-[11px] font-bold uppercase leading-none tracking-[0.16em] text-accent">
          {title}
        </span>
        <p className="mt-1 text-[12px] font-medium text-muted">{description}</p>
      </div>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div
      className="octagon-frame relative isolate min-w-0"
      style={octaStyle(9, 'rgba(255,255,255,0.035)', 'rgba(255,255,255,0.07)')}
    >
      <div className="relative z-[1] flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2 text-muted">
          <span className="grid size-5 shrink-0 place-items-center text-accent">{icon}</span>
          <span className="truncate text-[12px] font-medium">{label}</span>
        </div>
        <span className="truncate text-right font-heading text-[12px] font-bold text-fg">{value}</span>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="octagon-frame relative isolate min-w-0"
      style={octaStyle(10, 'rgba(255,255,255,0.035)', 'rgba(255,255,255,0.07)')}
    >
      <div className="relative z-[1] p-3">
        <span className="block truncate font-heading text-[9px] font-bold uppercase leading-none tracking-[0.13em] text-muted">
          {label}
        </span>
        <strong className="mt-2 block truncate font-heading text-[16px] font-bold leading-none text-accent">
          {value}
        </strong>
      </div>
    </div>
  )
}

function BillMeta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div
      className="octagon-frame relative isolate min-w-0"
      style={octaStyle(9, 'rgba(255,255,255,0.035)', 'rgba(255,255,255,0.07)')}
    >
      <div className="relative z-[1] p-3">
        <div className="flex items-center gap-2 text-accent/90">
          {icon}
          <span className="font-heading text-[9px] font-bold uppercase tracking-[0.12em]">{label}</span>
        </div>
        <p className="mt-2 truncate text-[12px] font-semibold text-fg/80">{value}</p>
      </div>
    </div>
  )
}

function StatusBadge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={cn('inline-flex items-center border px-2 py-1 font-heading text-[9px] font-bold uppercase leading-none tracking-[0.1em]', className)}>
      {children}
    </span>
  )
}

function StatusChip({ label, tone = 'default' }: { label: string; tone?: 'accent' | 'default' }) {
  return (
    <div
      className="octagon-frame relative isolate hidden px-3 py-2 sm:block"
      style={octaStyle(8, tone === 'accent' ? 'rgba(139,229,43,0.08)' : 'rgba(255,255,255,0.04)', tone === 'accent' ? 'rgba(139,229,43,0.22)' : 'rgba(255,255,255,0.09)')}
    >
      <span className="relative z-[1] flex items-center gap-2 font-heading text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-accent">
        <span className="grid h-3 w-3 place-items-center overflow-visible">
          <span className="block size-1.5 rotate-45 bg-accent" />
        </span>
        {label}
      </span>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="grid min-h-[420px] place-items-center py-8">
      <div className="max-w-md text-center">
        <Octagon className="mx-auto grid size-16 place-items-center" cut={14} bg="rgba(139,229,43,0.08)" border="rgba(139,229,43,0.24)">
          <div className="grid h-full w-full place-items-center text-accent">{icon}</div>
        </Octagon>
        <h3 className="mt-4 font-heading text-[1.65rem] font-bold uppercase leading-none tracking-[-0.04em] text-fg">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  )
}

function CodePanel({ title, data }: { title: string; data: unknown }) {
  return (
    <Octagon cut={14} bg="rgba(255,255,255,0.035)" border="rgba(255,255,255,0.08)">
      <div className="p-4">
        <span className="font-heading text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{title}</span>
        <pre className="scrollbar-thin mt-3 max-h-[320px] overflow-auto border border-white/[0.06] bg-black/25 p-3 font-mono text-[11px] leading-relaxed text-muted">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </Octagon>
  )
}

function Toast({ toast }: { toast: ToastState }) {
  return (
    <div
      className="octagon-frame absolute bottom-5 right-5 z-20 max-w-sm px-4 py-3"
      style={octaStyle(12, 'rgba(17,21,27,0.96)', toast.type === 'error' ? 'rgba(255,90,95,0.28)' : 'rgba(139,229,43,0.26)')}
    >
      <p
        className={cn(
          'relative z-[1] text-sm font-semibold',
          toast.type === 'success' && 'text-accent',
          toast.type === 'error' && 'text-error',
          toast.type === 'info' && 'text-fg'
        )}
      >
        {toast.message}
      </p>
    </div>
  )
}

export default App
