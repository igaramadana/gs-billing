local QBCore = exports['qb-core']:GetCoreObject()

local createCooldown = {}
local payCooldown = {}

local function debugPrint(...)
    if Config.Debug then
        print('[gs-billing]', ...)
    end
end

local function now()
    return os.time()
end

local function sanitizeText(value, maxLength)
    if type(value) ~= 'string' then
        return ''
    end

    value = value:gsub('[%c]', '')
    value = value:gsub('^%s*(.-)%s*$', '%1')

    if #value > maxLength then
        value = value:sub(1, maxLength)
    end

    return value
end

local function isOnCooldown(bucket, src, seconds)
    local current = now()

    if bucket[src] and bucket[src] > current then
        return true
    end

    bucket[src] = current + seconds
    return false
end

local function getCoords(src)
    local ped = GetPlayerPed(src)

    if not ped or ped == 0 then
        return nil
    end

    return GetEntityCoords(ped)
end

local function isNearPlayer(src, targetSrc)
    local srcCoords = getCoords(src)
    local targetCoords = getCoords(targetSrc)

    if not srcCoords or not targetCoords then
        return false
    end

    local distance = #(srcCoords - targetCoords)

    return distance <= Config.Security.maxDistanceToTarget
end

local function calculateAmountDue(row)
    local baseAmount = tonumber(row.amount) or 0

    if not Config.LateFee.enabled then
        return baseAmount, 0, 0
    end

    if row.status ~= 'pending' then
        return tonumber(row.amount_due) or baseAmount, 0, 0
    end

    local dueTimestamp

    if type(row.due_at) == 'number' then
        dueTimestamp = math.floor(row.due_at / 1000)
    else
        local y, m, d, h, min, s = tostring(row.due_at):match('(%d+)%-(%d+)%-(%d+)%s+(%d+):(%d+):(%d+)')
        if y then
            dueTimestamp = os.time({
                year = tonumber(y),
                month = tonumber(m),
                day = tonumber(d),
                hour = tonumber(h),
                min = tonumber(min),
                sec = tonumber(s)
            })
        end
    end

    if not dueTimestamp then
        return baseAmount, 0, 0
    end

    local secondsLate = os.difftime(os.time(), dueTimestamp)

    if secondsLate <= 0 then
        return baseAmount, 0, 0
    end

    local daysLate = math.floor(secondsLate / 86400)

    if daysLate <= 0 then
        return baseAmount, 0, 0
    end

    local dailyPercent = tonumber(row.late_fee_percent) or Config.LateFee.dailyPercent
    local penaltyPercent = daysLate * dailyPercent

    if Config.LateFee.maxPenaltyPercent then
        penaltyPercent = math.min(penaltyPercent, Config.LateFee.maxPenaltyPercent)
    end

    local penaltyAmount = math.floor(baseAmount * (penaltyPercent / 100))
    local amountDue = baseAmount + penaltyAmount

    return amountDue, daysLate, penaltyAmount
end

local function mapBill(row)
    if not row then
        return nil
    end

    local amountDue, daysLate, penaltyAmount = calculateAmountDue(row)

    return {
        id = row.id,
        targetCitizenId = row.target_citizenid,
        targetName = row.target_name,
        issuerCitizenId = row.issuer_citizenid,
        issuerName = row.issuer_name,
        issuerJob = row.issuer_job,
        issuerJobLabel = row.issuer_job_label,
        society = row.society,
        label = row.label,
        description = row.description,
        amount = tonumber(row.amount) or 0,
        amountDue = amountDue,
        lateFeePercent = tonumber(row.late_fee_percent) or Config.LateFee.dailyPercent,
        daysLate = daysLate,
        penaltyAmount = penaltyAmount,
        dueAt = row.due_at,
        status = row.status,
        paidAt = row.paid_at,
        cancelledAt = row.cancelled_at,
        createdAt = row.created_at
    }
end

local function getPendingBills(citizenid)
    local rows = MySQL.query.await([[
        SELECT *
        FROM gs_billing
        WHERE target_citizenid = ?
          AND status = 'pending'
        ORDER BY created_at DESC
    ]], { citizenid })

    local bills = {}

    for _, row in ipairs(rows or {}) do
        bills[#bills + 1] = mapBill(row)
    end

    return bills
end

local function getHistoryBills(citizenid)
    local rows = MySQL.query.await([[
        SELECT *
        FROM gs_billing
        WHERE target_citizenid = ?
           OR issuer_citizenid = ?
        ORDER BY created_at DESC
        LIMIT 80
    ]], { citizenid, citizenid })

    local bills = {}

    for _, row in ipairs(rows or {}) do
        bills[#bills + 1] = mapBill(row)
    end

    return bills
end

local function getIssuedBills(citizenid)
    local rows = MySQL.query.await([[
        SELECT *
        FROM gs_billing
        WHERE issuer_citizenid = ?
        ORDER BY created_at DESC
        LIMIT 80
    ]], { citizenid })

    local bills = {}

    for _, row in ipairs(rows or {}) do
        bills[#bills + 1] = mapBill(row)
    end

    return bills
end

lib.callback.register('gs-billing:server:getBootstrap', function(src, data)
    local Player = BillingBridge.GetPlayer(src)

    if not Player then
        return {
            ok = false,
            message = 'Player not found'
        }
    end

    local citizenid = BillingBridge.GetCitizenId(Player)
    local name = BillingBridge.GetPlayerName(Player)
    local job = BillingBridge.GetJob(Player)
    local isAllowed, reason, allowedJob = BillingBridge.IsJobAllowed(Player)

    local targetData = nil

    if data and data.targetServerId then
        local targetSrc = tonumber(data.targetServerId)
        local Target = targetSrc and BillingBridge.GetPlayer(targetSrc)

        if Target then
            targetData = {
                source = targetSrc,
                citizenid = BillingBridge.GetCitizenId(Target),
                name = BillingBridge.GetPlayerName(Target)
            }
        end
    end

    return {
        ok = true,
        player = {
            citizenid = citizenid,
            name = name,
            job = job and job.name or 'unknown',
            jobLabel = job and job.label or 'Unknown',
            onduty = job and job.onduty or false,
            canCreate = isAllowed,
            accessReason = reason,
            society = allowedJob and allowedJob.society or nil
        },
        config = {
            lateFeePercent = Config.LateFee.dailyPercent,
            defaultDueDays = Config.LateFee.defaultDueDays,
            minAmount = Config.Security.minAmount,
            maxAmount = Config.Security.maxAmount
        },
        target = targetData,
        pendingBills = getPendingBills(citizenid),
        historyBills = getHistoryBills(citizenid),
        issuedBills = getIssuedBills(citizenid)
    }
end)

lib.callback.register('gs-billing:server:createBill', function(src, data)
    if isOnCooldown(createCooldown, src, Config.Security.createCooldownSeconds) then
        return {
            ok = false,
            message = Config.Locale.cooldown
        }
    end

    local Player = BillingBridge.GetPlayer(src)

    if not Player then
        return {
            ok = false,
            message = 'Player not found'
        }
    end

    local isAllowed, reason, allowedJob = BillingBridge.IsJobAllowed(Player)

    if not isAllowed then
        local message = Config.Locale.notAllowed

        if reason == 'not_on_duty' then
            message = Config.Locale.notOnDuty
        end

        return {
            ok = false,
            message = message
        }
    end

    local targetSrc = tonumber(data and data.targetServerId)
    local amount = tonumber(data and data.amount)
    local label = sanitizeText(data and data.label or 'Billing', 80)
    local description = sanitizeText(data and data.description or '', Config.Security.maxDescriptionLength)

    if not targetSrc or targetSrc <= 0 or targetSrc == src then
        return {
            ok = false,
            message = Config.Locale.targetNoPlayer
        }
    end

    if not amount or amount < Config.Security.minAmount or amount > Config.Security.maxAmount then
        return {
            ok = false,
            message = Config.Locale.invalidAmount
        }
    end

    amount = math.floor(amount)

    if label == '' then
        label = 'Billing'
    end

    local Target = BillingBridge.GetPlayer(targetSrc)

    if not Target then
        return {
            ok = false,
            message = Config.Locale.targetNoPlayer
        }
    end

    if not isNearPlayer(src, targetSrc) then
        return {
            ok = false,
            message = Config.Locale.targetTooFar
        }
    end

    local issuerJob = BillingBridge.GetJob(Player)
    local issuerCitizenId = BillingBridge.GetCitizenId(Player)
    local targetCitizenId = BillingBridge.GetCitizenId(Target)

    if not issuerCitizenId or not targetCitizenId then
        return {
            ok = false,
            message = 'Citizen ID tidak valid.'
        }
    end

    local dueDays = tonumber(data and data.dueDays) or Config.LateFee.defaultDueDays

    if dueDays < 0 then
        dueDays = Config.LateFee.defaultDueDays
    end

    if dueDays > 30 then
        dueDays = 30
    end

    local dueAt = os.date('%Y-%m-%d %H:%M:%S', os.time() + (dueDays * 86400))

    local insertId = MySQL.insert.await([[
        INSERT INTO gs_billing
        (
            target_citizenid,
            target_name,
            issuer_citizenid,
            issuer_name,
            issuer_job,
            issuer_job_label,
            society,
            label,
            description,
            amount,
            amount_due,
            late_fee_percent,
            due_at,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ]], {
        targetCitizenId,
        BillingBridge.GetPlayerName(Target),
        issuerCitizenId,
        BillingBridge.GetPlayerName(Player),
        issuerJob.name,
        issuerJob.label or allowedJob.label or issuerJob.name,
        allowedJob.society,
        label,
        description,
        amount,
        amount,
        Config.LateFee.dailyPercent,
        dueAt
    })

    if not insertId then
        return {
            ok = false,
            message = 'Gagal membuat billing.'
        }
    end

    BillingBridge.Notify(src, 'Billing', Config.Locale.created, 'success')

    BillingBridge.Notify(targetSrc, 'Billing Baru',
        ('Kamu menerima billing sebesar $%s dari %s.'):format(amount, BillingBridge.GetPlayerName(Player)), 'inform')

    TriggerClientEvent('gs-billing:client:billCreated', targetSrc)

    debugPrint(('Bill #%s created by %s to %s amount %s'):format(insertId, src, targetSrc, amount))

    return {
        ok = true,
        message = Config.Locale.created,
        billId = insertId
    }
end)

lib.callback.register('gs-billing:server:payBill', function(src, billId)
    if isOnCooldown(payCooldown, src, Config.Security.payCooldownSeconds) then
        return {
            ok = false,
            message = Config.Locale.cooldown
        }
    end

    local Player = BillingBridge.GetPlayer(src)

    if not Player then
        return {
            ok = false,
            message = 'Player not found'
        }
    end

    billId = tonumber(billId)

    if not billId then
        return {
            ok = false,
            message = Config.Locale.billNotFound
        }
    end

    local citizenid = BillingBridge.GetCitizenId(Player)

    local row = MySQL.single.await([[
        SELECT *
        FROM gs_billing
        WHERE id = ?
        LIMIT 1
    ]], { billId })

    if not row then
        return {
            ok = false,
            message = Config.Locale.billNotFound
        }
    end

    if row.target_citizenid ~= citizenid then
        return {
            ok = false,
            message = 'Kamu tidak memiliki akses ke billing ini.'
        }
    end

    if row.status ~= 'pending' then
        return {
            ok = false,
            message = Config.Locale.billAlreadyPaid
        }
    end

    local amountDue = calculateAmountDue(row)

    local removed = BillingBridge.RemoveMoney(Player, amountDue)

    if not removed then
        return {
            ok = false,
            message = Config.Locale.notEnoughMoney
        }
    end

    local societySuccess = BillingBridge.DepositSociety(row.society, amountDue)

    if not societySuccess then
        print(('[gs-billing] WARNING: Failed to deposit society money. society=%s amount=%s billId=%s'):format(
        row.society, amountDue, billId))
    end

    MySQL.update.await([[
        UPDATE gs_billing
        SET status = 'paid',
            amount_due = ?,
            paid_at = NOW()
        WHERE id = ?
          AND status = 'pending'
    ]], { amountDue, billId })

    BillingBridge.Notify(src, 'Billing', Config.Locale.paid, 'success')

    return {
        ok = true,
        message = Config.Locale.paid
    }
end)

lib.callback.register('gs-billing:server:cancelBill', function(src, billId)
    local Player = BillingBridge.GetPlayer(src)

    if not Player then
        return {
            ok = false,
            message = 'Player not found'
        }
    end

    local isAllowed = BillingBridge.IsJobAllowed(Player)

    if not isAllowed then
        return {
            ok = false,
            message = Config.Locale.notAllowed
        }
    end

    billId = tonumber(billId)

    if not billId then
        return {
            ok = false,
            message = Config.Locale.billNotFound
        }
    end

    local citizenid = BillingBridge.GetCitizenId(Player)

    local row = MySQL.single.await([[
        SELECT *
        FROM gs_billing
        WHERE id = ?
        LIMIT 1
    ]], { billId })

    if not row then
        return {
            ok = false,
            message = Config.Locale.billNotFound
        }
    end

    if row.issuer_citizenid ~= citizenid then
        return {
            ok = false,
            message = 'Kamu hanya bisa cancel billing yang kamu buat.'
        }
    end

    if row.status ~= 'pending' then
        return {
            ok = false,
            message = 'Billing ini sudah tidak pending.'
        }
    end

    MySQL.update.await([[
        UPDATE gs_billing
        SET status = 'cancelled',
            cancelled_at = NOW()
        WHERE id = ?
          AND status = 'pending'
    ]], { billId })

    BillingBridge.Notify(src, 'Billing', Config.Locale.cancelled, 'success')

    return {
        ok = true,
        message = Config.Locale.cancelled
    }
end)

RegisterNetEvent('gs-billing:server:requestOpen', function()
    local src = source
    TriggerClientEvent('gs-billing:client:open', src)
end)
