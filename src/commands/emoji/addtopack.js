const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (interaction.guild.id !== '1118153648938160191' || interaction.user.id !== '815701106235670558') {
        const errMsg = await t('🚫 This command is restricted to the bot owner in a specific server.', langCode);
        return await interaction.editReply({ content: errMsg });
    }

    const emojiStr = interaction.options.getString('emoji');
    const packName = interaction.options.getString('pack_select');

    let emojiId = emojiStr;
    let emojiName = emojiStr;
    const emojiMatch = emojiStr.match(/<a?:(\w+):(\d+)>/);
    if (emojiMatch) {
        emojiName = emojiMatch[1];
        emojiId = emojiMatch[2];
    }

    const exists = await db.isEmojiInPack(emojiId, packName);
    if (exists) {
        const errorTitle = await t('Duplicate Emoji', langCode);
        const errorMsg = await t('This emoji already exists in the {pack}.', langCode);
        
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + errorTitle)
            .setDescription(errorMsg.replace('{pack}', packName.charAt(0).toUpperCase() + packName.slice(1) + ' Pack'))
            .setColor('#FFA500');

        return await interaction.editReply({ embeds: [embed] });
    }

    await db.addEmojiToPack(emojiId, emojiName, packName);

    const successTitle = await t('Success!', langCode);
    const successMsg = await t('Added {emoji} to {pack} successfully.', langCode);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ ' + successTitle)
        .setDescription(successMsg.replace('{emoji}', emojiStr).replace('{pack}', packName.charAt(0).toUpperCase() + packName.slice(1) + ' Pack'))
        .setColor('#00FF00');

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };