const {
	Client,
	Intents,
	MessageEmbed,
	Permissions,
	MessageActionRow,
	MessageSelectMenu,
	MessageButton
} = require('discord.js');
const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS],
	partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});
const fs = require('fs');
const pm2 = require('pm2');
const Scripts = require('./functions/scripts.js');
const Queries = require('./functions/queries.js');
const Interactions = require('./functions/interactions.js');
const UpdateButtons = require('./functions/update_buttons.js');
const TruncateQuests = require('./functions/truncate_quests.js');
const Roles = require('./functions/roles.js');
const config = require('./config/config.json');
const roleConfig = require('./config/roles.json');
var roleMessages = [];
roleConfig.forEach(role => {
	if (role.messageID) {
		roleMessages.push(role.messageID);
	}
})

client.on('ready', () => {
	console.log("MadGruber Bot Logged In");
});

client.on('messageCreate', async (receivedMessage) => {
	let message = receivedMessage.content.toLowerCase();

	//Exit if author not admin
	if (!config.discord.adminIDs.includes(receivedMessage.author.id)) {
		return;
	}
	if (receivedMessage.channel.type !== "DM" && !config.discord.channelIDs.includes(receivedMessage.channel.id)) {
		return;
	}

	//Send PM2 list/buttons
	if (message === `${config.discord.prefix}${config.discord.pm2Command}`) {
		await new Promise(done => setTimeout(done, 1000 * config.delaySeconds));
		UpdateButtons.updateButtons(receivedMessage.channel, 'new');
	}

	//Truncate Quests
	else if (config.madDB.host && message === `${config.discord.prefix}${config.discord.truncateCommand}`) {
		await new Promise(done => setTimeout(done, 1000 * config.delaySeconds));
		TruncateQuests.truncateQuests(receivedMessage);
	}

	//Run Scripts
	else if (message === `${config.discord.prefix}${config.discord.scriptCommand}`) {
		Scripts.sendScriptList(receivedMessage, 'new');
	}

	//Run Queries
	else if (message === `${config.discord.prefix}${config.discord.madQueryCommand}`) {
		Queries.queries(receivedMessage);
	}

	//Send Links
	else if (message === `${config.discord.prefix}${config.discord.linksCommand}`) {
		Links.links(receivedMessage);
	}
}); //End of client.on(message)

client.on('interactionCreate', async interaction => {
	//Verify interaction
	if (!interaction.customId.startsWith(config.serverName)) {
		return;
	}
	if (!config.discord.adminIDs.includes(interaction.user.id)) {
		return;
	}
	var interactionID = interaction.customId.replace(`${config.serverName}~`, '');

	//Button interaction
	if (interaction.isButton()){
		Interactions.buttonInteraction(interaction, interactionID);
	}
	//List interaction
	else if (interaction.componentType === 'SELECT_MENU'){
		Interactions.listInteraction(interaction, interactionID);
	}
}); //End of client.on(interactionCreate)

client.on('messageReactionAdd', async (reaction, user) => {
	if (user.bot == true) {
		return;
	}
	if (reaction.message.partial) await reaction.message.fetch();
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Error fetching the message:', error);
			return;
		}
	}
	if (roleMessages.includes(reaction.message.id)) {
		Roles.roles(reaction, user, "add");
	}
}); //End of messageReactionAdd

client.on('messageReactionRemove', async (reaction, user) => {
	if (user.bot == true) {
		return;
	}
	if (reaction.message.partial) await reaction.message.fetch();
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Error fetching the message:', error);
			return;
		}
	}
	if (roleMessages.includes(reaction.message.id)) {
		Roles.roles(reaction, user, "remove");
	}
}); //End of messageReactionRemove

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
client.login(config.discord.token);