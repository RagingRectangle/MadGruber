# MadGruber Bot

## About
A Discord bot used as a very basic GUI for your server along with some MAD-specific features. Examples shown below.

###### Disclaimer: I'm expecting some bumps along the way as more people test it with different setups. I only have very basic bashing knowledge so I know the scripting stuff could use some upgrading. The bot might look completely incompetent and the process it uses at times probably makes no sense but it almost always gets the damn job done, sometimes in a blaze of glory. **MADGRUBER!!!**


**Current Features:**
- PM2 controller (start/stop/restart + current status)
- Truncate MAD quests and auto reload MAD processes
- MAD DB counter (more queries later)
- Run custom scripts with optional variables

 
  
  
   
## Requirements
1: Node 16+ installed on server

2: Discord bot with:
  - Server Members Intent
  - Message Content Intent
  - Read/write perms in channels

 
  
  
## Install
```
git clone https://github.com/RagingRectangle/MadGruber.git
cd MadGruber
cp -r config.example config
npm install
```

 
  

## Config Setup
- **serverName:** Custom name for your server.
- **delaySeconds:** If used on multiple servers you can use this to make sure the bot always responds in a specific order.

Discord:
- **token:** Discord bot token.
- **prefix:** Used in front of Discord commands.
- **adminIDs:** List of Discord user IDs that can execute commands or push buttons.
- **channelIDs:** List of channel IDs that the bot will respond in. Will also respond to DMs if they are admins.
- **pm2Command:** Command to show the PM2 controller.
- **truncateCommand:** Command to truncate quests and restart MAD instances.
- **scriptCommand:** Command to show the list of scripts.
- **madQueryCommand:** Command to show MAD database queries.

PM2:
- **mads:** List of MAD PM2 processes that should be restarted after truncating quests.
- **ignore:** List of PM2 processes/modules to ignore if you don't want buttons for them.

madDB:
- Enter your basic MAD database info. Make sure your user has access if the database is not local.  Leave blank if you don't plan on using the truncate quest feature.
- **onlyReloadBeforeTime:** Set this to limit when the bot will reload MAD instance (0-23).  If left blank it will always reload MADs.  If an event ends at 20:00 and you don't need to reload MAD because you won't rescan quests then enter "20".

 
  
  
## Queries Setup
- The bot is currently only able to run a simple count query to a selection of tables in the MAD database.  
- More query options will be added later.

 
  

## Script Setup
- Absolute paths must be used in scripts to work. Look in the scripts.example.json to get a better feel for how they work.
- **customName:** Display name
- **description:** Short summary of what it does
- **fullFilePath:** The absolute path to the file
    - Ex: `/home/mad/devicecontrol.sh`
    - Tip: If the same variables are always passed you can add them to the path
    - Ex: `/home/mad/devicecontrol.sh poe4 cycle 20`

- **variables:** Make sure each variable is in the correct order because that is how it will be sent with the script
    - **varDescription:** Summary of this list of variables that will be shown.  ("Pick which device" or "Choose the port")
    - **varOptions:** The list of options that this variable can be ("1", "2", "3", "4", "5")



## Usage
- Start the bot in a console with `node madgruber.js`
- Can also use PM2 to run it instead with `pm2 start madgruber.js`
- Bot will reply with the PM2 controller message when you send `<prefix><pm2Command>`
  - Press the Reload/Start/Stop buttons and then the processes you'd like to change
  - Press the Status button to see the current status of processes
- Bot will truncate and reload MADs when you send `<prefix><truncateCommand>`
- Bot will reply with runnable scripts when sent `<prefix><scriptCommand>`. Then follow prompts
- Get runnable MAD database queries with `<prefix><madQueryCommand>`

 
  
  


## Examples
![PM2](https://media.giphy.com/media/TeMTI75XDhZpZDMtLs/giphy.gif)

![Truncate](https://media.giphy.com/media/xVjk0zxSVTvNcQ7CQI/giphy.gif)

![Queries](https://media.giphy.com/media/qfQGzrKjv8C5IvvJX8/giphy.gif)

![Scripts](https://media.giphy.com/media/Ip1imTASukmpyt0489/giphy.gif)