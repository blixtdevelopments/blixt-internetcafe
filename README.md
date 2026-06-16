   ██████╗ ██╗     ██╗██╗  ██╗████████╗
   ██╔══██╗██║     ██║╚██╗██╔╝╚══██╔══╝
   ██████╔╝██║     ██║ ╚███╔╝    ██║   
   ██╔══██╗██║     ██║ ██╔██╗    ██║   
   ██████╔╝███████╗██║██╔╝ ██╗   ██║   
   ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═╝   ╚═╝   

==========================================
⚡ B L I X T   D E V E L O P M E N T S ⚡
==========================================

⚡  blixt-internetcafe v1.0

A simple WinDos-style internet cafe / public computer resource for FiveM.

Players can interact with configured computer props to open a custom retro computer UI. The script includes basic apps, server-side persistence through MySQL, and framework bridge support for QB-Core, Qbox, or standalone use.

## Features

- Retro WinDos computer interface
- Interactable computer props
- Per-prop camera and screen positioning
- QB-Core / Qbox bridge support
- qb-target or ox_target support
- MySQL persistence with auto-created tables
- No ox_lib requirement

## Requirements

- `oxmysql`
- `qb-core` or `qbx_core` if using framework mode
- `qb-target` or `ox_target` if using target interaction

## Install

1. Place `blixt-internetcafe` into your `resources` folder.
2. Make sure `oxmysql` and your framework/target resources start before this script.
3. Add this to your `server.cfg`:

```cfg
ensure oxmysql
ensure qb-core # or qbx_core
ensure qb-target # or ox_target
ensure blixt-internetcafe
```

4. Open `shared/config.lua` and set the options you want:

```lua
Config.Framework = 'auto' -- 'auto', 'qb', 'qbx', or 'standalone'
Config.Target = 'qb-target' -- 'qb-target', 'ox_target', or false
```

5. Restart the server.

## Notes

Computer props, camera angles, UI size, and UI position are configured in `shared/config.lua`.
10 computer monitor props are working for this update

The database tables are created automatically when the resource starts.

## Credits

Created by Blixt Developments.
