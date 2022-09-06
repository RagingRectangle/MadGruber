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
const linksList = require('../config/links.json');

module.exports = {
   links: async function links(client, channel) {
      var buttonList = [];
      linksList.forEach(link => {
         if (link.url && link.label) {
            var button = new ButtonBuilder()
               .setURL(link.url)
               .setLabel(link.label)
               .setStyle(ButtonStyle.Link)
            if (link.emoji){
               button.setEmoji(link.emoji);
            }
            buttonList.push(button);
         }
      });
      if (buttonList.length == 0) {
         channel.send("No links are set in config.").catch(console.error);
         return;
      }
      let rowsNeeded = Math.ceil(buttonList.length / 5);
      let buttonsNeeded = buttonList.length;
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
         content: `Click to open:`,
         components: messageComponents
      }).catch(console.error);
   } //End of links()
}