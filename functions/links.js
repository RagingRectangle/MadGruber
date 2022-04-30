const {
   Client,
   Intents,
   MessageEmbed,
   Permissions,
   MessageActionRow,
   MessageSelectMenu,
   MessageButton
} = require('discord.js');
const linksList = require('../config/links.json');

module.exports = {
   links: async function links(receivedMessage) {
      var buttonList = [];
      linksList.forEach(link => {
         if (link.url !== '') {
            let button = new MessageButton()
               .setURL(link.url)
               .setLabel(link.label)
               .setEmoji(link.emoji)
               .setStyle('LINK')
            buttonList.push(button);
         }
      });
      if (buttonList.length == 0) {
         receivedMessage.channel.send("No links are set in config.").catch(console.error);
         return;
      }
      let rowsNeeded = Math.ceil(buttonList.length / 5);
      let buttonsNeeded = buttonList.length;
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
      receivedMessage.channel.send({
         content: `Click to open:`,
         components: messageComponents
      }).catch(console.error);
   } //End of links()
}