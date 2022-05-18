const {
	MessageEmbed,
} = require('discord.js');
const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const Links = require('../functions/links.js');
const linksList = JSON.parse(fs.readFileSync('./config/links.json'));
const config = require('../config/config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.linksCommand)
		.setDescription(`Get list of bookmarks`)
		.addStringOption(option => {
			option
				.setName('optional-shortcut')
				.setDescription('Get link to specific website')
			for (var i = 0; i < linksList.length; i++) {
				if (linksList[i]['label'] && linksList[i]['url']) {
					option.addChoices({
						name: linksList[i]['label'],
						value: linksList[i]['url']
					});
				}
			} //End of i loop
			return option;
		}),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms('GUILD_TEXT', guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('links')) {
			interaction.deferReply();
			var specificCheck = false;
			var specificLabel = '';
			var specificEmoji = '';
			var specificURL = '';
			try {
				if (interaction.options._hoistedOptions[0]['value']) {
					specificCheck = true;
					for (var i = 0; i < linksList.length; i++) {
						if (linksList[i]['url'] === interaction.options._hoistedOptions[0]['value']) {
							specificLabel = linksList[i]['label'];
							specificURL = linksList[i]['url'];
							specificEmoji = linksList[i]['emoji'];
						}
					} //End of i loop
				}
			} catch (err) {}
			if (specificCheck === true) {
				channel.send({
					embeds: [new MessageEmbed().setDescription(`${specificEmoji} [${specificLabel} Link](${specificURL})`)]
				}).catch(console.error);
			} else {
				Links.links(client, channel);
			}
		} //End of if userPerms
		else {
			channel.send(`User *${interaction.user.username}* does not have required link perms`).catch(console.error);
		}
		return "delete";
	}, //End of execute()
};