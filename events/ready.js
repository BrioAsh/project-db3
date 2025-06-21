const { Events, PresenceUpdateStatus, ActivityType } = require("discord.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        client.user.setPresence({ activities: [{ name: 'son caca', type: ActivityType.Watching }] });
        console.log(`✅ ${client.user.tag} est en ligne !`);
    },
};