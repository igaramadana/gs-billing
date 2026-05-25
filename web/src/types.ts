export type BillStatus = 'pending' | 'paid' | 'cancelled'

export interface Bill {
  id: number
  targetCitizenId: string
  targetName: string
  issuerCitizenId: string
  issuerName: string
  issuerJob: string
  issuerJobLabel: string
  society: string
  label: string
  description?: string
  amount: number
  amountDue: number
  lateFeePercent: number
  daysLate: number
  penaltyAmount: number
  dueAt: string
  status: BillStatus
  paidAt?: string
  cancelledAt?: string
  createdAt: string
}

export interface PlayerInfo {
  citizenid: string
  name: string
  job: string
  jobLabel: string
  onduty: boolean
  canCreate: boolean
  accessReason?: string
  society?: string
}

export interface TargetInfo {
  source: number
  citizenid: string
  name: string
}

export interface BillingConfig {
  lateFeePercent: number
  defaultDueDays: number
  minAmount: number
  maxAmount: number
}

export interface DebugInfo {
  enabled: boolean
  canAccess: boolean
  serverId: number
  resource: string
  timestamp: string
  unix: number
}

export interface BootstrapData {
  ok: boolean
  message?: string
  debug?: DebugInfo
  player: PlayerInfo
  config: BillingConfig
  target?: TargetInfo | null
  pendingBills: Bill[]
  historyBills: Bill[]
  issuedBills: Bill[]
}

export interface NuiResponse {
  ok: boolean
  message?: string
  billId?: number
}