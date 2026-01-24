const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const db = require('../../utils/database');
    const perms = await db.getServerPermissions(interaction.guild.id);
    
    const emojiAllowed = perms.emoji_permission_enabled;
    const emojiStatus = emojiAllowed ? '`🟢`' : '`🔴`';
    
    const stickerAllowed = perms.sticker_permission_enabled;
    const stickerStatus = stickerAllowed ? '`🟢`' : '`🔴`';
    
    const deleteAllowed = perms.delete_permission_enabled;
    const deleteStatus = deleteAllowed ? '`🟢`' : '`🔴`';

    const serverStatusTitle = await t('Server Status', langCode);
    const emojiPermText = await t('Emoji Suggestions', langCode);
    const stickerPermText = await t('Sticker Suggestions', langCode);
    const deletePermText = await t('Admin Deletion', langCode);
    const serverStatsText = await t('Server Stats', langCode);
    const emojisText = await t('Emojis', langCode);
    const stickersText = await t('Stickers', langCode);
    const permissionsText = await t('Permissions', langCode);
    const allowedText = await t('Allowed', langCode);
    const deniedText = await t('Denied', langCode);
    
    const emojiCount = interaction.guild.emojis.cache.size;
    const stickerCount = interaction.guild.stickers.cache.size;
    const animatedCount = interaction.guild.emojis.cache.filter(e => e.animated).size;
    const staticCount = emojiCount - animatedCount;

    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle('📊 ' + serverStatusTitle)
        .addFields(
            { 
                name: `📁 ${serverStatsText}`, 
                value: `> ${emojisText}: **${emojiCount}** (\`🎞️ ${animatedCount}\` | \`🖼️ ${staticCount}\`)\n> ${stickersText}: **${stickerCount}**`, 
                inline: false 
            },
            { 
                name: `🔐 ${permissionsText}`, 
                value: `> ${emojiPermText}: ${emojiStatus} ${emojiAllowed ? allowedText : deniedText}\n> ${stickerPermText}: ${stickerStatus} ${stickerAllowed ? allowedText : deniedText}\n> ${deletePermText}: ${deleteStatus} ${deleteAllowed ? allowedText : deniedText}`, 
                inline: false 
            }
        )
        .setColor('#00BFFF')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] }).catch(() => {});
}

module.exports = { execute };
