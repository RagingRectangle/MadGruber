# MadGruber Bot

## About
A Discord bot used as a very basic GUI for your server along with some MAD-specific features. Examples shown below.

###### Disclaimer: This bot might look completely insane and the process it uses at times probably makes no sense but it almost always gets the damn job done, sometimes in a blaze of glory. **MADGRUBER!!!**

Join the Discord server for any help and to keep up with updates: https://discord.gg/USxvyB9QTz


**Current Features:**
- PM2 controller (start/stop/restart + current status)
- Truncate MAD quests and auto reload MAD processes
- Automated quest rescanning
- Convert MAD geofences to other formats
- Custom SQL queries
- Run custom scripts with optional variables
- Quickly access URL bookmarks
- Reaction role manager
- Limit commands to only certain roles
- Optional slash commands available
- Options to verify certain actions first
- See current status of MAD devices (as buttons)
- Click device buttons to get basic info
- Command to check for only devices that haven't been seen lately (automated checks optional)
- RaspberryRelay integration to automatically power cycle noProto devices
- dkmur's deviceControl integration (Pause/unpause/start/quit/reboot/clear data/logcat/screenshot/power cycle/send worker)
- dkmur's Stats integration (expanded device info/graphs for different device and system stats)

  
  
   
## Requirements
1: Node 16+ installed on server

2: Discord bot with:
  - Server Members Intent
  - Message Content Intent
  - Read/write perms in channels
  - Manage Roles perm (if using role feature)

 
  
  
## Install
```
git clone https://github.com/RagingRectangle/MadGruber.git
cd MadGruber
cp -r config.example config
npm install
```

 
  

## Optional Projects to Install
- [RaspberryRelay](https://github.com/RagingRectangle/RaspberryRelay)
- [deviceControl by dkmur](https://github.com/dkmur/deviceControl)
- [Stats by dkmur](https://github.com/dkmur/Stats)

 
  

## Config Setup
- **serverName:** Custom name for your server.
- **delaySeconds:** If used on multiple servers you can use this to make sure the bot always responds in a specific order.

Discord:
- **token:** Discord bot token.
- **prefix:** Used in front of Discord commands.
- **adminIDs:** List of Discord user IDs that can execute all commands.
- **channelIDs:** List of channel IDs that the bot will respond in. Does not work with DMs to the bot
- **useSlashCommands:** Whether or not to register slash commands in guilds (true/false).
    - Currently available: `helpCommand`, `pm2Command`, `truncateCommand`, `madQueryCommand`, `linksCommand`, `devicesCommand`, `noProtoCommand`, `eventsCommand`, `systemStatsCommand`, `sendWorkerCommand`, `grepCommand`, `geofenceCommand`
    - [Bot must have applications.commands scope](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#creating-and-using-your-invite-link)
- **slashGuildIDs:** List of guild IDs where commands should be registered.
- **helpCommand:** Show correct syntax and what perms the user has.
- **pm2Command:** Show the PM2 controller.
- **truncateCommand:** Truncate quests and restart MAD instances.
- **scriptCommand:** Show the list of scripts.
- **queryCommand:** Show custom query list.
- **linksCommand:** Show list of bookmarks.
- **devicesCommand:** Get status of all devices.
- **noProtoCommand:** Get noProto devices.
- **systemStatsCommand:** See system stat options (if using dkmur's Stats).
- **sendWorkerCommand:** Send closest worker to a location. `!sendworker lat,lon` (if using dkmur's deviceControl).
- **eventsCommand:** View list of quest reroll events if enabled.
- **grepCommand:** Search uploaded file for string and return the lines where it's included (Only slash command).
- **geofenceCommand:** Convert MAD geofences to other formats to be used in other scanner projects (admins only). GeoJSON and "SimpleJSON" (geo.jasparke) formats. MAD geofences with multiple sections will be separated into their own areas with random colors. Best usage is for something like adding new Poracle area. Draw fence in MADmin, run command, copy/paste section into config file.

PM2:
- **mads:** List of MAD PM2 processes that should be restarted after truncating quests.
- **ignore:** List of PM2 processes/modules to ignore if you don't want buttons for them.
- **pm2ResponseDeleteSeconds:** How long to wait until pm2 response is deleted (Set to 0 to never delete).

Roles:
- **sendRoleMessage:** Whether or not to send role added/removed messages (true/false).
- **roleMessageDeleteSeconds:** How long to wait until role message is deleted (Set to 0 to never delete).
- **commandPermRoles:** List of command types and the role IDs that are allowed to use them (deviceInfo: users can only see info, deviceInfoControl: users can both see and control devices).

Truncate:
- **truncateVerify:** Whether or not to verify table truncate (true/false).
- **truncateOptions:** List of tables to list as options to truncate. Can truncate multiple tables at once by combining them with '+'. Example: *["trs_quest", "pokemon", "trs_quest+pokemon"]*
- **truncateQuestsByArea:** Select instance Pokestop areas to truncate instead of entire trs_quest table (true/false).
- **onlyRestartBeforeTime:** Set this to limit when the bot will reload MAD instance (0-23). If set to 0 it will always reload MADs. If an event ends at 20:00 and you don't need to reload MAD because you won't rescan quests then enter "20".
- **eventAutomation:** Whether or not to use Discord events to automate quest truncating (true/false).
- **eventGuildID:** ID of the guild where events are located.
- **eventDescriptionTrigger:** The trigger word/s that must be in the event description to automate truncating.
- **eventAlertChannelID:** ID of the channel where automated alert will be posted. Footer will show whether or not quest truncated and MAD restarted successfully.
- **eventAlertDeleteSeconds:** How long to wait until event alert is deleted (Set to 0 to never delete).

Scripts:
- **scriptVerify:** Whether or not to verify running script (true/false).
- **scriptResponseDeleteSeconds:** How long to wait until script response is deleted (Set to 0 to never delete).

madDB:
- Enter your basic MAD database info. Make sure your user has access if the database is not local. Leave blank if you don't plan on connecting to MAD.
- **timezoneDifference:** Timezone offset of MAD in hours. ONLY if MAD and the database are set to different timezones.

Devices:
- **noProtoMinutes:** Limit for how long it's been since the device has been heard from.
- **noProtoCheckMinutes:** Automate checks for unseen devices (Set to 0 to disable auto-check).
- **noProtoChannelID:** Channel ID for where automated warning should be posted.
- **noProtoIncludeIdle:** Include paused and idle devices in automated checks (false to ignore).
- **noProtoIgnoreDevices:** Array of devices to be ignored during noProto checks.
- **useNoProtoJson:**  Use noProto.json to split which channels noProto device alerts are sent to (true/false). If 'noProtoChannelID' is set then that will be the default channel for any devices not listed in noProto.json.
- **checkDeleteMinutes:** How long to wait until auto check messages are deleted (Set to 0 to never delete).
- **infoMessageDeleteSeconds:** How long to wait until device info responses are deleted (Set to 0 to never delete).
- **statusButtonsDeleteMinutes:** How long to wait until messages with device buttons are deleted (Set to 0 to never delete).
- **buttonLabelRemove:** List of strings to ignore when posting device buttons. Button rows can look [crappy](https://media.discordapp.net/attachments/923445551595401316/933223709265764442/MadGruber_DeviceName_Differences.png) on mobile so this can help.
- **displayOptions:** Customize what info is displayed for devices (true/false).

DeviceControl:
- [Install info](https://github.com/dkmur/deviceControl)
- **path:** Path to root folder.
- **controlResponseDeleteSeconds:** How long to wait until script responses are deleted (Set to 0 to never delete).
- **logcatDeleteSeconds:** How long to wait until logcats are deleted (Set to 0 to never delete).
- **reverseLogcat:** Reverse logcat output so the most recent entry is on top (true/false).
- **screenshotDeleteSeconds:** How long to wait until screenshots are deleted (Set to 0 to never delete).
- **powerCycleType:** Set to "deviceControl" if using deviceControl to power cycle your devices. Set to "raspberry" if using RaspberryRelay.

Stats:
- [Install info](https://github.com/dkmur/Stats)
- **database:** Basic stats database info.
- **dataPointCount:** How many individual points on graphs for each type.
- **colorPalette:** Colors used for stat graphs. Accepts all common color names. (Default 1:orange, 2:green, 3:navy)
- **graphDeleteSeconds:** How long to wait until graphs are deleted (Set to 0 to never delete).
- **deviceInfo:** Customize what is added to the device info displayed (true/false).

 
  

## Scripts Setup
- Config file: */config/scripts.json*
- Absolute paths must be used in scripts to work. Look in the scripts.example.json to get an idea of how they can work.
- **customName:** Display name in list.
- **adminOnly:** Script level overrides to ignore users with script role (true/false).
- **description:** Short summary shown in list.
- **fullFilePath:** The absolute path to the file.
    - Ex: `/home/mad/devicecontrol.sh`
    - Tip: If the same variables are always passed you can add them to the path.
    - Ex: `/home/mad/devicecontrol.sh poe4 cycle 20`

- **variables:** Make sure each variable is in the correct order because that is how it will be sent with the script.
    - **varDescription:** Summary of this list of variables that will be shown. ("Pick which device" or "Choose the port").
    - **varOptions:** The list of options that this variable can be ("1", "2", "3", "4", "5").

 
  

## Links Setup
- Config file: */config/links.json*
- Add up to 25 links as buttons.
- Emoji field is optional. 
    - Full emoji string `<:mad:475050731032936448>`
    - Unicode form (Get correct form by escaping default emojis: `\😺`).

 
  

## Reaction Role Setup
- Config file: */config/roles.json*
- **messageID:** The ID of the message with the emojis users can select to add/remove roles.
- **roleID:** The ID for the role that can be added/removed.
- **emojiName:** The unicode emoji or the custom emoji name (only the name, NOT full emoji string).

 
  
  
## Custom Query Setup
- Config file: */config/queries.json*
- **name:** Query name to display in lists.
- **query:** The SQL query to run. Multiple statements allowed separated by `;` (Response will show query results in this order). This will __not__ use the `timezoneDifference` config option so any adjustments will need to made in the query itself.



 
  

## Automated Quest Reroll Setup
- Truncate quests and restart MAD (if needed) automatically using Discord's event feature.
- If there are multiple events that start/stop at the same time everything will only be done once.
- If you're OCD like myself and don't like seeing the event icon on the server image, create a throwaway guild and use that.
- How to create events:
  1: Open guild menu and select 'Create Event'
  2: Select 'Somewhere Else' and enter anything for location such as 'PoGo' (will not be used)
  3: Enter a name for the event
  4: Select the start and end times when quests will reroll
  5: Enter the `eventDescriptionTrigger` into the description along with any other info you'd like to include

 
  

## Usage
- Start the bot in a console with `node madgruber.js`
- Can also use PM2 to run it instead with `pm2 start madgruber.js`
- Bot will reply with the PM2 controller message when you send `<prefix><pm2Command>`
  - Press the Reload/Start/Stop buttons and then the processes you'd like to change.
  - Press the Status button to see the current status of processes.
- Bot will truncate and reload MADs when you send `<prefix><truncateCommand>`
- Bot will reply with runnable scripts when sent `<prefix><scriptCommand>`
- Get runnable MAD database queries with `<prefix><madQueryCommand>`
- Get link buttons with `<prefix><linksCommand>`
- Get status of devices as buttons with `<prefix><devicesCommand>`
  - Press device button to get more info.
  - If deviceControl and/or Stats is installed then dropdown lists will appear.
- Get info about specific device with `<prefix><device_name/origin>`
- See any naughty devices with `<prefix><noProtoCommand>`
- See system stats with `<prefix><systemStatsCommand>` (Requires dkmur's Stats)
- Send worker to location with `<prefix><sendWorkerCommand> <lat>,<lon>` (Requires dkmur's Stats)
- Get list of events that will reroll quests with `<prefix><eventsCommand>`
- Search file for string and return lines with it included with `/<grepCommand>` (slash only)
- Convert MAD geofences to other formats with `<prefix><geofenceCommand>`

  
  


## Examples
###### PM2 Controller:
![PM2](https://media.giphy.com/media/NXURwVTS9bdRXHMt49/giphy.gif)
###### Run Custom Scripts:
![Scripts](https://media.giphy.com/media/KVzaguhH4o99CLZs09/giphy.gif)
###### Truncate Tables With Option to Restart MAD:
![Truncate](https://media.giphy.com/media/St6S6xtcMFEbOh9z18/giphy.gif)
###### Get Basic Info About MAD Database:
![Queries](https://media.giphy.com/media/jNplcSy5fUYyci94Fg/giphy.gif)
###### Quick Links:
![Links](https://media.giphy.com/media/Mz1mf6OJyL727WnkGe/giphy.gif)
###### Device Status and Info:
![Links](https://media.giphy.com/media/Vy9Jj0mxnWlvoCjjJX/giphy.gif)
###### DeviceControl Options:
![DeviceControl](https://media.giphy.com/media/Ico3HomI8b1YozLfbM/giphy.gif)
###### Device Stats:
![StatsOptions](https://media.giphy.com/media/MtnvGOZG5dIamf5xqn/giphy.gif)
###### Stats Examples:
![StatsExamples](https://media.giphy.com/media/ddaBKKWjoxyWmruBl6/giphy.gif)