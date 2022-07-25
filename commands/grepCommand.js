const {
	MessageAttachment,
	SlashCommandBuilder
} = require('discord.js');
const fs = require('fs');
const fetch = require('node-fetch');
const Roles = require('../functions/roles.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('grep')
		.setDescription("Search file for lines that include string")
		.addStringOption(option =>
			option
			.setName('search-string')
			.setDescription('Enter what should be searched for')
			.setRequired(true))
		.addAttachmentOption(option =>
			option
			.setName('file')
			.setDescription('Select the file to be searched')
			.setRequired(true)),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms(guild, interaction.user);
		if (userPerms.includes('admin')) {
			interaction.deferReply({
				ephemeral: true
			});
			let searchString = interaction.options.getString('search-string').toLowerCase();
			file = interaction.options.getAttachment('file');
			console.log(`${interaction.user.username} searched ${file.name} for "${searchString}"`);
			await fetch(file.url)
				.then(function (response) {
					var destination = fs.createWriteStream(`./${file.name}.txt`);
					response.body.pipe(destination);
				});
			await new Promise(done => setTimeout(done, 5000));
			var linesFound = [];
			const textFile = fs.readFileSync(`./${file.name}.txt`, 'utf-8');
			textFile.split(/\r?\n/).forEach(line => {
				if (line.toLowerCase().includes(searchString)) {
					linesFound.push(line);
				}
			});

			fs.writeFileSync(`./${file.name}.txt`, linesFound.join('\n'));
			interaction.editReply({
				files: [new MessageAttachment(`./${file.name}.txt`)],
				ephemeral: true
			}).catch(console.error);
			await new Promise(done => setTimeout(done, 5000));
			try {
				fs.rmSync(`./${file.name}.txt`);
			} catch (err) {}
		} else {
			channel.send(`User *${interaction.user.username}* does not have required grep perms`).catch(console.error);
		}
		return "";
	},
};