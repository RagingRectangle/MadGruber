const {
   Client,
   Intents,
   MessageEmbed,
   Permissions,
   MessageActionRow,
   MessageSelectMenu,
   MessageButton
} = require('discord.js');
const Roles = require('./roles.js');
const config = require('../config/config.json');

module.exports = {
   helpMenu: async function helpMenu(client, receivedMessage) {
      let commands = config.discord;
      let prefix = config.discord.prefix;
      var pm2 = truncate = scripts = queries = links = devices = systemStats = sendWorker = events = 'N/A';
      if (commands.pm2Command) {
         pm2 = `${prefix}${commands.pm2Command}`;
      }
      if (commands.truncateCommand) {
         truncate = `${prefix}${commands.truncateCommand}`;
      }
      if (commands.scriptCommand) {
         scripts = `${prefix}${commands.scriptCommand}`;
      }
      if (commands.madQueryCommand) {
         queries = `${prefix}${commands.madQueryCommand}`;
      }
      if (commands.linksCommand) {
         links = `${prefix}${commands.linksCommand}`;
      }
      if (commands.devicesCommand) {
         devices = `${prefix}${commands.devicesCommand}`;
      }
      if (commands.noProtoCommand) {
         noProto = `${prefix}${commands.noProtoCommand}`;
      }
      if (commands.systemStatsCommand) {
         systemStats = `${prefix}${commands.systemStatsCommand}`;
      }
      if (commands.sendWorkerCommand) {
         sendWorker = `${prefix}${commands.sendWorkerCommand}`;
      }
      if (commands.eventsCommand) {
         events = `${prefix}${commands.eventsCommand}`;
      }
      let userPerms = await Roles.getUserCommandPerms(receivedMessage.channel.type, receivedMessage.guild, receivedMessage.author);
      let authorName = receivedMessage.author.username;
      var allowedCommands = `**${authorName} Permissions:**\n- ${userPerms.join('\n- ')}`;
      if (userPerms.length == 0) {
         allowedCommands = `**${authorName} Permissions:**\n- None`;
      }
      var description = `**Command Syntax:**\n- PM2: \`${pm2}\`\n- Truncate: \`${truncate}\`\n- Scripts: \`${scripts}\`\n- Queries: \`${queries}\`\n- Links: \`${links}\`\n- Devices: \`${devices}\`\n- Stats: \`${systemStats}\`\n- Send Worker: \`${sendWorker}\`\n- Events: \`${events}\`\n\n${allowedCommands}`;
      receivedMessage.channel.send({
         embeds: [new MessageEmbed().setTitle("MadGruber Help Menu").setURL("https://github.com/RagingRectangle/MadGruber").setDescription(description)]
      }).catch(console.error);
   } //End of helpMenu()
}