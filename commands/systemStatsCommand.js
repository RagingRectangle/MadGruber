const {
	MessageEmbed,
} = require('discord.js');
const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const Stats = require('../functions/stats.js');
const config = require('../config/config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.systemStatsCommand)
		.setDescription("Get system stats")
		.addStringOption(option =>
			option
			.setName('type')
			.setDescription('Select type of stat')
			.setRequired(true)
			.addChoices({
				name: `Despawn Time Left`,
				value: `despawn%`
			}, {
				name: `Hundos + Nundos + Shinies`,
				value: `hundoNundoShiny`
			}, {
				name: `Location Handling`,
				value: `locationHandling`
			}, {
				name: `Mons Scanned`,
				value: `monsScanned`
			}, {
				name: `Restarts + Reboots`,
				value: `restartsReboots`
			}, {
				name: `Uptime`,
				value: `uptime`
			}))
		.addStringOption(option =>
			option
			.setName('rpl')
			.setDescription('Select report period length')
			.setRequired(true)
			.addChoices({
				name: `Hourly`,
				value: `hourly`
			}, {
				name: `Daily`,
				value: `daily`
			})),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms('GUILD_TEXT', guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('systemStats')) {
			interaction.deferReply();
			let statType = interaction.options.getString('type');
			let statDuration = interaction.options.getString('rpl');
			Stats.systemStats(channel, interaction.user, statDuration, statType);
		} else {
			channel.send(`User *${interaction.user.username}* does not have required systemStats perms`).catch(console.error);
		}
		return "delete";
	},
};