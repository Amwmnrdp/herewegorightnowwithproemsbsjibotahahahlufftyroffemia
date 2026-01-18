const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const emojiInput = interaction.options.getString('emoji');
    let emojiUrl = '';

    // Check if it's a custom emoji
    const customEmojiMatch = emojiInput.match(/<a?:.+:(\d+)>/);
    if (customEmojiMatch) {
        const emojiId = customEmojiMatch[1];
        const isAnimated = emojiInput.startsWith('<a:');
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=1024`;
    } else {
        // Handle standard unicode emoji (not ideal but we can try)
        const onlyCustomText = await t('Only custom emojis are supported for this command.', langCode);
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + onlyCustomText)
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const titleText = await t('Emoji to Image', langCode);
    const descText = await t('Here is the image of the emoji:', langCode);
    const embed = new EmbedBuilder()
        .setTitle('🖼️ ' + titleText)
        .setDescription(descText)
        .setImage(emojiUrl)
        .setColor('#00FF00')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
