const {
   Client,
   GatewayIntentBits,
   Partials,
   Collection,
   Permissions,
   ActionRowBuilder,
   SelectMenuBuilder,
   MessageButton,
   AttachmentBuilder,
   EmbedBuilder,
   ButtonBuilder,
   InteractionType,
   ChannelType
} = require('discord.js');
const fs = require('fs');
const mysql = require('mysql');
const shell = require('shelljs');
const lineReader = require('reverse-line-reader');
const config = require('../config/config.json');

module.exports = {
   deviceControl: async function deviceControl(interaction) {
      let controlVariables = interaction.values[0].replace(`${config.serverName}~deviceControl~`, '').split('~');
      let origin = controlVariables[0];
      let controlType = controlVariables[1];
      if (interaction.values[0].startsWith('raspberryRelay~') && config.deviceControl.powerCycleType.toLowerCase().replace(' ', '').replace('raspberryrelay', 'raspberry')) {
         return;
      }
      let dcPath = (`${config.deviceControl.path}/devicecontrol.sh`).replace('//', '/');
      let bashControlCommand = (`bash ${dcPath} ${origin} ${controlType}`).replace('//', '/');
      interaction.message.edit({
         embeds: interaction.embeds,
         components: interaction.components
      }).catch(console.error);
      interaction.message.channel.send({
            content: '**Running deviceControl script:**',
            embeds: [new EmbedBuilder().setDescription(`\`${bashControlCommand}\``).setColor('0D00CA').setFooter({
               text: `${interaction.user.username}`
            })]
         }).catch(console.error)
         .then(async msg => {
            let logFile = [];
            shell.exec(bashControlCommand, async function (exitCode, output) {
               var color = '00841E';
               var description = `${origin} ${controlType}`;
               if (exitCode !== 0) {
                  color = '9E0000';
                  description = `**${origin} ${controlType} failed**\n\n**Error Response:**\n${output}`;
                  console.log(`${interaction.user.username} failed to run devicecontrol.sh ${origin} ${controlType}`);
               } else {
                  console.log(`${interaction.user.username} ran devicecontrol.sh ${origin} ${controlType}`);
                  if (controlType === 'pauseDevice' || controlType === 'unpauseDevice') {
                     changeIdleStatus(origin, controlType);
                  }
               }
               if (controlType === 'logcatDevice') {
                  try {
                     fs.renameSync('./logcat.txt', `logcat_${origin}.txt`);
                     if (config.deviceControl.reverseLogcat === true) {
                        var reverseLog = [];
                        await lineReader.eachLine(`logcat_${origin}.txt`, async function (line, last) {
                           reverseLog.push(line);
                           if (last === true) {
                              fs.writeFileSync(`logcat_${origin}.txt`, reverseLog.join('\n'));
                           }
                        });
                     }
                     logFile.push(await new AttachmentBuilder(fs.readFileSync(`logcat_${origin}.txt`), {name: `logcat_${origin}.txt`}));
                  } catch (err) {
                     console.log(`Error renaming logcat.txt to "logcat_${origin}.txt":`, err)
                  }
                  try {
                     fs.renameSync('./vm.log', `vm_${origin}.log`);
                     if (config.deviceControl.reverseLogcat === true) {
                        var reverseLog = [];
                        await lineReader.eachLine(`vm_${origin}.log`, async function (line, last) {
                           reverseLog.push(line);
                           if (last === true) {
                              fs.writeFileSync(`vm_${origin}.log`, reverseLog.join('\n'));
                           }
                        });
                     }
                     logFile.push(await new AttachmentBuilder(fs.readFileSync(`vm_${origin}.log`), {name: `vm_${origin}.log`}));
                  } catch (err) {}
                  try {
                     fs.renameSync('./vmapper.log', `vmapper_${origin}.log`);
                     if (config.deviceControl.reverseLogcat === true) {
                        var reverseLog = [];
                        await lineReader.eachLine(`vmapper_${origin}.log`, async function (line, last) {
                           reverseLog.push(line);
                           if (last === true) {
                              fs.writeFileSync(`vmapper_${origin}.log`, reverseLog.join('\n'));
                           }
                        });
                     }
                     logFile.push(await new AttachmentBuilder(fs.readFileSync(`vmapper_${origin}.log`), {name: `vmapper_${origin}.log`}));
                  } catch (err) {}
               }
               if (controlType === 'screenshot') {
                  try {
                     fs.renameSync('./screenshot.jpg', `screenshot_${origin}.jpg`);
                     logFile.push(await new AttachmentBuilder(fs.readFileSync(`screenshot_${origin}.jpg`), {name: `screenshot_${origin}.jpg`}));
                  } catch (err) {
                     console.log(`Error renaming screenshot.jpg to "screenshot_${origin}.jpg":`, err);
                  }
               }
               msg.edit({
                  content: '**Ran deviceControl script:**',
                  embeds: [new EmbedBuilder().setDescription(description).setColor(color).setFooter({
                     text: `${interaction.user.username}`
                  })],
               }).catch(console.error);
               if (controlType === 'logcatDevice' && exitCode !== 1) {
                  logFile.forEach(async file => {
                     interaction.message.channel.send({
                           files: [file]
                        }).catch(console.error)
                        .then(logcatMsg => {
                           if (config.deviceControl.logcatDeleteSeconds > 0) {
                              setTimeout(() => logcatMsg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting logcat message:`, err)), (config.deviceControl.logcatDeleteSeconds * 1000));
                           }
                        })
                        .then(() => {
                           try {
                              fs.rmSync(file.attachment);
                           } catch (err) {}
                        })
                  })
               }
               if (controlType === 'screenshot' && exitCode !== 1) {
                  interaction.message.channel.send({
                        files: logFile
                     }).catch(console.error)
                     .then(logcatMsg => {
                        if (config.deviceControl.screenshotDeleteSeconds > 0) {
                           setTimeout(() => logcatMsg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting screenshot message:`, err)), (config.deviceControl.screenshotDeleteSeconds * 1000));
                        }
                     })
                     .then(() => {
                        fs.rmSync(`screenshot_${origin}.jpg`);
                     });
               }
               if (config.deviceControl.controlResponseDeleteSeconds > 0) {
                  setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting deviceControl message:`, err)), (config.deviceControl.controlResponseDeleteSeconds * 1000));
               }
            }) //End of shell.exec()
         }); //End of msg()

      async function changeIdleStatus(origin, controlType) {
         let dbInfo = require('../MAD_Database_Info.json');
         for (const [key, value] of Object.entries(dbInfo.devices)) {
            if (value.name === origin) {
               var status = 0;
               if (controlType === 'pauseDevice') {
                  status = 1;
               }
               let idleQuery = `UPDATE trs_status SET idle = ${status} WHERE device_id = ${key}`;
               let connectionIdle = mysql.createConnection(config.madDB);
               connectionIdle.query(idleQuery, function (err, statusResults) {
                  if (err) {
                     console.log(`Error manually updating idle status for ${origin} ${controlType}:`, err);
                  } else {
                     if (statusResults['changedRows'] == 1) {
                        //Seems like only errors should be logged for this?
                        //console.log(`Manually updated idle status for ${origin} ${statusResults}`);
                     }
                  }
               }); //End of query
               connectionIdle.end();
            }
         }
      } //End of changeIdleStatus()
   }, //End of deviceControl()


   sendWorker: async function sendWorker(client, channel, user, content) {
      console.log("start sendWorker");
      let coords = content.toLowerCase().replace(`${config.discord.prefix}${config.discord.sendWorkerCommand.toLowerCase()} `, '').replace(', ', '').replace('- ', '-');
      let dcPath = (`${config.deviceControl.path}/devicecontrol.sh`).replace('//', '/');
      let sendWorkerBash = `bash ${dcPath} origin sendWorker ${coords}`;
      channel.send({
            embeds: [new EmbedBuilder().setDescription(`Sending closest worker...`).setColor('0D00CA').setFooter({
               text: `${user.username}`
            })]
         }).catch(console.error)
         .then(async msg => {
            shell.exec(sendWorkerBash, async function (exitCode, output) {
               let splitOutput = output.split('  ');
               let response = splitOutput[1];
               if (exitCode !== 0) {
                  console.log(`${user.username} failed to send worker to: ${coords}`);
                  msg.edit({
                     embeds: [new EmbedBuilder().setDescription(`Error sending worker:\n\n${output}`).setColor('9E0000').setFooter({
                        text: `${user.username}`
                     })],
                  }).catch(console.error);
               } else {
                  console.log(`(${user.username}) ${response}`);
                  msg.edit({
                     embeds: [new EmbedBuilder().setDescription(response.replace(coords, `[${coords}](https://www.google.com/maps/search/?api=1&query=${coords})`)).setColor('00841E').setFooter({
                        text: `${user.username}`
                     })],
                  }).catch(console.error);
               }
               if (config.deviceControl.controlResponseDeleteSeconds > 0) {
                  setTimeout(() => msg.delete().catch(err => console.log(`(${user.username}) Error deleting sendWorker message:`, err)), (config.deviceControl.controlResponseDeleteSeconds * 1000));
               }
            }) //End of shell
         });
   } //End of sendWorker()
}