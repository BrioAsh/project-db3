const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure les paramètres du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Affiche la configuration actuelle du serveur'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Configure la récompense quotidienne')
                .addIntegerOption(option =>
                    option.setName('montant')
                        .setDescription('Montant de la récompense quotidienne')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('levelup')
                .setDescription('Active/désactive les messages de niveau')
                .addBooleanOption(option =>
                    option.setName('active')
                        .setDescription('Activer ou désactiver les messages de niveau')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('economy')
                .setDescription('Active/désactive le système d\'économie')
                .addBooleanOption(option =>
                    option.setName('active')
                        .setDescription('Activer ou désactiver l\'économie')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Configure le salon de bienvenue')
                .addChannelOption(option =>
                    option.setName('salon')
                        .setDescription('Salon pour les messages de bienvenue')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('Configure le salon de logs')
                .addChannelOption(option =>
                    option.setName('salon')
                        .setDescription('Salon pour les logs')
                        .setRequired(false))),
    async execute(interaction) {
        const database = interaction.client.database;
        const guildId = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'show') {
                // Afficher la configuration actuelle
                const config = await database.getGuildConfig(guildId);
                
                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Configuration du serveur')
                    .setColor('#3498db')
                    .setDescription(`Configuration actuelle pour **${interaction.guild.name}**`)
                    .addFields(
                        { 
                            name: '💰 Économie', 
                            value: config?.economy_enabled ? '✅ Activée' : '❌ Désactivée', 
                            inline: true 
                        },
                        { 
                            name: '📊 Messages de niveau', 
                            value: config?.level_up_messages ? '✅ Activés' : '❌ Désactivés', 
                            inline: true 
                        },
                        { 
                            name: '🎁 Récompense quotidienne', 
                            value: `${config?.daily_reward || 100} 🪙`, 
                            inline: true 
                        },
                        { 
                            name: '👋 Salon de bienvenue', 
                            value: config?.welcome_channel ? `<#${config.welcome_channel}>` : 'Non configuré', 
                            inline: true 
                        },
                        { 
                            name: '📝 Salon de logs', 
                            value: config?.log_channel ? `<#${config.log_channel}>` : 'Non configuré', 
                            inline: true 
                        },
                        { 
                            name: '🔧 Préfixe', 
                            value: config?.prefix || '!', 
                            inline: true 
                        }
                    )
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: `Configuré par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed] });
                await wait(20000);
                await interaction.deleteReply();

            } else if (subcommand === 'daily') {
                const amount = interaction.options.getInteger('montant');
                
                await database.setGuildConfig(guildId, { daily_reward: amount });
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Configuration mise à jour')
                    .setColor('#27ae60')
                    .setDescription(`La récompense quotidienne a été définie à **${amount}** 🪙`)
                    .setFooter({ text: `Configuré par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed] });
                await wait(10000);
                await interaction.deleteReply();

            } else if (subcommand === 'levelup') {
                const active = interaction.options.getBoolean('active');
                
                await database.setGuildConfig(guildId, { level_up_messages: active });
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Configuration mise à jour')
                    .setColor('#27ae60')
                    .setDescription(`Les messages de niveau ont été **${active ? 'activés' : 'désactivés'}**`)
                    .setFooter({ text: `Configuré par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed] });
                await wait(10000);
                await interaction.deleteReply();

            } else if (subcommand === 'economy') {
                const active = interaction.options.getBoolean('active');
                
                await database.setGuildConfig(guildId, { economy_enabled: active });
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Configuration mise à jour')
                    .setColor('#27ae60')
                    .setDescription(`Le système d'économie a été **${active ? 'activé' : 'désactivé'}**`)
                    .setFooter({ text: `Configuré par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed] });
                await wait(10000);
                await interaction.deleteReply();

            } else if (subcommand === 'welcome') {
                const channel = interaction.options.getChannel('salon');
                
                if (channel) {
                    await database.setGuildConfig(guildId, { welcome_channel: channel.id });
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Configuration mise à jour')
                        .setColor('#27ae60')
                        .setDescription(`Le salon de bienvenue a été défini sur ${channel}`)
                        .setFooter({ text: `Configuré par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                    await interaction.reply({ embeds: [embed] });
                } else {
                    await database.setGuildConfig(guildId, { welcome_channel: null });
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Configuration mise à jour')
                        .setColor('#27ae60')
                        .setDescription('Le salon de bienvenue a été désactivé')
                        .setFooter({ text: `Configuré par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                    await interaction.reply({ embeds: [embed] });
                }
                await wait(10000);
                await interaction.deleteReply();

            } else if (subcommand === 'logs') {
                const channel = interaction.options.getChannel('salon');
                
                if (channel) {
                    await database.setGuildConfig(guildId, { log_channel: channel.id });
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Configuration mise à jour')
                        .setColor('#27ae60')
                        .setDescription(`Le salon de logs a été défini sur ${channel}`)
                        .setFooter({ text: `Configuré par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                    await interaction.reply({ embeds: [embed] });
                } else {
                    await database.setGuildConfig(guildId, { log_channel: null });
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Configuration mise à jour')
                        .setColor('#27ae60')
                        .setDescription('Le salon de logs a été désactivé')
                        .setFooter({ text: `Configuré par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                    await interaction.reply({ embeds: [embed] });
                }
                await wait(10000);
                await interaction.deleteReply();
            }

        } catch (error) {
            console.error('Erreur dans la configuration:', error);
            await interaction.reply({ 
                content: 'Une erreur est survenue lors de la configuration.', 
                ephemeral: true 
            });
        }
    },
};