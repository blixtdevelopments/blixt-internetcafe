fx_version 'cerulean'
game 'gta5'

name 'blixt-internetcafe'
author 'Blixt'
description 'Computer system based on windows 98 (WinDos)'
version '1.0.0'

lua54 'yes'

shared_scripts {
    'shared/config.lua',
    'shared/bridge.lua'
}

client_scripts {
    'client/main.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/main.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/main.css',
    'html/js/app.js',
    'html/assets/audio/windosStartup.ogg',
    'html/assets/images/server-logo.png',
}

dependencies {
    'oxmysql'
}

-- Optional supported resources:
-- qb-core / qbx_core
-- qb-target / ox_target
