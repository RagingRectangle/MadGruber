const {
   Client,
   Intents,
   MessageEmbed,
   Permissions,
   MessageAttachment,
   MessageActionRow,
   MessageSelectMenu,
   MessageButton
} = require('discord.js');

const fs = require('fs');
const mysql = require('mysql');
const pm2 = require('pm2');
const {
   time
} = require('@discordjs/builders');
const config = require('../config/config.json');

module.exports = {
   listEvents: async function listEvents(client, channel) {
      var eventGuild = '';
      var allEvents = '';
      var activeEvents = [];
      var scheduledEvents = [];
      try {
         if (config.truncate.eventGuildID === "") {
            sendEventListMessage(new MessageEmbed().setDescription("No event guild set in config."));
            return;
         } else {
            eventGuild = await client.guilds.fetch(config.truncate.eventGuildID).catch(console.error);
            allEvents = JSON.parse(JSON.stringify(await eventGuild.scheduledEvents.fetch()));
         }
      } catch (err) {
         console.log(err)
      }
      for (var e = 0; e < allEvents.length; e++) {
         if (allEvents[e]['description'].toLowerCase().includes(config.truncate.eventDescriptionTrigger.toLowerCase())) {
            if (allEvents[e]['status'] === 'ACTIVE') {
               activeEvents.push(allEvents[e]);
            } else if (allEvents[e]['status'] === 'SCHEDULED') {
               scheduledEvents.push(allEvents[e]);
            }
         } //End of if trigger
      } //End of e loop

      //No events found
      if (activeEvents.length == 0 && scheduledEvents.length == 0) {
         sendEventListMessage(new MessageEmbed().setDescription("No active or scheduled quest reroll events found."));
      }

      //Events found
      else {
         //Active Events
         if (activeEvents.length == 0) {
            sendEventListMessage(new MessageEmbed().setDescription("No active quest reroll events found."));
         } else {
            activeEvents.sort(function (a, b) {
               return a.scheduledEndTimestamp - b.scheduledEndTimestamp;
            });
            var activeEmbed = new MessageEmbed().setAuthor({
               name: `Active Quest Reroll Events:`
            }).setColor('00841E');
            for (var a = 0; a < activeEvents.length; a++) {
               let endTime = new Date(activeEvents[a]['scheduledEndTimestamp']);
               activeEmbed.addFields({
                  name: `${activeEvents[a]['name']}`,
                  value: (`- Ends ${time(endTime, 'R')}\n- ${activeEvents[a]['description']}`).replaceAll('- -', '-')
               });
            } //End of a loop
            sendEventListMessage(activeEmbed);
         } //End of active events

         //Scheduled Events
         await new Promise(done => setTimeout(done, 1000));
         if (scheduledEvents.length == 0) {
            sendEventListMessage(new MessageEmbed().setDescription("No scheduled quest reroll events found."));
         } else {
            scheduledEvents.sort(function (a, b) {
               return a.scheduledStartTimestamp - b.scheduledStartTimestamp;
            });
            var scheduledEmbed = new MessageEmbed().setAuthor({
               name: `Scheduled Quest Reroll Events:`
            }).setColor('B4740E');
            for (var s = 0; s < scheduledEvents.length; s++) {
               let startTime = new Date(scheduledEvents[s]['scheduledStartTimestamp']);
               scheduledEmbed.addFields({
                  name: `${scheduledEvents[s]['name']}`,
                  value: (`- Starts ${time(startTime, 'R')}\n- ${scheduledEvents[s]['description']}`).replaceAll('- -', '-')
               });
            } //End of s loop
            sendEventListMessage(scheduledEmbed);
         }
      } //End of events found
      async function sendEventListMessage(embed) {
         channel.send({
            embeds: [embed]
         }).catch(console.error);
      } //End of sendEventListMessage
   }, //End of listEvents()


   checkEvents: async function checkEvents(client) {
      let eventGuild = await client.guilds.fetch(config.truncate.eventGuildID).catch(console.error);
      let allEvents = JSON.parse(JSON.stringify(await eventGuild.scheduledEvents.fetch()));
      var timeToWait = 0;
      var activeEvents = [];
      var scheduledEvents = [];
      for (var e = 0; e < allEvents.length; e++) {
         if (allEvents[e]['description'].toLowerCase().includes(config.truncate.eventDescriptionTrigger.toLowerCase())) {
            let timeUntilEnd = (allEvents[e]['scheduledEndTimestamp'] - Date.now()) * 1;
            let timeUntilStart = (allEvents[e]['scheduledStartTimestamp'] - Date.now()) * 1;
            if (allEvents[e]['status'] === 'ACTIVE' && timeUntilEnd < 120000) {
               activeEvents.push(allEvents[e]);
               timeToWait = timeUntilEnd;
            } else if (allEvents[e]['status'] === 'SCHEDULED' && timeUntilStart < 120000) {
               scheduledEvents.push(allEvents[e]);
               timeToWait = allEvents[e]['scheduledStartTimestamp'] - Date.now();
            }
         } //End of if trigger
      } //End of e loop

      //Events found
      if (activeEvents.length > 0 || scheduledEvents.length > 0) {
         //console.log("Quest reroll event/s found.");
         //console.log("active:", activeEvents);
         //console.log("scheduled:", scheduledEvents);
         let date = new Date();
         let hour = date.getHours();
         //If no MAD restart
         var eventEmbed = new MessageEmbed().setAuthor({
            name: `Quests Have Been Rerolled:`
         }).setDescription(`MAD will not restart and quests will not be rescanned.`).setColor('00841E');
         //MAD restart
         if (hour < (config.truncate.onlyRestartBeforeTime * 1) || config.truncate.onlyRestartBeforeTime == 0) {
            eventEmbed.setDescription(`MAD will restart and quests will be rescanned.`).setColor('00841E');
            //Ending Events
            if (activeEvents.length > 0) {
               var endingEvents = [];
               for (var a = 0; a < activeEvents.length; a++) {
                  endingEvents.push(activeEvents[a]['name']);
               } //End of a loop
               eventEmbed.addFields({
                  name: `Events Ending:`,
                  value: `- ${endingEvents.join('\n- ')}`
               });
            } //End of ending events

            //Starting Events
            if (scheduledEvents.length > 0) {
               var startingEvents = [];
               for (var s = 0; s < scheduledEvents.length; s++) {
                  startingEvents.push(scheduledEvents[s]['name']);
               } //End of s loop
               eventEmbed.addFields({
                  name: `Events Starting:`,
                  value: `- ${startingEvents.join('\n- ')}`
               });
            } //End of starting events
            await new Promise(done => setTimeout(done, timeToWait));
            truncateQuests(eventEmbed);
         } //End of MAD restart
      } //End of events found

      async function truncateQuests(eventEmbed) {
         var embed = eventEmbed;
         let connection = mysql.createConnection(config.madDB);
         connection.connect();

         let truncateQuestQuery = `TRUNCATE trs_quest`;
         connection.query(truncateQuestQuery, function (err, results) {
            if (err) {
               console.log(err);
               embed.setColor('9E0000').setFooter({
                  text: `QUESTS FAILED TO BE TRUNCATED!`
               });
               sendEventAlertMessage(embed);
            } else {
               connectPM2();
               async function connectPM2() {
                  await pm2.connect(async function (err) {
                     if (err) {
                        console.error(err);
                        embed.setColor('9E0000').setFooter({
                           text: `QUESTS TRUNCATED | MAD RESTART FAILED`
                        });
                        sendEventAlertMessage(embed);
                     } else {
                        console.log("Quests automatically truncated");
                        for (m in config.pm2.mads) {
                           await pm2.restart(config.pm2.mads[m], (err, response) => {
                              if (err) {
                                 console.log(err);
                                 embed.setColor('9E0000').setFooter({
                                    text: `QUESTS TRUNCATED | MAD RESTART FAILED`
                                 });
                                 sendEventAlertMessage(embed);
                                 return;
                              } else {
                                 console.log("MAD restarted");
                                 embed.setFooter({
                                    text: `QUESTS TRUNCATED | MAD RESTARTED`
                                 });
                              }
                           }) //End of pm2.restart
                        } //End of m loop
                        await new Promise(done => setTimeout(done, 5000));
                        sendEventAlertMessage(embed);
                     }
                  }) //End of pm2.connect
               }
            }
         }); //End of connection.query
         connection.end();
      } //End of truncateQuests()

      async function sendEventAlertMessage(embed) {
         if (config.truncate.eventAlertChannelID) {
            try {
               let eventChannel = await client.channels.fetch(config.truncate.eventAlertChannelID).catch(console.error);
               eventChannel.send({
                     embeds: [embed]
                  }).catch(console.error)
                  .then(msg => {
                     if (config.truncate.eventAlertDeleteSeconds > 0) {
                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting PM2 start response:`, err)), (config.pm2.pm2ResponseDeleteSeconds * 1000));
                     }
                  });
            } catch (err) {
               console.log(err);
            }
         }
      } //End of sendEventAlertMessage()
   } //End of checkEvents()
}