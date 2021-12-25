const {
    Client,
    Intents,
    MessageEmbed,
    Permissions,
} = require('discord.js');
const config = require('../config/config.json');
const roleConfig = require('../config/roles.json');

module.exports = {
    roles: async function roles(reaction, user, type) {
        roleConfig.forEach(role => {
            if (role.messageID === reaction.message.id) {
                role.roles.forEach(async emoji => {
                    if (emoji.emojiName === reaction._emoji.name) {
                        let guildUser = await reaction.message.guild.members.cache.find(m => m.id === user.id);
                        let newRole = await reaction.message.guild.roles.cache.find(r => r.id === emoji.roleID);
                        var errorCheck = false;
                        if (type === 'add') {
                            guildUser.roles.add(newRole).catch(err => {
                                    console.log(`Error giving ${newRole.name} role to user ${user.username}: ${err}`);
                                    errorCheck = true;
                                })
                                .then(() => {
                                    if (errorCheck !== true) {
                                        console.log(`${user.username} added ${newRole.name} role`);
                                        if (config.discord.sendRoleMessage === true) {
                                            reaction.message.channel.send(`${user} has added the ${newRole.name} role.`)
                                                .then(msg => {
                                                    if (config.discord.roleMessageDeleteSeconds > 0) {
                                                        setTimeout(() => msg.delete().catch(err => console.log("Error deleting role message:", err)), (config.discord.roleMessageDeleteSeconds * 1000))
                                                    }
                                                })
                                        }
                                    }
                                })
                        } //End of role added
                        else {
                            guildUser.roles.remove(newRole).catch(err => {
                                    console.log(`Error removing ${newRole.name} role to user ${user.username}: ${err}`);
                                    errorCheck = true;
                                })
                                .then(() => {
                                    if (errorCheck !== true) {
                                        console.log(`${user.username} removed ${newRole.name} role`);
                                        if (config.discord.sendRoleMessage === true) {
                                            reaction.message.channel.send(`${user} has removed the ${newRole.name} role.`)
                                                .then(msg => {
                                                    if (config.discord.roleMessageDeleteSeconds > 0) {
                                                        setTimeout(() => msg.delete().catch(err => console.log("Error deleting role message:", err)), (config.discord.roleMessageDeleteSeconds * 1000))
                                                    }
                                                })
                                        }
                                    }
                                })
                        }//End of role removed
                    }
                }) //End of forEach(emoji)
            }
        }) //End of forEach(role)
    } //End of roles()
}