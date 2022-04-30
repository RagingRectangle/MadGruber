const {
   Client,
   Intents,
   MessageEmbed,
   Permissions,
   MessageActionRow,
   MessageSelectMenu,
   MessageButton
} = require('discord.js');
const fs = require('fs');
const mysql = require('mysql');
const config = require('../config/config.json');
const queryConfig = require('../config/queries.json');

module.exports = {
   queries: async function queries(receivedMessage) {
      let countList = queryConfig.count;
      var selectList = [];
      countList.forEach(count => {
         let listOption = {
            label: count.type,
            value: `${config.serverName}~count~${count.type}`
         }
         selectList.push(listOption);
      });
      let fullCountList = new MessageActionRow()
         .addComponents(
            new MessageSelectMenu()
            .setCustomId(`${config.serverName}~countList`)
            .setPlaceholder('MAD DB Counter')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(selectList))

      receivedMessage.channel.send({
         content: 'Select option below to get count',
         components: [fullCountList]
      }).catch(console.error);

   }, //End of queries()


   queryCount: async function queryCount(interaction, countType) {
      let countList = queryConfig.count;
      for (var c in countList) {
         if (countList[c]['type'] === countType) {
            interaction.update({});
            let table = countList[c]['table'];
            let connection = mysql.createConnection(config.madDB);
            connection.connect();
            let countQuery = `SELECT COUNT(*) FROM ${table}`;
            connection.query(countQuery, function (err, results) {
               if (err) {
                  console.log(`(${interaction.user.username}) Count Query Error:`, err);
               } else {
                  let count = results[0]['COUNT(*)'].toLocaleString();
                  console.log(`(${interaction.user.username}) SELECT COUNT(*) FROM ${config.madDB.database}.${table}: ${count}`);
                  interaction.channel.send(`Current ${config.madDB.database} ${countType}: ${count}`).catch(console.error);
               }
            }) //End of query
            connection.end();
         }
      }
   }, //End of queryCount()

}