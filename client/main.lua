local QBCore = exports['qb-core']:GetCoreObject()

local uiOpen = false
local pendingTargetServerId = nil

local function debugPrint(...)
    if Config.Debug then
        print('[gs-billing/client]', ...)
    end
end

local function notify(title, description, notifyType)
    lib.notify({
        title = title or 'Billing',
        description = description or '',
        type = notifyType or 'inform',
        position = Config.Notify.position,
        duration = Config.Notify.duration
    })
end

local function getClosestTargetServerId(entity)
    if not entity or entity == 0 then
        return nil
    end

    local playerIndex = NetworkGetPlayerIndexFromPed(entity)

    if not playerIndex or playerIndex == -1 then
        return nil
    end

    local serverId = GetPlayerServerId(playerIndex)

    if not serverId or serverId == 0 then
        return nil
    end

    return serverId
end

local function setNuiVisible(state)
    uiOpen = state

    SetNuiFocus(state, state)
    SetNuiFocusKeepInput(false)

    SendNUIMessage({
        action = state and 'open' or 'close'
    })
end

local function openBilling(targetServerId)
    pendingTargetServerId = targetServerId

    local bootstrap = lib.callback.await('gs-billing:server:getBootstrap', false, {
        targetServerId = targetServerId
    })

    if not bootstrap or not bootstrap.ok then
        notify('Billing', bootstrap and bootstrap.message or 'Gagal membuka billing.', 'error')
        return
    end

    setNuiVisible(true)

    SendNUIMessage({
        action = 'bootstrap',
        data = bootstrap
    })
end

RegisterNetEvent('gs-billing:client:open', function()
    openBilling(nil)
end)

RegisterNetEvent('gs-billing:client:billCreated', function()
    notify('Billing Baru', 'Kamu menerima billing baru. Buka menu billing untuk melihat detail.', 'inform')

    if uiOpen then
        local bootstrap = lib.callback.await('gs-billing:server:getBootstrap', false, {
            targetServerId = pendingTargetServerId
        })

        if bootstrap and bootstrap.ok then
            SendNUIMessage({
                action = 'bootstrap',
                data = bootstrap
            })
        end
    end
end)

RegisterCommand(Config.Command, function()
    openBilling(nil)
end, false)

RegisterNUICallback('close', function(_, cb)
    setNuiVisible(false)
    cb({
        ok = true
    })
end)

RegisterNUICallback('refresh', function(_, cb)
    local bootstrap = lib.callback.await('gs-billing:server:getBootstrap', false, {
        targetServerId = pendingTargetServerId
    })

    if bootstrap and bootstrap.ok then
        SendNUIMessage({
            action = 'bootstrap',
            data = bootstrap
        })
    end

    cb(bootstrap or {
        ok = false
    })
end)

RegisterNUICallback('createBill', function(data, cb)
    data = data or {}
    data.targetServerId = data.targetServerId or pendingTargetServerId

    local result = lib.callback.await('gs-billing:server:createBill', false, data)

    if result and result.ok then
        local bootstrap = lib.callback.await('gs-billing:server:getBootstrap', false, {
            targetServerId = pendingTargetServerId
        })

        if bootstrap and bootstrap.ok then
            SendNUIMessage({
                action = 'bootstrap',
                data = bootstrap
            })
        end
    end

    cb(result or {
        ok = false,
        message = 'Gagal membuat billing.'
    })
end)

RegisterNUICallback('payBill', function(data, cb)
    local result = lib.callback.await('gs-billing:server:payBill', false, data and data.billId)

    if result and result.ok then
        local bootstrap = lib.callback.await('gs-billing:server:getBootstrap', false, {
            targetServerId = pendingTargetServerId
        })

        if bootstrap and bootstrap.ok then
            SendNUIMessage({
                action = 'bootstrap',
                data = bootstrap
            })
        end
    end

    cb(result or {
        ok = false,
        message = 'Gagal membayar billing.'
    })
end)

RegisterNUICallback('cancelBill', function(data, cb)
    local result = lib.callback.await('gs-billing:server:cancelBill', false, data and data.billId)

    if result and result.ok then
        local bootstrap = lib.callback.await('gs-billing:server:getBootstrap', false, {
            targetServerId = pendingTargetServerId
        })

        if bootstrap and bootstrap.ok then
            SendNUIMessage({
                action = 'bootstrap',
                data = bootstrap
            })
        end
    end

    cb(result or {
        ok = false,
        message = 'Gagal cancel billing.'
    })
end)

CreateThread(function()
    while not LocalPlayer.state.isLoggedIn do
        Wait(500)
    end

    if not Config.Target.enabled then
        return
    end

    exports.ox_target:addGlobalPlayer({
        {
            name = 'gs_billing_create',
            label = Config.Target.label,
            icon = Config.Target.icon,
            distance = Config.Target.distance,
            canInteract = function(entity)
                if not entity or entity == PlayerPedId() then
                    return false
                end

                local PlayerData = QBCore.Functions.GetPlayerData()

                if not PlayerData or not PlayerData.job then
                    return false
                end

                local jobName = PlayerData.job.name
                local jobConfig = Config.JobAccess[jobName]

                if not jobConfig then
                    return false
                end

                if not PlayerData.job.onduty then
                    return false
                end

                local gradeLevel = 0

                if type(PlayerData.job.grade) == 'table' then
                    gradeLevel = tonumber(PlayerData.job.grade.level) or 0
                else
                    gradeLevel = tonumber(PlayerData.job.grade) or 0
                end

                if gradeLevel < (jobConfig.minGrade or 0) then
                    return false
                end

                return true
            end,
            onSelect = function(data)
                local targetServerId = getClosestTargetServerId(data.entity)

                if not targetServerId then
                    notify('Billing', Config.Locale.targetNoPlayer, 'error')
                    return
                end

                debugPrint('Opening billing for target', targetServerId)
                openBilling(targetServerId)
            end
        }
    })
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then
        return
    end

    if uiOpen then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
    end
end)
