const {
	MessageEmbed,
} = require('discord.js');
const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const Queries = require('../functions/queries.js');
const config = require('../config/config.json');
const queryConfig = require('../config/queries.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.madQueryCommand)
		.setDescription("Run database query")
		.addSubcommand(subcommand =>
			subcommand
			.setName('count')
			.setDescription('Run count query on table')
			.addStringOption(option => {
				option
					.setName('table')
					.setDescription('Select table to count')

				for (var i = 0; i < queryConfig.count.length; i++){
					option.addChoices({
						name: queryConfig.count[i]['type'],
						value: queryConfig.count[i]['table']
					});
				}//End of i loop
				return option;
			})),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms('GUILD_TEXT', guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('queries')) {
			interaction.deferReply();
			var specificCheck = false;
			var table = '';
			try {
				if (interaction.options._hoistedOptions[0]['value']) {
					specificCheck = true;
					table = interaction.options._hoistedOptions[0]['value'];
				}
			} catch (err) {}
			if (specificCheck === true) {
				Queries.queryCount(channel, interaction.user, table);
			} else {
				Queries.queries(channel);
			}
		} //End of if userPerms
		else {
			channel.send(`User *${interaction.user.username}* does not have required query perms`).catch(console.error);
		}
		return "delete";
	},
};