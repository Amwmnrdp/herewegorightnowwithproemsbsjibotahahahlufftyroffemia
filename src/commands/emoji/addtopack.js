const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (interaction.guild.id !== '1118153648938160191' || interaction.user.id !== '815701106235670558') {
        const errMsg = await t('🚫 This command is restricted to the bot owner in a specific server.', langCode);
        return await interaction.editReply({ content: errMsg });
    }

    const emojiStr = interaction.options.getString('emoji');
    const packName = interaction.options.getString('pack_select');

    const emojiInputs = emojiStr.split(/\s+/).filter(e => e.trim());
    const addedEmojis = [];
    const duplicateEmojis = [];
    const invalidEmojis = [];

    for (const input of emojiInputs) {
        const emojiMatch = input.match(/<(a)?:(\w+):(\d+)>/);
        if (!emojiMatch) {
            invalidEmojis.push(input);
            continue;
        }

        const isAnimated = emojiMatch[1] === 'a';
        const emojiName = emojiMatch[2];
        const emojiId = emojiMatch[3];

        const exists = await db.isEmojiInPack(emojiId, packName);
        if (exists) {
            duplicateEmojis.push(input);
            continue;
        }

        await db.addEmojiToPack(emojiId, emojiName, packName, isAnimated);
        addedEmojis.push(input);
    }

    const packLabel = packName.charAt(0).toUpperCase() + packName.slice(1) + ' Pack';
    let description = '';

    if (addedEmojis.length > 0) {
        description += `✅ **Added to ${packLabel}:**\n${addedEmojis.join(' ')}\n\n`;
    }
    if (duplicateEmojis.length > 0) {
        description += `⚠️ **Already in pack:**\n${duplicateEmojis.join(' ')}\n\n`;
    }
    if (invalidEmojis.length > 0) {
        description += `❌ **Invalid format:**\n${invalidEmojis.join(' ')}`;
    }

    const embed = new EmbedBuilder()
        .setTitle(addedEmojis.length > 0 ? '✅ Success!' : '⚠️ No Emojis Added')
        .setDescription(description.trim() || 'No emojis were processed.')
        .setColor(addedEmojis.length > 0 ? '#00FF00' : '#FFA500');

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
