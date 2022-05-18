const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const Events = require('../functions/events.js');
const config = require('../config/config.json')

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.eventsCommand)
		.setDescription("Get list of events that will reroll quests"),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		if (config.truncate.eventGuildID) {
			interaction.deferReply()
			Events.listEvents(client, channel);
		}
		return "delete";
	},
};