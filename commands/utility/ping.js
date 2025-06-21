const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
           .setTitle('🏓')
           .setColor('#565757')
           .setDescription(`Te dit si ta co pues la merde ou si c'est le bot :`)
           .addFields(
                { name: 'Ta vielle co', value: `\`${roundTrip}ms\``, inline: true },
                { name: 'La co du bg', value: `\`${wsPing}ms\``, inline: true }
            );
        await interaction.editReply( {content:"", embeds: [embed]}  );
    },
};