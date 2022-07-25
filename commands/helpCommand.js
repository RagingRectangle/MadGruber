const {
	SlashCommandBuilder
} = require('discord.js');
const fs = require('fs');
const Help = require('../functions/help.js');
const config = require('../config/config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.helpCommand)
		.setDescription("Show help menu and user perms"),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		interaction.deferReply();
		Help.helpMenu(client, channel, guild, interaction.user);
		return "delete";
	},
};