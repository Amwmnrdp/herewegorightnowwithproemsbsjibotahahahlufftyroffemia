const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');
const { allowedServers } = require('../../utils/permissions');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Need ADMINISTRATOR permission!', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('allow').setLabel('✅ ' + await t('Allow', langCode)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('refuse').setLabel('❌ ' + await t('Refuse', langCode)).setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
        .setTitle('🔐 ' + await t('Permission Settings', langCode))
        .setDescription(await t('Allow bot to suggest emojis from this server?', langCode))
        .setColor('#ADD8E6');

    await interaction.editReply({ embeds: [embed], components: [buttonRow] });

    const filter = i => (i.customId === 'allow' || i.customId === 'refuse') && i.user.id === interaction.user.id;
    const response = await interaction.fetchReply();
    const collector = response.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate().catch(() => {});
            const db = require('../../utils/database');
            if (i.customId === 'allow') {
                await db.setServerPermission(interaction.guild.id, true).catch(() => {});
                const e = new EmbedBuilder().setTitle('✅ ' + await t('Permission Granted', langCode)).setDescription(await t('Bot can suggest emojis from this server.', langCode)).setColor('#ADD8E6');
                await i.editReply({ embeds: [e], components: [] }).catch(() => {});
            } else {
                await db.setServerPermission(interaction.guild.id, false).catch(() => {});
                const e = new EmbedBuilder().setTitle('❌ ' + await t('Permission Denied', langCode)).setDescription(await t('Bot will NOT suggest emojis.', langCode)).setColor('#FF0000');
                await i.editReply({ embeds: [e], components: [] }).catch(() => {});
            }
            collector.stop();
        } catch (err) {
            console.error('Collector error:', err);
        }
    });
}

module.exports = { execute };
