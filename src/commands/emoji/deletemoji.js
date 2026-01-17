const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, convertedStickersToEmojis) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const emojisInput = interaction.options.getString('emojis');
    // Extract all emojis like <a:name:id> or <:name:id>
    const emojiMatches = Array.from(emojisInput.matchAll(/<(a)?:\w+:(\d+)>/g));

    if (emojiMatches.length === 0) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('No valid emojis found!', langCode)).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const results = {
        success: [],
        failed: [],
        notFound: []
    };

    for (const match of emojiMatches) {
        const emojiId = match[2];
        const emojiRaw = match[0];
        const emj = interaction.guild.emojis.cache.get(emojiId);

        if (!emj) {
            results.notFound.push(emojiRaw);
            continue;
        }

        try {
            await emj.delete();
            results.success.push(emojiRaw);
            
            // Clean up converted stickers map
            convertedStickersToEmojis.forEach((value, key) => {
                if (value.emojiId === emojiId) {
                    convertedStickersToEmojis.delete(key);
                }
            });
        } catch (error) {
            results.failed.push(emojiRaw);
            console.error(`⚠️ Discord Error in delete_emoji for ${emojiId}:`, error.code, error.message);
        }
    }

    let resultDescription = '';
    if (results.success.length > 0) {
        resultDescription += `✅ **${await t('Deleted', langCode)}:** ${results.success.length} ${await t('emojis', langCode)}\n`;
    }
    if (results.notFound.length > 0) {
        resultDescription += `❌ **${await t('Not found', langCode)}:** ${results.notFound.length}\n`;
    }
    if (results.failed.length > 0) {
        resultDescription += `⚠️ **${await t('Failed to delete', langCode)}:** ${results.failed.length}\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle('🗑️ ' + await t('Multi-Emoji Deletion', langCode))
        .setDescription(resultDescription || await t('No actions were performed.', langCode))
        .setColor(results.failed.length > 0 ? '#FFA500' : '#00FFFF')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
