import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  FileClock,
  History,
  Loader2,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  X
} from 'lucide-react'

import type { Bill, BootstrapData, NuiResponse } from './types'
import { formatDate, formatMoney, isBrowserDev, nuiFetch } from './api'
import { mockBootstrap } from './dev/mockData'

import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Tabs } from './components/ui/tabs'

type TabValue = 'create' | 'pending' | 'history' | 'issued' | 'webview'

interface ToastState {
  type: 'success' | 'error' | 'info'
  message: string
}

const emptyBootstrap: BootstrapData | null = null

function App() {
  const [visible, setVisible] = useState(isBrowserDev)
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(
    isBrowserDev ? mockBootstrap : emptyBootstrap
  )

  const [tab, setTab] = useState<TabValue>(isBrowserDev ? 'webview' : 'pending')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [nuiLogs, setNuiLogs] = useState<string[]>([])

  const [label, setLabel] = useState('Billing')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDays, setDueDays] = useState('1')

  const canCreateWithTarget = Boolean(
    bootstrap?.player?.canCreate && bootstrap?.target?.source
  )

  const pendingBills = bootstrap?.pendingBills ?? []
  const historyBills = bootstrap?.historyBills ?? []
  const issuedBills = bootstrap?.issuedBills ?? []

  const tabs = useMemo(() => {
    const items: Array<{ value: TabValue; label: string }> = [
      {
        value: 'pending',
        label: `Tagihan (${pendingBills.length})`
      },
      {
        value: 'history',
        label: 'History'
      }
    ]

    if (bootstrap?.player?.canCreate) {
      items.unshift({
        value: 'create',
        label: 'Buat Billing'
      })

      items.push({
        value: 'issued',
        label: 'Dibuat'
      })
    }

    if (isBrowserDev) {
      items.push({
        value: 'webview',
        label: 'Webview'
      })
    }

    return items
  }, [bootstrap?.player?.canCreate, pendingBills.length])

  function showToast(type: ToastState['type'], message: string) {
    setToast({ type, message })

    window.setTimeout(() => {
      setToast(null)
    }, 3500)
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
        setNuiLogs((current) => [
          `[${new Date().toLocaleTimeString()}] DEV refresh mock data`,
          ...current
        ].slice(0, 80))
        showToast('success', 'Mock data berhasil di-reset.')
        return
      }

      const response = await nuiFetch<BootstrapData>('refresh')

      if (response.ok) {
        setBootstrap(response)
      }
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

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('error', 'Nominal tidak valid.')
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
        dueDays: Number(dueDays || bootstrap.config.defaultDueDays)
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
        setNuiLogs((current) => [
          `[${new Date().toLocaleTimeString()}] DEV payBill billId=${billId}`,
          ...current
        ].slice(0, 80))
        return
      }

      const response = await nuiFetch<NuiResponse>('payBill', {
        billId
      })

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
        setNuiLogs((current) => [
          `[${new Date().toLocaleTimeString()}] DEV cancelBill billId=${billId}`,
          ...current
        ].slice(0, 80))
        return
      }

      const response = await nuiFetch<NuiResponse>('cancelBill', {
        billId
      })

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

      if (!payload || typeof payload !== 'object') {
        return
      }

      const logLine = `[${new Date().toLocaleTimeString()}] action=${String(
        payload.action ?? 'unknown'
      )}`

      setNuiLogs((current) => [logLine, ...current].slice(0, 80))

      if (payload.action === 'open') {
        setVisible(true)
      }

      if (payload.action === 'close') {
        setVisible(false)
      }

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
      if (event.key === 'Escape' && visible) {
        closeUi()
      }
    }

    window.addEventListener('message', onMessage)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [visible])

  if (!visible || !bootstrap) {
    return null
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-transparent p-8 font-geist text-white">
      <section className="relative grid h-[760px] w-[1120px] grid-cols-[330px_1fr] overflow-hidden rounded-[28px] border border-stroke bg-[#0b0f0a] shadow-2xl">
        <aside className="relative border-r border-white/10 bg-black/25 p-6">
          <div className="absolute inset-x-0 top-0 h-32 bg-brand/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-oswald text-4xl font-bold tracking-wide text-white">
                    BILLING
                  </h1>

                  {isBrowserDev && (
                    <span className="rounded-full border border-brand/25 bg-brand/10 px-3 py-1 font-geist text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                      Preview
                    </span>
                  )}
                </div>

                <p className="mt-1 font-oswald text-sm uppercase tracking-[0.28em] text-brand">
                  GS Management
                </p>
              </div>

              <Button variant="ghost" size="sm" onClick={closeUi}>
                <X size={16} />
              </Button>
            </div>

            <Card className="mt-7 bg-white/[0.03]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-brand/10 p-3 text-brand">
                    <UserRound size={22} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-oswald text-lg text-white">
                      {bootstrap.player.name}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {bootstrap.player.jobLabel} •{' '}
                      {bootstrap.player.onduty ? 'On Duty' : 'Off Duty'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-5 space-y-3">
              <InfoItem
                icon={<FileClock size={17} />}
                label="Pending Bills"
                value={String(pendingBills.length)}
              />
              <InfoItem
                icon={<History size={17} />}
                label="Total History"
                value={String(historyBills.length)}
              />
              <InfoItem
                icon={<CalendarClock size={17} />}
                label="Late Fee"
                value={`${bootstrap.config.lateFeePercent}% / hari`}
              />
              <InfoItem
                icon={<ShieldCheck size={17} />}
                label="Society"
                value={bootstrap.player.society ?? '-'}
              />
            </div>

            {bootstrap.target && (
              <Card className="mt-5 border-brand/20 bg-brand/[0.04]">
                <CardContent className="p-4">
                  <p className="font-oswald text-sm uppercase tracking-[0.2em] text-brand">
                    Target Player
                  </p>
                  <p className="mt-2 font-oswald text-xl text-white">
                    {bootstrap.target.name}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Server ID: {bootstrap.target.source}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col p-6">
          <div className="flex items-center justify-between gap-4">
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as TabValue)}
              items={tabs}
            />

            <Button variant="ghost" onClick={refreshData} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 animate-spin" size={16} />
              ) : (
                <RefreshCw className="mr-2" size={16} />
              )}
              Refresh
            </Button>
          </div>

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            {tab === 'create' && (
              <CreateBillPanel
                canCreateWithTarget={canCreateWithTarget}
                bootstrap={bootstrap}
                label={label}
                amount={amount}
                description={description}
                dueDays={dueDays}
                loading={loading}
                setLabel={setLabel}
                setAmount={setAmount}
                setDescription={setDescription}
                setDueDays={setDueDays}
                createBill={createBill}
              />
            )}

            {tab === 'pending' && (
              <BillsList
                bills={pendingBills}
                emptyTitle="Tidak ada tagihan pending"
                emptyDescription="Semua tagihan kamu sudah bersih."
                action="pay"
                loading={loading}
                onPay={payBill}
              />
            )}

            {tab === 'history' && (
              <BillsList
                bills={historyBills}
                emptyTitle="History kosong"
                emptyDescription="Belum ada history billing."
                loading={loading}
                action="none"
              />
            )}

            {tab === 'issued' && (
              <BillsList
                bills={issuedBills}
                emptyTitle="Belum membuat billing"
                emptyDescription="Billing yang kamu buat akan muncul di sini."
                loading={loading}
                action="cancel"
                onCancel={cancelBill}
              />
            )}

            {tab === 'webview' && (
              <WebviewPanel
                bootstrap={bootstrap}
                nuiLogs={nuiLogs}
                onReset={refreshData}
              />
            )}
          </div>
        </section>

        {toast && (
          <div className="absolute bottom-5 right-5 z-20 max-w-sm rounded-2xl border border-white/10 bg-[#0b0f0a] px-4 py-3 shadow-2xl">
            <p
              className={
                toast.type === 'success'
                  ? 'text-sm font-semibold text-brand'
                  : toast.type === 'error'
                    ? 'text-sm font-semibold text-red-300'
                    : 'text-sm font-semibold text-white'
              }
            >
              {toast.message}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

function InfoItem({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-3 text-white/55">
        <span className="text-brand">{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <span className="font-oswald text-base text-white">{value}</span>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Buat Billing Baru</CardTitle>
        <CardDescription>
          Billing hanya bisa dibuat saat on-duty dan target berada di dekat kamu.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!canCreateWithTarget ? (
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
            <p className="font-oswald text-xl text-yellow-100">
              Tidak ada target / akses tidak valid
            </p>
            <p className="mt-2 text-sm text-yellow-100/70">
              Gunakan ox_target ke player lain untuk membuat billing. Pastikan
              job kamu whitelist dan sedang on-duty.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target">
              <Input value={bootstrap.target?.name ?? '-'} disabled />
            </Field>

            <Field label="Society">
              <Input value={bootstrap.player.society ?? '-'} disabled />
            </Field>

            <Field label="Judul Billing">
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Contoh: Tilang Kendaraan"
                maxLength={80}
              />
            </Field>

            <Field label="Nominal">
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Contoh: 50000"
                inputMode="numeric"
              />
            </Field>

            <Field label="Jatuh Tempo Hari">
              <Input
                value={dueDays}
                onChange={(event) => setDueDays(event.target.value)}
                placeholder="1"
                inputMode="numeric"
              />
            </Field>

            <Field label="Denda Telat">
              <Input
                value={`${bootstrap.config.lateFeePercent}% per hari`}
                disabled
              />
            </Field>

            <div className="col-span-2">
              <Field label="Deskripsi">
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Masukkan keterangan billing..."
                  maxLength={160}
                />
              </Field>
            </div>

            <div className="col-span-2 flex justify-end">
              <Button onClick={createBill} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 animate-spin" size={16} />
                ) : (
                  <Send className="mr-2" size={16} />
                )}
                Kirim Billing
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-oswald text-sm uppercase tracking-[0.18em] text-white/60">
        {label}
      </span>
      {children}
    </label>
  )
}

function BillsList({
  bills,
  emptyTitle,
  emptyDescription,
  action,
  loading,
  onPay,
  onCancel
}: {
  bills: Bill[]
  emptyTitle: string
  emptyDescription: string
  action: 'pay' | 'cancel' | 'none'
  loading: boolean
  onPay?: (billId: number) => void
  onCancel?: (billId: number) => void
}) {
  if (bills.length === 0) {
    return (
      <Card className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 text-brand">
            <ReceiptText size={30} />
          </div>
          <h3 className="font-oswald text-2xl text-white">{emptyTitle}</h3>
          <p className="mt-2 text-sm text-white/50">{emptyDescription}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {bills.map((bill) => (
        <BillCard
          key={bill.id}
          bill={bill}
          action={action}
          loading={loading}
          onPay={onPay}
          onCancel={onCancel}
        />
      ))}
    </div>
  )
}

function BillCard({
  bill,
  action,
  loading,
  onPay,
  onCancel
}: {
  bill: Bill
  action: 'pay' | 'cancel' | 'none'
  loading: boolean
  onPay?: (billId: number) => void
  onCancel?: (billId: number) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-oswald text-2xl text-white">
                #{bill.id} — {bill.label}
              </h3>
              <Badge variant={bill.status}>{bill.status}</Badge>
            </div>

            <p className="mt-2 text-sm text-white/55">
              {bill.description || 'Tidak ada deskripsi.'}
            </p>
          </div>

          <div className="text-right">
            <p className="font-oswald text-3xl text-brand">
              {formatMoney(bill.amountDue)}
            </p>

            {bill.penaltyAmount > 0 && (
              <p className="mt-1 text-xs text-red-300">
                +{formatMoney(bill.penaltyAmount)} denda • {bill.daysLate} hari
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <MiniInfo
            icon={<UserRound size={15} />}
            label="Dari"
            value={bill.issuerName}
          />
          <MiniInfo
            icon={<Banknote size={15} />}
            label="Nominal Awal"
            value={formatMoney(bill.amount)}
          />
          <MiniInfo
            icon={<CalendarClock size={15} />}
            label="Jatuh Tempo"
            value={formatDate(bill.dueAt)}
          />
          <MiniInfo
            icon={<CheckCircle2 size={15} />}
            label="Dibuat"
            value={formatDate(bill.createdAt)}
          />
        </div>

        {(action === 'pay' || action === 'cancel') && bill.status === 'pending' && (
          <div className="mt-5 flex justify-end gap-3">
            {action === 'pay' && (
              <Button disabled={loading} onClick={() => onPay?.(bill.id)}>
                {loading ? (
                  <Loader2 className="mr-2 animate-spin" size={16} />
                ) : (
                  <Banknote className="mr-2" size={16} />
                )}
                Bayar Sekarang
              </Button>
            )}

            {action === 'cancel' && (
              <Button
                variant="danger"
                disabled={loading}
                onClick={() => onCancel?.(bill.id)}
              >
                Cancel Billing
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MiniInfo({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center gap-2 text-brand">
        {icon}
        <span className="font-oswald text-xs uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate text-sm text-white/70">{value}</p>
    </div>
  )
}

function WebviewPanel({
  bootstrap,
  nuiLogs,
  onReset
}: {
  bootstrap: BootstrapData
  nuiLogs: string[]
  onReset: () => Promise<void>
}) {
  const [copied, setCopied] = useState(false)

  const jsonData = useMemo(() => {
    return JSON.stringify(bootstrap, null, 2)
  }, [bootstrap])

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(jsonData)
      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-brand/20 bg-brand/[0.04]">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Webview Preview</CardTitle>
              <CardDescription>
                Panel ini hanya untuk preview UI React di browser. Tidak butuh
                Lua dan tidak butuh server callback.
              </CardDescription>
            </div>

            <Badge variant="paid">BROWSER MODE</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <MiniInfo
              icon={<UserRound size={15} />}
              label="Player"
              value={bootstrap.player.name}
            />
            <MiniInfo
              icon={<ShieldCheck size={15} />}
              label="Job"
              value={bootstrap.player.jobLabel}
            />
            <MiniInfo
              icon={<FileClock size={15} />}
              label="Pending"
              value={String(bootstrap.pendingBills.length)}
            />
            <MiniInfo
              icon={<History size={15} />}
              label="History"
              value={String(bootstrap.historyBills.length)}
            />
          </div>

          <div className="mt-5 flex gap-3">
            <Button onClick={onReset}>
              <RefreshCw size={16} className="mr-2" />
              Reset Mock Data
            </Button>

            <Button variant="ghost" onClick={copyJson}>
              {copied ? 'Copied JSON' : 'Copy Mock JSON'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <JsonCard title="Player Mock Data" data={bootstrap.player} />
        <JsonCard title="Target Mock Data" data={bootstrap.target ?? null} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NUI Message Logs</CardTitle>
          <CardDescription>
            Log message yang diterima dari window.postMessage / SendNUIMessage.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-white/70">
            {nuiLogs.length === 0 ? (
              <p className="text-white/35">Belum ada log message.</p>
            ) : (
              nuiLogs.map((log, index) => (
                <div
                  key={`${log}-${index}`}
                  className="border-b border-white/5 py-2"
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <JsonCard title="Full Bootstrap Mock JSON" data={bootstrap} large />
    </div>
  )
}

function JsonCard({
  title,
  data,
  large = false
}: {
  title: string
  data: unknown
  large?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <pre
          className={`overflow-auto rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-xs leading-relaxed text-white/70 ${
            large ? 'max-h-96' : 'max-h-72'
          }`}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  )
}

export default App