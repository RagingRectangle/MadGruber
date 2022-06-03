const {
   Client,
   Intents,
   MessageEmbed,
   Permissions,
   MessageActionRow,
   MessageAttachment,
   MessageSelectMenu,
   MessageButton
} = require('discord.js');
const fs = require('fs');
const pm2 = require('pm2');
const shell = require('shelljs');
const ansiParser = require("ansi-parser");
const Pm2Buttons = require('./pm2.js');
const Truncate = require('./truncate.js');
const Scripts = require('./scripts.js');
const Queries = require('./queries.js');
const Devices = require('./devices.js');
const DeviceControl = require('./deviceControl.js');
const Stats = require('./stats.js');
const Geofences = require('./geofenceConverter.js');
const config = require('../config/config.json');
const scriptConfig = require('../config/scripts.json');

module.exports = {
   listInteraction: async function listInteraction(interaction, interactionID, userPerms) {
      //Scripts
      if (userPerms.includes('scripts')) {
         if (interactionID === 'scriptList') {
            let intValues = interaction.values[0].replace(`${config.serverName}~startScript~`, '').split('~');
            let scriptName = intValues[0];
            let variableCount = intValues[1] * 1;
            for (var s in scriptConfig) {
               if (scriptName === scriptConfig[s]['customName'] && scriptConfig[s]['fullFilePath']) {
                  Scripts.startScript(interaction, userPerms, scriptConfig[s], scriptName, variableCount);
               }
            }
         } else if (interactionID.startsWith('runScript')) {
            if (interaction.values[0] === `${config.serverName}~cancelScript`) {
               interaction.deferUpdate();
               Scripts.sendScriptList(interaction, 'restart');
            } else {
               Scripts.scriptVariables(interaction, userPerms);
            }
         }
      } //End of Scripts

      //Queries
      if (userPerms.includes('queries')) {
         if (interactionID === 'countList') {
            let table = interaction.values[0].replace(`${config.serverName}~count~`, '');
            interaction.update({});
            Queries.queryCount(interaction.message.channel, interaction.user, table);
         }
      } //End of queries

      //DeviceControl
      if (userPerms.includes('deviceInfoControl')) {
         if (interactionID === 'deviceControl') {
            interaction.deferUpdate();
            DeviceControl.deviceControl(interaction);
         }
      } //End of DeviceControl

      //DeviceStats
      if (userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
         if (interactionID.startsWith('deviceStats~')) {
            interaction.deferUpdate();
            let statVariables = interaction.values[0].replace(`${config.serverName}~deviceStats~`, '').split('~');
            let origin = statVariables[0];
            let statVars = interaction.values[0].replace(`${config.serverName}~deviceStats~${origin}~`, '');
            Stats.deviceStats(interaction, origin, statVars);
         }
      } //End of DeviceStats

      //SystemStats
      if (userPerms.includes('systemStats')) {
         if (interactionID.startsWith('systemStats~')) {
            interaction.deferUpdate();
            let statDuration = interactionID.replace('systemStats~', '');
            Stats.systemStats(interaction.message.channel, interaction.user, statDuration, interaction.values[0].replace(`${config.serverName}~systemStats~`, ''));
         }
      } //End of SystemStats

      //GeofenceConverter
      if (userPerms.includes('admin')) {
         if (interactionID.startsWith('geofenceList~')) {
            interaction.deferUpdate();
            let intValue = interaction.values[0].split('~~');
            Geofences.convert(interaction.message.channel, interaction.user, intValue[0]);
            interaction.message.edit({
               components: interaction.message.components
            }).catch(console.error);
         } //End of GeofenceConverter
      }
   }, //End of listInteraction()


   buttonInteraction: async function buttonInteraction(interaction, interactionID, userPerms) {
      //PM2
      if (userPerms.includes('pm2')) {
         pm2MenuButtons = ["restart", "start", "stop"];
         if (pm2MenuButtons.includes(interactionID)) {
            interaction.deferUpdate();
            Pm2Buttons.pm2MainMenu(interaction, interactionID)
         }
         //Status menu pressed
         else if (interactionID === 'status') {
            interaction.deferUpdate();
            Pm2Buttons.updateStatus(interaction, 'edit');
         }
         //Run PM2 process
         else if (interactionID.startsWith('process~')) {
            interaction.deferUpdate();
            Pm2Buttons.runPM2(interaction.message.channel, interaction.user, interactionID.replace('process~', ''));
         }
      } //End of pm2

      //Scripts
      if (userPerms.includes('scripts')) {
         if (interactionID.startsWith('verifyScript~')) {
            var scriptName = interaction.message.content.replace('Run script: ', '');
            //Check if admin only
            if (interaction.message.content.endsWith('🔒')) {
               scriptName = scriptName.replace('? 🔒', '');
               if (!userPerms.includes('admin')) {
                  console.log(`Non-admin ${interaction.user.username} tried to verify running ${scriptName}`);
                  return;
               }
            } else {
               scriptName = scriptName.slice(0, -1);
            }
            interaction.deferUpdate();
            let runScript = interactionID.replace('verifyScript~', '');
            if (runScript === 'no') {
               Scripts.sendScriptList(interaction, 'restart');
               interaction.message.channel.send({
                     content: '**Did not run script:**',
                     embeds: [new MessageEmbed().setDescription(interaction.message.embeds[0]['description']).setColor('9E0000').setFooter({
                        text: `${interaction.user.username}`
                     })],
                     components: []
                  }).catch(console.error)
                  .then(msg => {
                     setTimeout(() => msg.delete().catch(err => console.log("Error deleting verify script message:", err)), 10000);
                  })
            } //End of no
            else if (runScript === 'yes') {
               let fullBashCommand = interaction.message.embeds[0]['description'];
               interaction.message.edit({
                  content: '**Running script:**',
                  embeds: [new MessageEmbed().setDescription(`\`${fullBashCommand}\``).setColor('0D00CA').setFooter({
                     text: `${interaction.user.username}`
                  })],
                  components: []
               }).catch(console.error);
               try {
                  shell.exec(fullBashCommand, function (exitCode, output) {
                     Scripts.sendScriptList(interaction, "restart");
                     var color = '00841E';
                     var description = `${interaction.message.embeds[0]['description']}\n\n**Response:**\n${ansiParser.removeAnsi(output).replaceAll('c','')}`;
                     if (exitCode !== 0) {
                        color = '9E0000';
                        description = `${interaction.message.embeds[0]['description']}\n\n**Error Response:**\n${ansiParser.removeAnsi(output).replaceAll('c','')}`;
                     }
                     console.log(`${interaction.user.username} ran script: \`${fullBashCommand}\``);
                     interaction.message.channel.send({
                           content: '**Ran script:**',
                           embeds: [new MessageEmbed().setDescription(description).setColor(color).setFooter({
                              text: `${interaction.user.username}`
                           })],
                           components: []
                        }).catch(console.error)
                        .then(msg => {
                           if (config.scripts.scriptResponseDeleteSeconds > 0) {
                              setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting script response message:`, err)), (config.scripts.scriptResponseDeleteSeconds * 1000));
                           }
                        })
                  });
               } catch (err) {
                  console.log(`(${interaction.user.username}) Failed to run script: ${fullBashCommand}:`, err);
                  Scripts.sendScriptList(interaction, "restart");
                  interaction.message.channel.send({
                        embeds: [new MessageEmbed().setTitle('Failed to run script:').setDescription(interaction.message.embeds[0]['description']).setColor('9E0000').setFooter({
                           text: `${interaction.user.username}`
                        })],
                        components: []
                     }).catch(console.error)
                     .then(msg => {
                        if (config.scripts.scriptResponseDeleteSeconds > 0) {
                           setTimeout(() => msg.delete().catch(err => console.log("Error deleting script response message:", err)), (config.scripts.scriptResponseDeleteSeconds * 1000));
                        }
                     })
               }
            } //End of yes
         }
      } //End of scripts

      //Truncate
      if (userPerms.includes('truncate')) {
         //Verify truncate
         if (interactionID.startsWith('verifyTruncate~')) {
            interaction.deferUpdate();
            let verify = interactionID.replace('verifyTruncate~', '');
            if (verify === 'no') {
               interaction.message.edit({
                  embeds: [new MessageEmbed().setTitle('Did not truncate:').setDescription(interaction.message.embeds[0]['description']).setColor('9E0000').setFooter({
                     text: `${interaction.user.username}`
                  })],
                  components: []
               }).catch(console.error);
               setTimeout(() => interaction.message.delete().catch(err => console.log("Error deleting verify truncate message:", err)), 10000);
            } //End of no
            else if (verify === 'yes') {
               let tables = interaction.message.embeds[0]['description'].split('\n');
               Truncate.truncateTables(interaction.message, interaction.user, tables);
            } //End of yes
         } //End of verify truncate

         //Run truncate
         if (interactionID.startsWith('truncate~')) {
            interaction.deferUpdate();
            let buttonTables = interactionID.replace('truncate~', '');
            let tables = buttonTables.split('+');
            if (buttonTables === '!CANCEL!') {
               setTimeout(() => interaction.message.delete().catch(err => console.log("Error deleting truncate message:", err)), 1);
            } else {
               if (config.truncate.truncateVerify === false) {
                  Truncate.truncateTables(interaction.message, interaction.user, tables);
               } else {
                  Truncate.verifyTruncate(interaction.message.channel, interaction.user, tables);
               }
            }
         } //End of run truncate
      } //End of truncate

      //Devices
      if (userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
         if (interactionID.startsWith('deviceInfo~')) {
            interaction.deferUpdate();
            let deviceID = interactionID.replace('deviceInfo~', '');
            Devices.getDeviceInfo(interaction.message.channel, interaction.user, deviceID);
         }
      } //End of devices
   }, //End of buttonInteraction()
}