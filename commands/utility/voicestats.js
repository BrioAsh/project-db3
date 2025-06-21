const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("voicestats")
    .setDescription("Affiche les statistiques vocales")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription(
          "Affiche tes statistiques vocales ou celles d'un utilisateur"
        )
        .addUserOption((option) =>
          option
            .setName("utilisateur")
            .setDescription("L'utilisateur dont voir les stats")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("Affiche le classement du temps vocal")
    ),
  async execute(interaction) {
    const database = interaction.client.database;
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      if (subcommand === "user") {
        const targetUser =
          interaction.options.getUser("utilisateur") || interaction.user;
        const stats = await database.getVoiceStats(targetUser.id, guildId);
        const userLevel = await database.getUserLevel(targetUser.id, guildId);

        const embed = new EmbedBuilder()
          .setTitle(`🎤 Statistiques vocales de ${targetUser.username}`)
          .setColor("#9b59b6")
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            {
              name: "⏱️ Temps total en vocal",
              value: database.formatDuration(stats.total_minutes),
              inline: true,
            },
            {
              name: "🎯 Sessions vocales",
              value: `${stats.total_sessions}`,
              inline: true,
            },
            {
              name: "⭐ XP vocal gagné",
              value: `${stats.total_voice_xp}`,
              inline: true,
            },
            {
              name: "📊 Niveau actuel",
              value: `${userLevel.level || 1}`,
              inline: true,
            },
            {
              name: "💬 Messages envoyés",
              value: `${userLevel.messages_sent || 0}`,
              inline: true,
            },
            {
              name: "🔢 XP total",
              value: `${userLevel.xp || 0}`,
              inline: true,
            },
            {
              name: "📈 Durée moy. par session",
              value: database.formatDuration(
                Math.round(stats.avg_session_length)
              ),
              inline: false,
            }
          )
          .setFooter({
            text: `Demandé par ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        await interaction.reply({ embeds: [embed] });
        await wait(20000);
        await interaction.deleteReply();
      } else if (subcommand === "leaderboard") {
        const topVoice = await database.getTopVoiceTime(guildId, 10);

        if (!topVoice || topVoice.length === 0) {
          await interaction.reply({
            content: "Aucune donnée vocale disponible pour ce serveur.",
            ephemeral: true,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("🎤 Classement Temps Vocal")
          .setColor("#9b59b6")
          .setDescription("Top 10 du temps passé en vocal :");

        let leaderboardText = "";
        for (let i = 0; i < topVoice.length; i++) {
          const user = topVoice[i];
          const position = i + 1;
          const medal =
            position === 1
              ? "🥇"
              : position === 2
              ? "🥈"
              : position === 3
              ? "🥉"
              : `${position}.`;

          try {
            const discordUser = await interaction.client.users.fetch(
              user.user_id
            );
            const username = discordUser.username;
            const timeFormatted = database.formatDuration(user.total_minutes);

            leaderboardText += `${medal} **${username}** - ${timeFormatted}\n`;
            leaderboardText += `    └ ${user.sessions_count} sessions • ${user.total_voice_xp} XP vocal\n\n`;
          } catch (error) {
            console.error(
              `Erreur lors de la récupération de l'utilisateur ${user.user_id}:`,
              error
            );
            leaderboardText += `${medal} **Utilisateur inconnu** - ${database.formatDuration(
              user.total_minutes
            )}\n\n`;
          }
        }

        embed.addFields({ name: "\u200B", value: leaderboardText });
        embed.setFooter({
          text: `Demandé par ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

        await interaction.reply({ embeds: [embed] });
        await wait(30000);
        await interaction.deleteReply();
      }
    } catch (error) {
      console.error("Erreur voicestats:", error);
      await interaction.reply({
        content:
          "Une erreur est survenue lors de la récupération des statistiques vocales.",
        ephemeral: true,
      });
    }
  },
};
