const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');

async function execute(interaction, langCode) {
    if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply().catch(() => {});
    }

    if (interaction.user.id !== interaction.guild.ownerId) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only the server owner can use this command.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const perms = await db.getServerPermissions(interaction.guild.id);
    const isAllowed = perms ? perms.emoji_permission_enabled : true;

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('allow_emoji').setLabel('✅ ' + await t('Allow Emojis', langCode)).setStyle(ButtonStyle.Success).setDisabled(isAllowed),
        new ButtonBuilder().setCustomId('refuse_emoji').setLabel('❌ ' + await t('Deny Emojis', langCode)).setStyle(ButtonStyle.Danger).setDisabled(!isAllowed)
    );

    const embed = new EmbedBuilder()
        .setTitle('😀 ' + await t('Emoji Permission Settings', langCode))
        .setDescription(await t('Should the bot be allowed to suggest emojis from this server to other servers?', langCode) + `\n\n**${await t('Current Status', langCode)}:** ` + (isAllowed ? '✅ ' + await t('Allowed', langCode) : '❌ ' + await t('Denied', langCode)))
        .setColor('#FFA500');

    await interaction.editReply({ embeds: [embed], components: [buttonRow] });

    const filter = i => (i.customId === 'allow_emoji' || i.customId === 'refuse_emoji') && i.user.id === interaction.user.id;
    const response = await interaction.fetchReply().catch(() => null);
    if (!response) return;
    const collector = response.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate().catch(() => {});
            if (i.customId === 'allow_emoji') {
                await db.setEmojiPermission(interaction.guild.id, true).catch(() => {});
                const e = new EmbedBuilder().setTitle('✅ ' + await t('Emoji Permission Updated', langCode)).setDescription(await t('The bot is now allowed to suggest emojis from this server.', langCode)).setColor('#00FF00');
                await i.editReply({ embeds: [e], components: [] }).catch(() => {});
            } else {
                await db.setEmojiPermission(interaction.guild.id, false).catch(() => {});
                const e = new EmbedBuilder().setTitle('❌ ' + await t('Emoji Permission Updated', langCode)).setDescription(await t('The bot will no longer suggest emojis from this server.', langCode)).setColor('#FF0000');
                await i.editReply({ embeds: [e], components: [] }).catch(() => {});
            }
            collector.stop();
        } catch (err) {
            console.error('Collector error:', err);
        }
    });
}

module.exports = { execute };