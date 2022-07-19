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
            let button = new ButtonBuilder()
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
            var buttonRow = new ActionRowBuilder()
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