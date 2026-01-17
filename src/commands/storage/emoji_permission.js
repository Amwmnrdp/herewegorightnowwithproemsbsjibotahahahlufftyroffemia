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
    const isAllowed = perms ? perms.emoji_permission_enabled : true;

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('allow_emoji').setLabel('✅ ' + await t('Allow', langCode)).setStyle(ButtonStyle.Success).setDisabled(isAllowed),
        new ButtonBuilder().setCustomId('refuse_emoji').setLabel('❌ ' + await t('Refuse', langCode)).setStyle(ButtonStyle.Danger).setDisabled(!isAllowed)
    );

    const embed = new EmbedBuilder()
        .setTitle('🔐 ' + await t('Emoji Permission Settings', langCode))
        .setDescription(await t('Allow bot to suggest emojis from this server?', langCode))
        .setColor('#ADD8E6');

    await interaction.editReply({ embeds: [embed], components: [buttonRow] });

    const filter = i => (i.customId === 'allow_emoji' || i.customId === 'refuse_emoji') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        await i.deferUpdate();
        if (i.customId === 'allow_emoji') {
            await db.setEmojiPermission(interaction.guild.id, true);
            const e = new EmbedBuilder().setTitle('✅ ' + await t('Permission Granted', langCode)).setDescription(await t('Bot can suggest emojis from this server.', langCode)).setColor('#ADD8E6');
            await i.editReply({ embeds: [e], components: [] });
        } else {
            await db.setEmojiPermission(interaction.guild.id, false);
            const e = new EmbedBuilder().setTitle('❌ ' + await t('Permission Denied', langCode)).setDescription(await t('Bot will NOT suggest emojis.', langCode)).setColor('#FF0000');
            await i.editReply({ embeds: [e], components: [] });
        }
        collector.stop();
    });
}

module.exports = { execute };