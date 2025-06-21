const { Events, PresenceUpdateStatus, ActivityType,  } = require("discord.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        client.user.setStatus(PresenceUpdateStatus.DoNotDisturb);
        client.user.setAvatar('./assets/images/cat-drawing.jpeg');
        client.users.send('214061695453233153', `Le bot viens d'être démarré.`);
        console.log(`✅ ${client.user.tag} est en ligne !`);
    },
};
