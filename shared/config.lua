Config = {}

Config.Debug = false

Config.Command = 'billing'

Config.Target = {
    enabled = true,
    label = 'Buat Billing',
    icon = 'fa-solid fa-file-invoice-dollar',
    distance = 2.0
}

Config.Security = {
    maxDistanceToTarget = 3.0,
    createCooldownSeconds = 5,
    payCooldownSeconds = 3,
    maxDescriptionLength = 160,
    minAmount = 1,
    maxAmount = 50000000
}

Config.LateFee = {
    enabled = true,

    -- 3% per hari
    dailyPercent = 3,

    -- due default setelah 1 hari
    defaultDueDays = 1,

    -- biar denda tidak infinite, bisa diubah
    maxPenaltyPercent = 300
}

Config.JobAccess = {
    police = {
        label = 'Police Department',
        society = 'police',
        minGrade = 0
    },

    ambulance = {
        label = 'Medical Department',
        society = 'ambulance',
        minGrade = 0
    },

    pemerintah = {
        label = 'Pemerintah',
        society = 'pemerintah',
        minGrade = 0
    },
    restoran = {
        label = 'Restoran',
        society = 'restoran',
        minGrade = 0
    }
}

Config.Payment = {
    accountPriority = { 'bank', 'cash' },

    -- true = bill paid akan masuk society qb-management
    depositToSociety = true
}

Config.Notify = {
    position = 'center-right',
    duration = 4500
}

Config.Locale = {
    targetNoPlayer = 'Player tidak ditemukan.',
    notAllowed = 'Kamu tidak memiliki akses billing.',
    notOnDuty = 'Kamu harus on-duty untuk menggunakan billing.',
    targetTooFar = 'Target terlalu jauh.',
    invalidAmount = 'Nominal tidak valid.',
    invalidDescription = 'Deskripsi tidak valid.',
    created = 'Billing berhasil dibuat.',
    paid = 'Billing berhasil dibayar.',
    notEnoughMoney = 'Uang tidak cukup.',
    billNotFound = 'Billing tidak ditemukan.',
    billAlreadyPaid = 'Billing sudah dibayar.',
    cancelled = 'Billing berhasil dibatalkan.',
    cooldown = 'Tunggu sebentar sebelum melakukan aksi lagi.'
}
