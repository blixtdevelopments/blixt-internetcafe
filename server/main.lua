local activeComputers = {}

local function debugPrint(...)
    if Config.Debug then
        print('[blixt-internetcafe:server]', ...)
    end
end

local function notify(src, message, notifyType)
    Bridge.Notify(src, message, notifyType, 'Computer')
end

local function trim(str)
    str = tostring(str or '')
    return str:match('^%s*(.-)%s*$')
end

local function lower(str)
    return string.lower(tostring(str or ''))
end

local function getPlayer(src)
    return Bridge.GetPlayer(src)
end

local function getCitizenId(src)
    local player = getPlayer(src)
    if player and player.PlayerData and player.PlayerData.citizenid then
        return player.PlayerData.citizenid
    end
    return ('license:%s'):format(GetPlayerIdentifierByType(src, 'license') or src)
end

local function getCharacterName(src)
    local player = getPlayer(src)
    local data = player and player.PlayerData
    if data and data.charinfo then
        local first = data.charinfo.firstname or data.charinfo.firstName or ''
        local last = data.charinfo.lastname or data.charinfo.lastName or ''
        local full = trim(first .. ' ' .. last)
        if full ~= '' then return full end
    end
    return GetPlayerName(src) or ('Player %s'):format(src)
end

local function getPhoneNumber(src)
    local player = getPlayer(src)
    local data = player and player.PlayerData
    if data then
        if data.charinfo then
            local phone = data.charinfo.phone or data.charinfo.phone_number or data.charinfo.phonenumber
            phone = trim(phone)
            if phone ~= '' then return phone end
        end
        if data.metadata then
            local phone = data.metadata.phone or data.metadata.phone_number or data.metadata.phonenumber
            phone = trim(phone)
            if phone ~= '' then return phone end
        end
    end
    return ''
end

local function removeMoney(src, amount, reason)
    return Bridge.RemoveMoney(src, 'bank', amount, reason)
end

local function cleanText(value, maxLen)
    value = trim(value)
    value = value:gsub('[\0\r]', '')
    if maxLen and #value > maxLen then
        value = value:sub(1, maxLen)
    end
    return value
end

local function cleanUrl(value, maxLen)
    value = cleanText(value, maxLen or 512)
    if value == '' then return nil end
    if not value:match('^https?://') then
        return nil
    end
    return value
end

local function makeEmail(username)
    username = lower(trim(username))
    username = username:gsub('@' .. Config.Email.domain:gsub('%.', '%%.') .. '$', '')
    return username .. '@' .. Config.Email.domain
end

local function validateUsername(username)
    username = lower(trim(username))
    username = username:gsub('@' .. Config.Email.domain:gsub('%.', '%%.') .. '$', '')

    if #username < Config.Email.minUsernameLength then
        return false, ('Username must be at least %s characters.'):format(Config.Email.minUsernameLength)
    end

    if #username > Config.Email.maxUsernameLength then
        return false, ('Username must be under %s characters.'):format(Config.Email.maxUsernameLength)
    end

    if not username:match(Config.Email.usernamePattern) then
        return false, 'Username can only use letters, numbers, dots, underscores, hyphens, and plus signs.'
    end

    if username:sub(1, 1) == '.' or username:sub(-1) == '.' or username:find('%.%.') then
        return false, 'Username has invalid dot placement.'
    end

    return true, username
end

local function getEmailForCitizen(citizenid)
    local row = MySQL.single.await('SELECT email FROM internetcafe_accounts WHERE citizenid = ? LIMIT 1', { citizenid })
    return row and row.email or nil
end

local function ensureColumn(tableName, columnName, definition)
    local row = MySQL.single.await([[SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1]], { tableName, columnName })
    if not row then
        MySQL.query.await(('ALTER TABLE `%s` ADD COLUMN %s'):format(tableName, definition))
        debugPrint(('Added missing column %s.%s'):format(tableName, columnName))
    end
end

local function createTables()
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `internetcafe_accounts` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(64) NOT NULL,
            `email` VARCHAR(96) NOT NULL,
            `display_name` VARCHAR(96) NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_citizenid` (`citizenid`),
            UNIQUE KEY `uniq_email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `internetcafe_mail` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `sender_citizenid` VARCHAR(64) NOT NULL,
            `sender_email` VARCHAR(96) NOT NULL,
            `sender_name` VARCHAR(96) NOT NULL,
            `recipient_email` VARCHAR(96) NOT NULL,
            `subject` VARCHAR(120) NOT NULL,
            `body` TEXT NOT NULL,
            `attachment_url` VARCHAR(512) NULL,
            `is_read` TINYINT(1) NOT NULL DEFAULT 0,
            `deleted_by_sender` TINYINT(1) NOT NULL DEFAULT 0,
            `deleted_by_recipient` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_recipient` (`recipient_email`, `created_at`),
            KEY `idx_sender` (`sender_email`, `created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `internetcafe_posts` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `citizenid` VARCHAR(64) NOT NULL,
            `author_name` VARCHAR(96) NOT NULL,
            `contact_email` VARCHAR(96) NULL,
            `contact_phone` VARCHAR(64) NULL,
            `app` VARCHAR(32) NOT NULL,
            `category` VARCHAR(64) NOT NULL,
            `title` VARCHAR(100) NOT NULL,
            `body` TEXT NOT NULL,
            `image_url` VARCHAR(512) NULL,
            `price` INT NULL,
            `status` VARCHAR(20) NOT NULL DEFAULT 'active',
            `expires_at` DATETIME NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_app_status` (`app`, `status`, `created_at`),
            KEY `idx_citizenid` (`citizenid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    ensureColumn('internetcafe_mail', 'attachment_url', '`attachment_url` VARCHAR(512) NULL AFTER `body`')
    ensureColumn('internetcafe_posts', 'contact_phone', '`contact_phone` VARCHAR(64) NULL AFTER `contact_email`')
    ensureColumn('internetcafe_posts', 'image_url', '`image_url` VARCHAR(512) NULL AFTER `body`')

    debugPrint('Database tables ready')
end

CreateThread(function()
    Wait(500)
    createTables()
end)

Bridge.RegisterCallback('blixt-internetcafe:server:claimComputer', function(src, computerKey)
    if type(computerKey) ~= 'string' or computerKey == '' then return false end
    if activeComputers[computerKey] and activeComputers[computerKey] ~= src then
        return false
    end
    activeComputers[computerKey] = src
    return true
end)

RegisterNetEvent('blixt-internetcafe:server:releaseComputer', function(computerKey)
    local src = source
    if activeComputers[computerKey] == src then
        activeComputers[computerKey] = nil
    end
end)

AddEventHandler('playerDropped', function()
    local src = source
    for key, owner in pairs(activeComputers) do
        if owner == src then activeComputers[key] = nil end
    end
end)

Bridge.RegisterCallback('blixt-internetcafe:server:getSession', function(src)
    local citizenid = getCitizenId(src)
    local email = getEmailForCitizen(citizenid)
    local unread = 0
    if email then
        local row = MySQL.single.await('SELECT COUNT(*) AS count FROM internetcafe_mail WHERE recipient_email = ? AND is_read = 0 AND deleted_by_recipient = 0', { email })
        unread = row and row.count or 0
    end

    return {
        ok = true,
        citizenid = citizenid,
        name = getCharacterName(src),
        email = email,
        phone = getPhoneNumber(src),
        unread = unread,
        domain = Config.Email.domain,
        categories = Config.Categories
    }
end)

Bridge.RegisterCallback('blixt-internetcafe:server:registerEmail', function(src, data)
    data = data or {}
    local citizenid = getCitizenId(src)
    local existing = getEmailForCitizen(citizenid)
    if existing then
        return { ok = false, message = 'You already have a HotPost account.', email = existing }
    end

    local valid, usernameOrMessage = validateUsername(data.username)
    if not valid then
        return { ok = false, message = usernameOrMessage }
    end

    local email = makeEmail(usernameOrMessage)
    local taken = MySQL.single.await('SELECT id FROM internetcafe_accounts WHERE email = ? LIMIT 1', { email })
    if taken then
        return { ok = false, message = 'That email address is already taken.' }
    end

    local displayName = getCharacterName(src)
    MySQL.insert.await('INSERT INTO internetcafe_accounts (citizenid, email, display_name) VALUES (?, ?, ?)', {
        citizenid, email, displayName
    })

    return { ok = true, email = email, message = 'HotPost account created.' }
end)

Bridge.RegisterCallback('blixt-internetcafe:server:sendEmail', function(src, data)
    data = data or {}
    local citizenid = getCitizenId(src)
    local senderEmail = getEmailForCitizen(citizenid)
    if not senderEmail then
        return { ok = false, message = 'Create a HotPost account first.' }
    end

    local recipient = lower(cleanText(data.to, 96))
    if not recipient:find('@') then recipient = recipient .. '@' .. Config.Email.domain end
    local subject = cleanText(data.subject, Config.Email.maxSubjectLength)
    local body = cleanText(data.body, Config.Email.maxBodyLength)
    local attachmentUrl = cleanUrl(data.attachmentUrl, 512)

    if recipient == '' or subject == '' or body == '' then
        return { ok = false, message = 'Recipient, subject, and message are required.' }
    end

    local exists = MySQL.single.await('SELECT id FROM internetcafe_accounts WHERE email = ? LIMIT 1', { recipient })
    if not exists then
        return { ok = false, message = 'That HotPost address does not exist.' }
    end

    MySQL.insert.await([[INSERT INTO internetcafe_mail
        (sender_citizenid, sender_email, sender_name, recipient_email, subject, body, attachment_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)]], {
        citizenid, senderEmail, getCharacterName(src), recipient, subject, body, attachmentUrl
    })

    return { ok = true, message = 'Email sent.' }
end)

Bridge.RegisterCallback('blixt-internetcafe:server:getMail', function(src, data)
    data = data or {}
    local citizenid = getCitizenId(src)
    local email = getEmailForCitizen(citizenid)
    if not email then return { ok = false, message = 'No HotPost account.' } end

    local box = data.box == 'sent' and 'sent' or 'inbox'
    local rows
    if box == 'sent' then
        rows = MySQL.query.await([[SELECT id, sender_email, sender_name, recipient_email, subject, body, attachment_url, is_read, created_at
            FROM internetcafe_mail
            WHERE sender_email = ? AND deleted_by_sender = 0
            ORDER BY created_at DESC LIMIT 60]], { email })
    else
        rows = MySQL.query.await([[SELECT id, sender_email, sender_name, recipient_email, subject, body, attachment_url, is_read, created_at
            FROM internetcafe_mail
            WHERE recipient_email = ? AND deleted_by_recipient = 0
            ORDER BY created_at DESC LIMIT 60]], { email })
    end

    return { ok = true, box = box, mail = rows or {} }
end)

Bridge.RegisterCallback('blixt-internetcafe:server:markMailRead', function(src, data)
    data = data or {}
    local id = tonumber(data.id)
    if not id then return { ok = false } end

    local citizenid = getCitizenId(src)
    local email = getEmailForCitizen(citizenid)
    if not email then return { ok = false } end

    MySQL.update.await('UPDATE internetcafe_mail SET is_read = 1 WHERE id = ? AND recipient_email = ?', { id, email })
    return { ok = true }
end)

local function getAllowedCategories(app)
    return app == 'jobs' and Config.Categories.jobs or Config.Categories.fleabay
end

local function categoryAllowed(app, category)
    for _, value in ipairs(getAllowedCategories(app)) do
        if value == category then return true end
    end
    return false
end

Bridge.RegisterCallback('blixt-internetcafe:server:getPosts', function(_, data)
    data = data or {}
    local app = data.app == 'jobs' and 'jobs' or 'fleabay'
    local category = cleanText(data.category, 64)

    local params = { app }
    local where = "app = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())"
    if category ~= '' and category ~= 'All' then
        where = where .. ' AND category = ?'
        params[#params + 1] = category
    end

    local rows = MySQL.query.await(('SELECT id, author_name, contact_email, contact_phone, app, category, title, body, image_url, price, created_at, expires_at FROM internetcafe_posts WHERE %s ORDER BY created_at DESC LIMIT 80'):format(where), params)
    return { ok = true, posts = rows or {} }
end)

Bridge.RegisterCallback('blixt-internetcafe:server:createPost', function(src, data)
    data = data or {}
    local citizenid = getCitizenId(src)
    local app = data.app == 'jobs' and 'jobs' or 'fleabay'
    local category = cleanText(data.category, 64)
    local title = cleanText(data.title, 100)
    local body = cleanText(data.body, 2200)
    local imageUrl = cleanUrl(data.imageUrl, 512)
    local price = tonumber(data.price)
    local contactEmail = getEmailForCitizen(citizenid)
    local contactPhone = data.includePhone and getPhoneNumber(src) or nil
    if contactPhone then
        contactPhone = cleanText(contactPhone, 64)
        if contactPhone == '' then contactPhone = nil end
    end

    if not contactEmail then
        return { ok = false, message = 'Create a HotPost account first so people can contact you.' }
    end

    if title == '' or body == '' then
        return { ok = false, message = 'Title and description are required.' }
    end

    if not categoryAllowed(app, category) then
        return { ok = false, message = 'Invalid category.' }
    end

    local maxPosts = app == 'jobs' and Config.Posting.maxActiveJobsPerPlayer or Config.Posting.maxActiveAdsPerPlayer
    local countRow = MySQL.single.await([[SELECT COUNT(*) AS count FROM internetcafe_posts
        WHERE citizenid = ? AND app = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())]], { citizenid, app })
    if countRow and countRow.count >= maxPosts then
        return { ok = false, message = ('You already have %s active posts.'):format(maxPosts) }
    end

    local cost = app == 'jobs' and Config.Posting.jobPostCost or Config.Posting.adPostCost
    if not removeMoney(src, cost, app == 'jobs' and 'job_board_post' or 'fleabay_post') then
        return { ok = false, message = ('You need $%s in your bank account.'):format(cost) }
    end

    local status = Config.Posting.requireApproval and 'pending' or 'active'
    local expireDays = tonumber(data.expireDays) or Config.Posting.defaultExpireDays or 7
    expireDays = math.max(1, math.min(30, expireDays))

    MySQL.insert.await([[INSERT INTO internetcafe_posts
        (citizenid, author_name, contact_email, contact_phone, app, category, title, body, image_url, price, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))]], {
        citizenid, getCharacterName(src), contactEmail, contactPhone, app, category, title, body, imageUrl, price, status, expireDays
    })

    return { ok = true, message = status == 'pending' and 'Post submitted for approval.' or 'Post published.' }
end)

Bridge.RegisterCallback('blixt-internetcafe:server:deletePost', function(src, data)
    data = data or {}
    local id = tonumber(data.id)
    if not id then return { ok = false } end

    local citizenid = getCitizenId(src)
    local changed = MySQL.update.await('UPDATE internetcafe_posts SET status = ? WHERE id = ? AND citizenid = ?', { 'deleted', id, citizenid })
    return { ok = changed and changed > 0 }
end)

RegisterCommand('internetemail', function(src)
    if src == 0 then return end
    local citizenid = getCitizenId(src)
    local email = getEmailForCitizen(citizenid)
    notify(src, email and ('Your HotPost email is ' .. email) or 'You do not have a HotPost account yet.', email and 'inform' or 'error')
end, false)
