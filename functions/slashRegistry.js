const {
   Collection
} = require('discord.js');

const fs = require('fs');
const config = require('../config/config.json');

module.exports = {
   registerCommands: async function registerCommands(client) {
      var commands = [];
      const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
      const {
         REST
      } = require('@discordjs/rest');
      const {
         Routes
      } = require('discord-api-types/v10');
      for (const file of commandFiles) {
         if (config.discord[file.replace('.js', '')] !== '') {
            const command = require(`../commands/${file}`);
            try {
               commands.push(command.data.toJSON());
            } catch (err) {
               console.log(err);
            }
         }
      }
      for (const guildID of config.discord.slashGuildIDs) {
         const rest = new REST({
            version: '10'
         }).setToken(config.discord.token);
         rest.put(Routes.applicationGuildCommands(client.user.id, guildID), {
            body: commands
            })
            .then(() => console.log(`Registered slash commands for guild: ${guildID}`))
            .catch(console.error);

         client.commands = new Collection();
         for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            client.commands.set(command.data.name, command);
         }
      } //End of guildID
   } //End of registerCommands()
}