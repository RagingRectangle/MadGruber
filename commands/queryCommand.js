const {
	SlashCommandBuilder
} = require('discord.js');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const Queries = require('../functions/queries.js');
const config = require('../config/config.json');
const queryConfig = require('../config/queries.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.queryCommand.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'))
		.setDescription("Run database query")
		.addStringOption(option => {
			option
				.setName('query-name')
				.setDescription('Select query')
				.setRequired(true)
			if (queryConfig.custom) {
				for (var i = 0; i < queryConfig.custom.length; i++) {
					option.addChoices({
						name: queryConfig.custom[i]['name'],
						value: queryConfig.custom[i]['name']
					});
				} //End of i loop
			} else {
				console.log("MadGruber now has a new query config section. See here for info on how to update: https://discord.com/channels/923432745584177182/923445278995001354/1016092603067928637");
				for (var i = 0; i < queryConfig.count.length; i++) {
					option.addChoices({
						name: queryConfig.count[i]['type'],
						value: `SELECT COUNT(*) FROM ${queryConfig.count[i]['table']};`
					});
				} //End of i loop
			}
			return option;
		}),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms(guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('queries')) {
			interaction.deferReply();
			var specificCheck = false;
			var queryName = '';
			var queryFull = '';
			try {
				if (interaction.options._hoistedOptions[0]['value']) {
					queryName = interaction.options._hoistedOptions[0]['value'];
					for (var i in queryConfig.custom) {
						if (queryConfig.custom[i]['name'] === queryName && queryConfig.custom[i]['query']) {
							specificCheck = true;
							queryFull = queryConfig.custom[i]['query'];
						}
					} //End of i loop
				}
			} catch (err) {}
			if (specificCheck === true) {
				Queries.customQuery(channel, interaction.user, queryName, queryFull);
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