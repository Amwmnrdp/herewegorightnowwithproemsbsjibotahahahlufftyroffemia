const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const db = require('../../utils/database');
    const perms = await db.getServerPermissions(interaction.guild.id);
    
    // 1. Emoji Permission
    const emojiAllowed = perms.emoji_permission_enabled;
    const emojiStatus = (emojiAllowed ? '🟢 ' : '🔴 ') + (emojiAllowed ? await t('Allowed', langCode) : await t('Denied', langCode));
    
    // 2. Sticker Permission
    const stickerAllowed = perms.sticker_permission_enabled;
    const stickerStatus = (stickerAllowed ? '🟢 ' : '🔴 ') + (stickerAllowed ? await t('Allowed', langCode) : await t('Denied', langCode));
    
    // 3. Delete Permission
    const deleteAllowed = perms.delete_permission_enabled;
    const deleteStatus = (deleteAllowed ? '🟢 ' : '🔴 ') + (deleteAllowed ? await t('Allowed', langCode) : await t('Denied', langCode));

    const botStatus = await t('Bot Status', langCode);
    const emojiPermText = await t('Emoji Permission', langCode);
    const stickerPermText = await t('Sticker Permission', langCode);
    const deletePermText = await t('Delete Permission', langCode);

    const embed = new EmbedBuilder()
        .setTitle('📊 ' + botStatus)
        .addFields(
            { name: emojiPermText, value: emojiStatus, inline: false },
            { name: stickerPermText, value: stickerStatus, inline: false },
            { name: deletePermText, value: deleteStatus, inline: false }
        )
        .setColor('#00FFFF')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] }).catch(() => {});
}

module.exports = { execute };
