const {
	MessageEmbed,
} = require('discord.js');
const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const Truncate = require('../functions/truncate.js');
const config = require('../config/config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.truncateCommand)
		.setDescription("Get list of tables to truncate")
		.addStringOption(option => {
			option
				.setName('optional-table')
				.setDescription('Select table to truncate')
			for (var i = 0; i < config.truncate.truncateOptions.length; i++) {
				option.addChoices({
					name: config.truncate.truncateOptions[i],
					value: config.truncate.truncateOptions[i]
				});
			}
			return option;
		}),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms('GUILD_TEXT', guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('truncate')) {
			interaction.deferReply();
			var specificCheck = false;
			var tables = [];
			try {
				if (interaction.options._hoistedOptions[0]['value']) {
					specificCheck = true;
					tables = interaction.options._hoistedOptions[0]['value'].split('+');
				}
			} catch (err) {}
			if (specificCheck === true) {
				if (config.truncate.truncateVerify === true) {
					Truncate.verifyTruncate(channel, interaction.user, tables);
				} else {
					channel.send({
							embeds: [new MessageEmbed().setTitle('Truncate Results:').setDescription('**Truncating...**')],
							components: []
						})
						.then(msg => {
							Truncate.truncateTables(msg, interaction.user, tables);
						}).catch(console.error);
				}
			} else {
				Truncate.sendTruncateMessage(channel);
			}
		} //End of if userPerms
		else {
			channel.send(`User *${interaction.user.username}* does not have required truncate perms`).catch(console.error);
		}
		return "delete";
	},
};