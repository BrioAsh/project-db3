const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Récupère ta récompense quotidienne !'),
    async execute(interaction) {
        const database = interaction.client.database;
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            // Vérifier si l'utilisateur peut réclamer son daily
            const canClaim = await database.canClaimDaily(userId, guildId);
            
            if (canClaim !== true) {
                const embed = new EmbedBuilder()
                    .setTitle('⏰ Daily déjà récupéré')
                    .setColor('#ff6b6b')
                    .setDescription(`Tu as déjà récupéré ta récompense quotidienne !\nReviens dans **${canClaim.hoursLeft}h**`)
                    .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed] });
                await wait(15000);
                await interaction.deleteReply();
                return;
            }

            // Récupérer la configuration du serveur pour le montant
            const guildConfig = await database.getGuildConfig(guildId);
            const dailyAmount = guildConfig?.daily_reward || 100;

            // Donner la récompense
            const result = await database.claimDaily(userId, guildId, dailyAmount);

            const embed = new EmbedBuilder()
                .setTitle('💰 Daily récupéré !')
                .setColor('#4ecdc4')
                .setDescription(`Tu as reçu **${dailyAmount}** 🪙 !\nSolde actuel: **${result.newBalance}** 🪙`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: `Reviens demain pour plus !`, iconURL: interaction.client.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
            await wait(15000);
            await interaction.deleteReply();

        } catch (error) {
            console.error('Erreur daily:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de la récupération du daily.', ephemeral: true });
        }
    },
};