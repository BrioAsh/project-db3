const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Répond avec "Pong!'),
    async execute(interaction) {
        await interaction.reply('Pinging...');
        const sent = await interaction.fetchReply();
        const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsPing = interaction.client.ws.ping;
        const embed = new EmbedBuilder()
           .setTitle('🏓 Pong!')
           .setColor(wsPing < 100 ? '#00ff00' : wsPing < 200 ? '#ffff00' : '#ff0000')
           .setDescription(`Te dit si ta co pues la merde ou si c'est le bot :`)
           .addFields(
                { name: '📡 Latence', value: `${roundTrip}ms`, inline: true },
                { name: '💓 Heartbeat', value: `${wsPing}ms`, inline: true },
                { name: '⏰ Uptime', value: `${Math.floor(interaction.client.uptime / 1000)}s`, inline: true }
            )
           .setTimestamp()
           .setThumbnail( interaction.client.user.displayAvatarURL())
           .setFooter({ text: `Utilisé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply( {content:"", embeds: [embed]}  );
        await wait(15000), interaction.deleteReply();
        
    },
};