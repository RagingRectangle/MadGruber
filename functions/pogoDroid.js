const {
   Client,
   Intents,
   MessageEmbed,
   Permissions,
   MessageActionRow,
   MessageSelectMenu,
   MessageButton
} = require('discord.js');
const client = new Client({
   intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.DIRECT_MESSAGES],
   partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});
const request = require('request');

module.exports = {
   pogoDroid: async function pogoDroid(receivedMessage) {
      request('https://raw.githubusercontent.com/RagingRectangle/PD_Versions/main/versions.json', async function (err, response, html) {
         if (!err && response.statusCode == 200) {
            let versionList = await JSON.parse(html);
            createVersionButtons(versionList);
         } else {
            console.log("Failed to download pogoDroid versions", err);
         }
      }) //End of request()

      async function createVersionButtons(versionList) {
         var buttonList = [];
         versionList.forEach(version => {
            let button = new MessageButton()
               .setURL(`https://github.com/RagingRectangle/PD_Versions/raw/main/PogoDroid-${version}.apk`)
               .setLabel(version)
               .setStyle('LINK')
            buttonList.push(button);
         });
         let buttonsNeeded = buttonList.length;
         let rowsNeeded = Math.ceil(buttonsNeeded / 5);
         var buttonCount = 0;
         var messageComponents = [];
         for (var n = 0; n < rowsNeeded && n < 5; n++) {
            var buttonRow = new MessageActionRow()
            for (var r = 0; r < 5; r++) {
               if (buttonCount < buttonsNeeded) {
                  buttonRow.addComponents(buttonList[buttonCount]);
                  buttonCount++;
               }
            } //End of r loop
            messageComponents.push(buttonRow);
         } //End of n loop
         sendVersionList(messageComponents);
      } //End of createVersionButtons

      async function sendVersionList(messageComponents) {
         receivedMessage.channel.send({
            content: `**Available PogoDroid versions:**`,
            components: messageComponents
         }).catch(console.error);
      } //End of sendVersionList()
   } //End of pogoDroid()
}