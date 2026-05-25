local QBCore = exports['qb-core']:GetCoreObject()

BillingBridge = {}

function BillingBridge.GetPlayer(src)
    return QBCore.Functions.GetPlayer(src)
end

function BillingBridge.GetPlayerName(Player)
    if not Player or not Player.PlayerData then
        return 'Unknown'
    end

    local charinfo = Player.PlayerData.charinfo or {}
    local firstname = charinfo.firstname or ''
    local lastname = charinfo.lastname or ''

    local fullname = (firstname .. ' ' .. lastname):gsub('^%s*(.-)%s*$', '%1')

    if fullname == '' then
        return Player.PlayerData.name or 'Unknown'
    end

    return fullname
end

function BillingBridge.GetCitizenId(Player)
    if not Player or not Player.PlayerData then
        return nil
    end

    return Player.PlayerData.citizenid
end

function BillingBridge.GetJob(Player)
    if not Player or not Player.PlayerData then
        return nil
    end

    return Player.PlayerData.job
end

function BillingBridge.IsJobAllowed(Player)
    local job = BillingBridge.GetJob(Player)

    if not job or not job.name then
        return false, 'invalid_job'
    end

    local allowed = Config.JobAccess[job.name]

    if not allowed then
        return false, 'not_allowed'
    end

    if not job.onduty then
        return false, 'not_on_duty'
    end

    local gradeLevel = 0

    if type(job.grade) == 'table' then
        gradeLevel = tonumber(job.grade.level) or 0
    else
        gradeLevel = tonumber(job.grade) or 0
    end

    if gradeLevel < (allowed.minGrade or 0) then
        return false, 'grade_too_low'
    end

    return true, nil, allowed
end

function BillingBridge.RemoveMoney(Player, amount)
    amount = tonumber(amount)

    if not amount or amount <= 0 then
        return false
    end

    for _, account in ipairs(Config.Payment.accountPriority) do
        local current = Player.Functions.GetMoney(account)

        if current and current >= amount then
            Player.Functions.RemoveMoney(account, amount, 'billing-payment')
            return true, account
        end
    end

    return false
end

function BillingBridge.DepositSociety(society, amount)
    if not Config.Payment.depositToSociety then
        return true
    end

    if not society or society == '' then
        return false
    end

    amount = tonumber(amount)

    if not amount or amount <= 0 then
        return false
    end

    local success = false

    if GetResourceState('qb-management') == 'started' then
        local ok = pcall(function()
            exports['qb-management']:AddMoney(society, amount)
        end)

        if ok then
            success = true
        end
    end

    -- fallback kalau server kamu pakai qb-banking society
    if not success and GetResourceState('qb-banking') == 'started' then
        local ok = pcall(function()
            exports['qb-banking']:AddMoney(society, amount)
        end)

        if ok then
            success = true
        end
    end

    return success
end

function BillingBridge.Notify(src, title, description, notifyType)
    TriggerClientEvent('ox_lib:notify', src, {
        title = title or 'Billing',
        description = description or '',
        type = notifyType or 'inform',
        position = Config.Notify.position,
        duration = Config.Notify.duration
    })
end
