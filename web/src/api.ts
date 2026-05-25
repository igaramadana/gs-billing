import type { NuiResponse } from './types'

export const isBrowserDev =
  typeof window !== 'undefined' && !('GetParentResourceName' in window)

const resourceName =
  typeof window !== 'undefined' && 'GetParentResourceName' in window
    ? (window as any).GetParentResourceName()
    : 'gs-billing'

export async function nuiFetch<T = NuiResponse>(
  eventName: string,
  data?: unknown
): Promise<T> {
  if (isBrowserDev) {
    console.log(`[DEV NUI MOCK] ${eventName}`, data)

    return {
      ok: true,
      message: `DEV MOCK: ${eventName} success`
    } as T
  }

  const response = await fetch(`https://${resourceName}/${eventName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify(data ?? {})
  })

  return response.json() as Promise<T>
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value || 0)
}

export function formatDate(value?: string): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}