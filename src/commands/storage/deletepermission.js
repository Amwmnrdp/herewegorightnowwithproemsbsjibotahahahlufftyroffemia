const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');

async function execute(interaction, langCode) {
    if (interaction.user.id !== interaction.guild.ownerId) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only the server owner can use this command!', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('allow_delete').setLabel('✅ ' + await t('Allow', langCode)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('deny_delete').setLabel('❌ ' + await t('Deny', langCode)).setStyle(ButtonStyle.Danger)
    );

    const perms = await db.getServerPermissions(interaction.guild.id);
    const currentState = perms ? perms.delete_permission_enabled : true;

    const embed = new EmbedBuilder()
        .setTitle('🔐 ' + await t('Delete Permission Settings', langCode))
        .setDescription(await t('Enable direct mass deletion of emojis/stickers for administrators? If disabled, owner approval will be required.', langCode) + 
            `\n\n**${await t('current now:', langCode)}** ${currentState ? await t('Allowed', langCode) : await t('Denied', langCode)}`)
        .setColor('#ADD8E6');

    await interaction.editReply({ embeds: [embed], components: [buttonRow] });

    const filter = i => (i.customId === 'allow_delete' || i.customId === 'deny_delete') && i.user.id === interaction.user.id;
    const response = await interaction.fetchReply().catch(() => null);
    if (!response) return;
    const collector = response.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate().catch(() => {});
            if (i.customId === 'allow_delete') {
                await db.setDeletePermission(interaction.guild.id, true).catch(() => {});
                const e = new EmbedBuilder().setTitle('✅ ' + await t('Permission Updated', langCode)).setDescription(await t('Administrators can now delete all emojis/stickers without approval.', langCode)).setColor('#ADD8E6');
                await i.editReply({ embeds: [e], components: [] }).catch(() => {});
            } else {
                await db.setDeletePermission(interaction.guild.id, false).catch(() => {});
                const e = new EmbedBuilder().setTitle('❌ ' + await t('Permission Updated', langCode)).setDescription(await t('Owner approval is now required for mass deletion.', langCode)).setColor('#FF0000');
                await i.editReply({ embeds: [e], components: [] }).catch(() => {});
            }
            collector.stop();
        } catch (err) {
            console.error('Error in delete_permission collector:', err);
        }
    });
}

module.exports = { execute };