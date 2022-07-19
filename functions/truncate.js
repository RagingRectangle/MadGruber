const {
   Client,
   GatewayIntentBits,
   Partials,
   Collection,
   Permissions,
   ActionRowBuilder,
   SelectMenuBuilder,
   MessageButton,
   EmbedBuilder,
   ButtonBuilder,
   ButtonStyle,
   InteractionType,
   ChannelType
} = require('discord.js');
const {
   insidePolygon
} = require('geolocation-utils');
const mysql = require('mysql2');
const pm2 = require('pm2');
const fs = require('fs');
const config = require('../config/config.json');
const dbInfo = require('../MAD_Database_Info.json');

module.exports = {
   sendTruncateMessage: async function sendTruncateMessage(channel) {
      let truncateTableList = config.truncate.truncateOptions;
      var buttonList = [];
      if (truncateTableList.length === 0) {
         channel.send('No tables are set in config.').catch(console.error);
         return;
      }
      if (truncateTableList.length > 24) {
         console.log("ERROR: Max number of truncate options is 24");
         channel.send("ERROR: Max number of truncate options is 24").catch(console.error);
         return;
      }
      for (var t in truncateTableList) {
         let tableLabel = truncateTableList[t].replace(/\+/g, " + ");
         let buttonID = `${config.serverName}~truncate~${truncateTableList[t].toLowerCase()}`;
         let button = new ButtonBuilder().setCustomId(buttonID).setLabel(tableLabel).setStyle(ButtonStyle.Primary);
         buttonList.push(button);
      } //End of t loop
      let cancelButton = new ButtonBuilder().setCustomId(`${config.serverName}~truncate~!CANCEL!`).setLabel('Cancel').setStyle(ButtonStyle.Danger);
      buttonList.push(cancelButton);
      var buttonsNeeded = buttonList.length;
      let rowsNeeded = Math.ceil(buttonList.length / 5);
      var buttonCount = 0;
      var messageComponents = [];
      for (var n = 0; n < rowsNeeded && n < 5; n++) {
         var buttonRow = new ActionRowBuilder()
         for (var r = 0; r < 5; r++) {
            if (buttonCount < buttonsNeeded) {
               buttonRow.addComponents(buttonList[buttonCount]);
               buttonCount++;
            }
         } //End of r loop
         messageComponents.push(buttonRow);
      } //End of n loop
      channel.send({
         content: `**Truncate Table:**`,
         components: messageComponents
      }).catch(console.error);
   }, //End of sendTruncateMessage()

   truncateTables: async function truncateTables(msg, user, tables) {
      let connection = mysql.createConnection(config.madDB);
      connection.connect();
      msg.edit({
         embeds: [new EmbedBuilder().setTitle('Truncate Results:').setDescription('**Truncating...**')],
         components: []
      }).catch(console.error);
      var good = [];
      var bad = [];
      var restartMAD = false;
      for (var t in tables) {
         if (tables[t] === 'trs_quest' && config.truncate.truncateQuestsByArea === true) {
            module.exports.areaQuestsMain(msg.channel, user);
            continue;
         }
         let truncateQuery = `TRUNCATE ${tables[t]}`;
         connection.query(truncateQuery, function (err, results) {
            if (err) {
               console.log(`(${user.username}) Error truncating ${config.madDB.database}.${tables[t]}:`, err);
               bad.push(tables[t]);
            } else {
               console.log(`${config.madDB.database}.${tables[t]} truncated by ${user.username}`);
               good.push(tables[t]);
               if (tables[t] === 'trs_quest' && config.pm2.mads.length > 0) {
                  let date = new Date();
                  let hour = date.getHours();
                  var onlyRestartTime = 0;
                  if (config.truncate.onlyRestartBeforeTime !== '') {
                     onlyRestartTime = config.truncate.onlyRestartBeforeTime * 1;
                  }
                  if (onlyRestartTime == 0 || hour < config.truncate.onlyRestartBeforeTime) {
                     restartMAD = true;
                  }
               }
            }
         });
         await new Promise(done => setTimeout(done, 5000));
      } //End of t loop
      connection.end();
      if (good.length == 0 && bad.length == 0) {
         return;
      }
      var color = '00841E';
      var description = `Successful:\n- ${good.join('\n- ')}`;
      if (good.length == 0) {
         description = '';
      }
      if (bad.length > 0) {
         color = '9E0000';
         description = description.concat(`\n\nFailed:\n- ${bad.join('\n- ')}`);
      }
      msg.edit({
         embeds: [new EmbedBuilder().setTitle('Truncate Results:').setDescription(description).setColor(color).setFooter({
            text: `${user.username}`
         })],
         components: []
      }).catch(console.error);
      if (restartMAD === true) {
         module.exports.restartMADs(msg, user, description, color);
      }
   }, //End of truncateTables()


   verifyTruncate: async function verifyTruncate(channel, user, tables) {
      let optionRow = new ActionRowBuilder().addComponents(
         new ButtonBuilder().setCustomId(`${config.serverName}~verifyTruncate~yes`).setLabel(`Yes`).setStyle(ButtonStyle.Success),
         new ButtonBuilder().setCustomId(`${config.serverName}~verifyTruncate~no`).setLabel(`No`).setStyle(ButtonStyle.Danger)
      );
      var tableList = [];
      for (var t in tables) {
         if (tables[t] === 'trs_quest' && config.truncate.truncateQuestsByArea === true) {
            module.exports.areaQuestsMain(channel, user);
         } else {
            tableList.push(tables[t]);
         }
      }
      if (tableList.length == 0) {
         return;
      }
      var title = 'Truncate the following table?';
      if (tableList.length > 1) {
         title = 'Truncate the following tables?';
      }
      channel.send({
         embeds: [new EmbedBuilder().setTitle(title).setDescription(tableList.join('\n')).setColor('0D00CA')],
         components: [optionRow]
      }).catch(console.error);
   }, //End of verifyTruncate()


   restartMADs: async function restartMADs(msg, user, description, color) {
      msg.edit({
         embeds: [new EmbedBuilder().setTitle('Truncate Results:').setDescription(`${description}\n\n**Restarting MADs...**`).setColor(color)],
         components: []
      }).catch(console.error);
      let mads = config.pm2.mads;
      var good = [];
      var bad = [];
      await pm2.connect(async function (err) {
         if (err) {
            console.error(err);
         } else {
            for (m in mads) {
               let processName = mads[m];
               pm2.restart(processName, (err, response) => {
                  if (err) {
                     console.error(`(${user.username}) PM2 ${mads[m]} restart error:`, err);
                     bad.push(mads[m]);
                  } else {
                     console.log(`${mads[m]} restarted by ${user.username}`);
                     good.push(mads[m]);
                  }
               }) //End of pm2.restart
               await new Promise(done => setTimeout(done, 5000));
            } //End of m loop
         }
      }) //End of pm2.connect
      await new Promise(done => setTimeout(done, 5000 * mads.length + 1000));
      pm2.disconnect();
      color = '00841E';
      var newDescription = `${description}\n\n**MAD Restart Results:**\nSuccessful:\n- ${good.join('\n- ')}`;
      if (good.length == 0) {
         newDescription = newDescription.concat(`None!`);
      }
      if (bad.length > 0) {
         color = '9E0000';
         newDescription = newDescription.concat(`\n\nFailed:\n- ${bad.join('\n- ')}`);
      }
      msg.edit({
         embeds: [new EmbedBuilder().setTitle('Truncate Results:').setDescription(newDescription).setColor(color).setFooter({
            text: `${user.username}`
         })],
         components: []
      }).catch(console.error);
   }, //End of restartMADs()


   areaQuestsMain: async function areaQuestsMain(channel, user) {
      var madDB = config.madDB;
      madDB.multipleStatements = true;
      var connection = mysql.createConnection(madDB);
      let areaListQuery = `SELECT a.name "area", b.name "instance" FROM settings_area a, madmin_instance b WHERE a.mode = "pokestops" AND a.instance_id = b.instance_id;`;

      connection.query(areaListQuery, function (err, results) {
         if (err) {
            console.log(err);
            channel.send(`Error selecting areas from database, check console for more info.`);
            connection.end();
            return;
         } else {
            connection.end();
            if (results.length > 0) {
               groupAreas(results);
            }
         }
      }); //End of connection

      async function groupAreas(areaResults) {
         var instanceAreas = {};
         for (const [key, instance] of Object.entries(dbInfo.instances)) {
            var areaList = [];
            for (var a in areaResults) {
               if (areaResults[a]['instance'] === instance) {
                  areaList.push(areaResults[a]['area']);
               }
            } //End of a loop
            if (areaList.length > 0) {
               areaList.sort();
               instanceAreas[instance] = areaList;
            }
         } //End of instances

         //Create message for each instance
         var selectMenuList = [];
         for (const [instance, areaList] of Object.entries(instanceAreas)) {
            var selectMenu = await new SelectMenuBuilder()
               .setCustomId(`${config.serverName}~truncateArea~${instance}`)
               .setPlaceholder(`${instance} areas`)
               .setMinValues(1)

            if (config.truncate.truncateVerify === true) {
               selectMenu.setCustomId(`${config.serverName}~truncateArea~${instance}`)
            }
            var listOptions = [];
            for (var a = 0; a < areaList.length && a < 25; a++) {
               listOptions.push({
                  label: areaList[a],
                  value: `${areaList[a]}`
               });
            } //End of a loop
            selectMenu.options = listOptions;
            selectMenuList.push(await new ActionRowBuilder().addComponents(selectMenu));
         } //End of instanceAreas loop
         groupInstanceLists(selectMenuList);
      } //End of groupAreas()

      async function groupInstanceLists(selectMenuList) {
         var messagesNeeded = Math.ceil(selectMenuList.length / 5);
         var listNumber = 0;
         for (var m = 0; m < messagesNeeded; m++) {
            var currentLists = [];
            for (var i = 0; i < 5 && listNumber < selectMenuList.length; i++) {
               currentLists.push(selectMenuList[listNumber]);
               listNumber++;
            } //End of i loop
            if (m == 0) {
               channel.send({
                  content: `**Select quest areas to truncate:**`,
                  components: currentLists
               }).catch(console.error);
            } else {
               channel.send({
                  components: currentLists
               }).catch(console.error);
            }
         } //End of m loop
      } //End of groupInstanceLists()
   }, //End of areaQuestsMain()


   verifyAreaQuests: async function verifyAreaQuests(channel, user, instanceName, areaList) {
      let optionRow = new ActionRowBuilder().addComponents(
         new ButtonBuilder().setCustomId(`${config.serverName}~verifyAreaQuests~${instanceName}~yes`).setLabel(`Yes`).setStyle(ButtonStyle.Success),
         new ButtonBuilder().setCustomId(`${config.serverName}~verifyAreaQuests~${instanceName}~no`).setLabel(`No`).setStyle(ButtonStyle.Danger)
      );
      var title = 'Truncate Quests From Area?';
      if (areaList.length > 1) {
         title = 'Truncate Quests From Areas?';
      }
      channel.send({
         embeds: [new EmbedBuilder().setTitle(title).setDescription(areaList.join('\n')).setColor('0D00CA')],
         components: [optionRow]
      }).catch(console.error);
   }, //End of verifyAreaQuests


   collectAreaQuests: async function collectAreaQuests(channel, user, instanceName, areaList) {
      console.log(`Quests truncated by ${user.username} in: ${areaList.join(', ')}`);
      var queryList = [];
      for (var a in areaList) {
         queryList.push(`SELECT c.fence_data "geofence" FROM settings_area a, settings_area_pokestops b, settings_geofence c, madmin_instance d WHERE a.area_id = b.area_id AND b.geofence_included = c.geofence_id AND c.instance_id = d.instance_id AND a.name = "${areaList[a]}" and d.name = "${instanceName}";`);
      } //End of a loop
      var madDB = config.madDB;
      madDB.multipleStatements = true;
      var connection = mysql.createConnection(madDB);
      connection.query(queryList.join(' '), async function (err, results) {
         if (err || results.length == 0) {
            console.log(err);
            channel.send(`Error truncating area quests. Check console for more info.`);
            connection.end();
            return;
         } else {
            connection.end();
            var geoList = [];
            if (areaList.length == 1) {
               geoList.push(results[0]);
            } else {
               for (var a = 0; a < areaList.length; a++) {
                  geoList.push(results[a][0]);
               }
            }
            convertGeofences(geoList);
         }
      }); //End of connection

      async function convertGeofences(madGeofenceList) {
         var geofenceList = [];
         for (var m in madGeofenceList) {
            let geofenceData = JSON.parse(madGeofenceList[m]['geofence']);
            var currentGeofence = [];
            for (var g in geofenceData) {
               //Has sub geofences
               if (geofenceData[g].startsWith('[')) {
                  if (currentGeofence.length > 0) {
                     geofenceList.push(currentGeofence);
                  }
                  currentGeofence = [];
               }
               //Has single geofence
               else {
                  let currentPoint = geofenceData[g].split(',');
                  currentGeofence.push([currentPoint[0] * 1, currentPoint[1] * 1]);
               }
            } //End of g loop
            geofenceList.push(currentGeofence);
         } //End of m loop
         getPokestops(geofenceList)
      } //End of convertGeofences()

      async function getPokestops(geofenceList) {
         var madDB = config.madDB;
         madDB.multipleStatements = true;
         var connection = mysql.createConnection(madDB);
         let pokestopQuery = `SELECT a.pokestop_id, a.latitude, a.longitude FROM pokestop a, trs_quest b WHERE a.pokestop_id = b.GUID;`;
         connection.query(pokestopQuery, function (err, results) {
            if (err) {
               console.log(err);
               channel.send(`Error selecting quests from database. Check console for more info.`);
               connection.end();
               return;
            } else {
               connection.end();
               createQuestList(geofenceList, results);
            }
         }); //End of connection
      } //End of getPokestops()

      async function createQuestList(geofenceList, pokestopList) {
         var guidList = [];
         for (var g in geofenceList) {
            for (var p in pokestopList) {
               let isInside = insidePolygon([pokestopList[p]['latitude'], pokestopList[p]['longitude']], geofenceList[g]);
               if (isInside === true) {
                  guidList.push(pokestopList[p]['pokestop_id']);
               }
            } //End of p loop
         } //End of g loop
         guidList = [...new Set(guidList)];
         module.exports.truncateAreaQuests(channel, guidList);
      } //End of createQuestList()
   }, //End of collectAreaQuests()


   truncateAreaQuests: async function truncateAreaQuests(channel, guidList) {
      let deleteList = `"${guidList.join(`","`)}"`;
      var madDB = config.madDB;
      madDB.multipleStatements = true;
      var connection = mysql.createConnection(madDB);
      let pokestopQuery = `DELETE FROM trs_quest WHERE GUID IN (${deleteList});`;
      connection.query(pokestopQuery, function (err, results) {
         if (err) {
            console.log(err);
            channel.send(`Error selecting quests from database. Check console for more info.`);
            connection.end();
            return;
         } else {
            connection.end();
            channel.send(`${results.affectedRows} quests deleted from database.`);
         }
      }); //End of connection
   } //End of truncateAreaQuests()
}