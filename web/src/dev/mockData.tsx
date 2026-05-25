import type { BootstrapData } from '../types'

export const mockBootstrap: BootstrapData = {
  ok: true,
  debug: {
    enabled: true,
    canAccess: true,
    serverId: 1,
    resource: 'gs-billing',
    timestamp: '2026-05-22 20:30:00',
    unix: 1779466200
  },
  player: {
    citizenid: 'CITIZEN12345',
    name: 'Iga Ramadana',
    job: 'police',
    jobLabel: 'Police Department',
    onduty: true,
    canCreate: true,
    society: 'police'
  },
  config: {
    lateFeePercent: 3,
    defaultDueDays: 1,
    minAmount: 1,
    maxAmount: 50000000
  },
  target: {
    source: 24,
    citizenid: 'CITIZEN67890',
    name: 'Budi Santoso'
  },
  pendingBills: [
    {
      id: 1,
      targetCitizenId: 'CITIZEN12345',
      targetName: 'Iga Ramadana',
      issuerCitizenId: 'CITIZEN67890',
      issuerName: 'Budi Santoso',
      issuerJob: 'police',
      issuerJobLabel: 'Police Department',
      society: 'police',
      label: 'Tilang Kendaraan',
      description: 'Melanggar lampu merah dan berkendara tidak aman.',
      amount: 50000,
      amountDue: 54500,
      lateFeePercent: 3,
      daysLate: 3,
      penaltyAmount: 4500,
      dueAt: '2026-05-20 12:00:00',
      status: 'pending',
      createdAt: '2026-05-19 12:00:00'
    },
    {
      id: 2,
      targetCitizenId: 'CITIZEN12345',
      targetName: 'Iga Ramadana',
      issuerCitizenId: 'CITIZEN99999',
      issuerName: 'Admin Pemerintah',
      issuerJob: 'pemerintah',
      issuerJobLabel: 'Pemerintah',
      society: 'pemerintah',
      label: 'Pajak Administrasi',
      description: 'Biaya administrasi dokumen warga.',
      amount: 150000,
      amountDue: 150000,
      lateFeePercent: 3,
      daysLate: 0,
      penaltyAmount: 0,
      dueAt: '2026-05-25 12:00:00',
      status: 'pending',
      createdAt: '2026-05-22 12:00:00'
    }
  ],
  historyBills: [
    {
      id: 3,
      targetCitizenId: 'CITIZEN12345',
      targetName: 'Iga Ramadana',
      issuerCitizenId: 'CITIZEN67890',
      issuerName: 'Budi Santoso',
      issuerJob: 'police',
      issuerJobLabel: 'Police Department',
      society: 'police',
      label: 'Denda Parkir',
      description: 'Parkir sembarangan di area publik.',
      amount: 25000,
      amountDue: 25000,
      lateFeePercent: 3,
      daysLate: 0,
      penaltyAmount: 0,
      dueAt: '2026-05-17 12:00:00',
      status: 'paid',
      paidAt: '2026-05-16 18:45:00',
      createdAt: '2026-05-16 12:00:00'
    },
    {
      id: 4,
      targetCitizenId: 'CITIZEN12345',
      targetName: 'Iga Ramadana',
      issuerCitizenId: 'CITIZEN99999',
      issuerName: 'Admin Pemerintah',
      issuerJob: 'pemerintah',
      issuerJobLabel: 'Pemerintah',
      society: 'pemerintah',
      label: 'Administrasi Lama',
      description: 'Tagihan dibatalkan karena salah input.',
      amount: 100000,
      amountDue: 100000,
      lateFeePercent: 3,
      daysLate: 0,
      penaltyAmount: 0,
      dueAt: '2026-05-15 12:00:00',
      status: 'cancelled',
      cancelledAt: '2026-05-14 16:00:00',
      createdAt: '2026-05-14 12:00:00'
    }
  ],
  issuedBills: [
    {
      id: 5,
      targetCitizenId: 'CITIZEN67890',
      targetName: 'Budi Santoso',
      issuerCitizenId: 'CITIZEN12345',
      issuerName: 'Iga Ramadana',
      issuerJob: 'police',
      issuerJobLabel: 'Police Department',
      society: 'police',
      label: 'Tilang Kecepatan',
      description: 'Melebihi batas kecepatan.',
      amount: 75000,
      amountDue: 75000,
      lateFeePercent: 3,
      daysLate: 0,
      penaltyAmount: 0,
      dueAt: '2026-05-23 12:00:00',
      status: 'pending',
      createdAt: '2026-05-22 12:00:00'
    }
  ]
}