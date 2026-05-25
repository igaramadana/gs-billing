import { useMemo, useState } from 'react'
import {
  Bug,
  Clipboard,
  Database,
  Eye,
  FileJson,
  Monitor,
  RefreshCw
} from 'lucide-react'

import type { BootstrapData } from '../types'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'
import { Badge } from './ui/badge'

interface DebugPanelProps {
  bootstrap: BootstrapData
  nuiLogs: string[]
  onRefresh: () => Promise<void>
}

export function DebugPanel({ bootstrap, nuiLogs, onRefresh }: DebugPanelProps) {
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
              <CardTitle className="flex items-center gap-2">
                <Bug className="text-brand" size={22} />
                UI Debug Webview
              </CardTitle>
              <CardDescription>
                Ini hanya untuk preview tampilan React di browser. Tidak butuh
                Lua, tidak butuh server callback.
              </CardDescription>
            </div>

            <Badge variant="paid">BROWSER PREVIEW</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <DebugInfoCard
              icon={<Monitor size={16} />}
              label="Mode"
              value="Vite Browser"
            />
            <DebugInfoCard
              icon={<Eye size={16} />}
              label="Visible"
              value="true"
            />
            <DebugInfoCard
              icon={<Database size={16} />}
              label="Pending"
              value={String(bootstrap.pendingBills.length)}
            />
            <DebugInfoCard
              icon={<FileJson size={16} />}
              label="History"
              value={String(bootstrap.historyBills.length)}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={onRefresh}>
              <RefreshCw size={16} className="mr-2" />
              Reset Mock Data
            </Button>

            <Button variant="ghost" onClick={copyJson}>
              <Clipboard size={16} className="mr-2" />
              {copied ? 'Copied' : 'Copy Mock JSON'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <JsonBox title="Player Preview Data" data={bootstrap.player} />
        <JsonBox title="Target Preview Data" data={bootstrap.target ?? null} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <JsonBox title="Pending Bills" data={bootstrap.pendingBills} />
        <JsonBox title="History Bills" data={bootstrap.historyBills} />
        <JsonBox title="Issued Bills" data={bootstrap.issuedBills} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Browser NUI Logs</CardTitle>
          <CardDescription>
            Di browser preview biasanya kosong, kecuali kamu simulate
            postMessage manual dari devtools.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-white/70">
            {nuiLogs.length === 0 ? (
              <p className="text-white/35">Belum ada log message.</p>
            ) : (
              nuiLogs.map((log, index) => (
                <div key={`${log}-${index}`} className="border-b border-white/5 py-2">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full Mock Bootstrap JSON</CardTitle>
          <CardDescription>
            Data dummy yang dipakai untuk menampilkan UI ketika dibuka lewat
            browser.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-xs leading-relaxed text-white/70">
            {jsonData}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

function DebugInfoCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2 text-brand">
        {icon}
        <span className="font-oswald text-xs uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm text-white/75">{value}</p>
    </div>
  )
}

function JsonBox({ title, data }: { title: string; data: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <pre className="max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-xs leading-relaxed text-white/70">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  )
}