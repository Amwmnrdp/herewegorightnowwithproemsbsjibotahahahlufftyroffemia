const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');

async function execute(interaction, langCode) {
    if (interaction.user.id !== interaction.guild.ownerId) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only the server owner can use this command.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const perms = await db.getServerPermissions(interaction.guild.id);
    const isAllowed = perms ? perms.sticker_permission_enabled : true;

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('allow_sticker').setLabel('✅ ' + await t('Allow Stickers', langCode)).setStyle(ButtonStyle.Success).setDisabled(isAllowed),
        new ButtonBuilder().setCustomId('refuse_sticker').setLabel('❌ ' + await t('Deny Stickers', langCode)).setStyle(ButtonStyle.Danger).setDisabled(!isAllowed)
    );

    const embed = new EmbedBuilder()
        .setTitle('🔐 ' + await t('Sticker Permission Settings', langCode))
        .setDescription(await t('Allow bot to suggest stickers in this server?', langCode) + `\n\n**${await t('Current Status', langCode)}:** ` + (isAllowed ? '✅ ' + await t('Allowed', langCode) : '❌ ' + await t('Denied', langCode)))
        .setColor('#ADD8E6');

    await interaction.editReply({ embeds: [embed], components: [buttonRow] });

    const filter = i => (i.customId === 'allow_sticker' || i.customId === 'refuse_sticker') && i.user.id === interaction.user.id;
    const response = await interaction.fetchReply().catch(() => null);
    if (!response) return;
    const collector = response.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate().catch(() => {});
            if (i.customId === 'allow_sticker') {
                await db.setStickerPermission(interaction.guild.id, true).catch(() => {});
                const e = new EmbedBuilder().setTitle('✅ ' + await t('Permission Granted', langCode)).setDescription(await t('Bot can suggest stickers from this server.', langCode)).setColor('#ADD8E6');
                await i.editReply({ embeds: [e], components: [] }).catch(() => {});
            } else {
                await db.setStickerPermission(interaction.guild.id, false).catch(() => {});
                const e = new EmbedBuilder().setTitle('❌ ' + await t('Permission Denied', langCode)).setDescription(await t('Bot will NOT suggest stickers.', langCode)).setColor('#FF0000');
                await i.editReply({ embeds: [e], components: [] }).catch(() => {});
            }
            collector.stop();
        } catch (err) {
            console.error('Collector error:', err);
        }
    });
}

module.exports = { execute };