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
   InteractionType,
   ChannelType
} = require('discord.js');
const fs = require('fs');
const mysql = require('mysql');
const config = require('../config/config.json');
const queryConfig = require('../config/queries.json');

module.exports = {
   queries: async function queries(channel) {
      let countList = queryConfig.count;
      var selectList = [];
      countList.forEach(count => {
         let listOption = {
            label: count.type,
            value: `${config.serverName}~count~${count.table}`
         }
         selectList.push(listOption);
      });
      let fullCountList = new ActionRowBuilder()
         .addComponents(
            new SelectMenuBuilder()
            .setCustomId(`${config.serverName}~countList`)
            .setPlaceholder('MAD DB Counter')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(selectList))

      channel.send({
         content: 'Select option below to get count',
         components: [fullCountList]
      }).catch(console.error);

   }, //End of queries()


   queryCount: async function queryCount(channel, user, table) {
      let connection = mysql.createConnection(config.madDB);
      connection.connect();
      let countQuery = `SELECT COUNT(*) FROM ${table}`;
      connection.query(countQuery, function (err, results) {
         if (err) {
            console.log(`(${user.username}) Count Query Error:`, err);
         } else {
            let count = results[0]['COUNT(*)'].toLocaleString();
            console.log(`(${user.username}) SELECT COUNT(*) FROM ${config.madDB.database}.${table}: ${count}`);
            channel.send(`Current ${config.madDB.database} ${table}: ${count}`).catch(console.error);
         }
      }) //End of query
      connection.end();
   }, //End of queryCount()

}