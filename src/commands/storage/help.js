const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const WEBSITE_URL = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:3000';

    const helpContent = `**${await t('Welcome, this is my help menu', langCode)}**
⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Get emoji suggestions if you do not have Nitro', langCode)}: **/suggest_emojis**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Search for specific emojis by name', langCode)}: **/emoji_search**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Add a new emoji to your server', langCode)}: **/add_emoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Convert an image URL or attachment into an emoji', langCode)}: **/image_to_emoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Rename an existing server emoji', langCode)}: **/rename_emoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Delete an emoji from your server', langCode)}: **/delete_emoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Delete all emojis from your server', langCode)}: **/delete_all_emojis**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('List all current server emojis', langCode)}: **/list_emojis**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Improve an emoji\'s quality and add it', langCode)}: **/enhance_emoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Convert an existing emoji into a beautiful sticker', langCode)}: **/emoji_to_sticker**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Convert an emoji back into an image file', langCode)}: **/emoji_to_image**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Add a new sticker to your server', langCode)}: **/add_sticker**

⌄ـــــــــــــــــــــــــــProEmojiــــــــــــــــــــــــــــ--⌄

${await t('Convert an image URL or attachment into a sticker', langCode)}: **/image_to_sticker**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Rename an existing server sticker', langCode)}: **/rename_sticker**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Delete a sticker from your server', langCode)}: **/delete_sticker**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Delete all stickers from your server', langCode)}: **/delete_all_stickers**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('List all current server stickers', langCode)}: **/list_stickers**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Convert a sticker into a server emoji', langCode)}: **/sticker_to_emoji**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Convert a sticker back into an image file', langCode)}: **/sticker_to_image**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Improve a sticker\'s quality and save it', langCode)}: **/enhance_sticker**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Set suggestion permissions (Owner only)', langCode)}: **/permission**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Change the bot\'s language setting (Owner only)', langCode)}: **/language**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('View bot status, latency, and vote status', langCode)}: **/status**

⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄

${await t('Access the bot\'s control panel', langCode)}: 🔗 [ProEmoji dashboard](${WEBSITE_URL})`;

    const embed = new EmbedBuilder()
        .setTitle('📖 ' + await t('ProEmoji Help', langCode))
        .setDescription(helpContent)
        .setColor('#0099ff');

    try {
        await interaction.user.send({ embeds: [embed] });
        const replyEmbed = new EmbedBuilder()
            .setTitle('✅ Help Sent')
            .setDescription('Check your private messages for the help menu!')
            .setColor('#10b981');
        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Could not send DM')
            .setDescription('Please enable DMs from server members and try again.')
            .setColor('#FF6B6B');
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

module.exports = { execute };
