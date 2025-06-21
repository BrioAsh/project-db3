const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le classement du serveur')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de classement')
                .setRequired(true)
                .addChoices(
                    { name: '💰 Économie', value: 'economy' },
                    { name: '📊 Niveaux', value: 'levels' }
                )),
    async execute(interaction) {
        const database = interaction.client.database;
        const type = interaction.options.getString('type');
        const guildId = interaction.guild.id;

        try {
            let data, title, description;

            if (type === 'economy') {
                data = await database.getTopEconomy(guildId, 10);
                title = '💰 Classement Économie';
                description = 'Top 10 des plus riches du serveur :';
            } else {
                data = await database.getTopLevels(guildId, 10);
                title = '📊 Classement Niveaux';
                description = 'Top 10 des plus hauts niveaux :';
            }

            if (!data || data.length === 0) {
                await interaction.reply({ content: 'Aucune donnée disponible pour ce classement.', ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor('#9b59b6')
                .setDescription(description);

            let leaderboardText = '';
            for (let i = 0; i < data.length; i++) {
                const user = data[i];
                const position = i + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
                
                try {
                    const discordUser = await interaction.client.users.fetch(user.user_id);
                    const username = discordUser.username;
                    
                    if (type === 'economy') {
                        const total = (user.coins || 0) + (user.bank || 0);
                        leaderboardText += `${medal} **${username}** - ${total} 🪙\n`;
                    } else {
                        leaderboardText += `${medal} **${username}** - Niveau ${user.level} (${user.xp} XP)\n`;
                    }
                } catch (error) {
                    console.error(`Erreur lors de la récupération de l'utilisateur ${user.user_id}:`, error);
                    leaderboardText += `${medal} **Utilisateur inconnu** - ${type === 'economy' ? `${(user.coins || 0) + (user.bank || 0)} 🪙` : `Niveau ${user.level}`}\n`;
                }
            }

            embed.addFields({ name: '\u200B', value: leaderboardText });
            embed.setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
            await wait(30000);
            await interaction.deleteReply();

        } catch (error) {
            console.error('Erreur leaderboard:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de la récupération du classement.', ephemeral: true });
        }
    },
};