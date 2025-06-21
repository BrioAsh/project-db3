const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Affiche ton solde ou celui d'un utilisateur")
    .addUserOption((option) =>
      option
        .setName("utilisateur")
        .setDescription("L'utilisateur dont voir le solde")
        .setRequired(false)
    ),
  async execute(interaction) {
    const database = interaction.client.database;
    const targetUser =
      interaction.options.getUser("utilisateur") || interaction.user;
    const guildId = interaction.guild.id;

    try {
      const economy = await database.getUserEconomy(targetUser.id, guildId);
      const levels = await database.getUserLevel(targetUser.id, guildId);
      const voiceStats = await database.getVoiceStats(targetUser.id, guildId);

      const embed = new EmbedBuilder()
        .setTitle(`💳 Profil de ${targetUser.username}`)
        .setColor("#f39c12")
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          {
            name: "🪙 Portefeuille",
            value: `${economy.coins || 0}`,
            inline: true,
          },
          { name: "🏦 Banque", value: `${economy.bank || 0}`, inline: true },
          {
            name: "💎 Total",
            value: `${(economy.coins || 0) + (economy.bank || 0)}`,
            inline: true,
          },
          { name: "📊 Niveau", value: `${levels.level || 1}`, inline: true },
          { name: "⭐ XP Total", value: `${levels.xp || 0}`, inline: true },
          {
            name: "💬 Messages",
            value: `${levels.messages_sent || 0}`,
            inline: true,
          },
          {
            name: "🎤 Temps vocal",
            value: database.formatDuration(voiceStats.total_minutes),
            inline: true,
          },
          {
            name: "🎯 Sessions vocales",
            value: `${voiceStats.total_sessions}`,
            inline: true,
          },
          {
            name: "🎵 XP vocal",
            value: `${voiceStats.total_voice_xp}`,
            inline: true,
          }
        )
        .setFooter({
          text: `Demandé par ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [embed] });
      await wait(15000);
      await interaction.deleteReply();
    } catch (error) {
      console.error("Erreur balance:", error);
      await interaction.reply({
        content: "Une erreur est survenue lors de la récupération du solde.",
        ephemeral: true,
      });
    }
  },
};
