const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const emojiName = interaction.options.getString('name');

    const serverEmojis = await interaction.guild.emojis.fetch();
    if (serverEmojis.find(e => e.name.toLowerCase() === emojiName.toLowerCase())) {
        const duplicateText = await t('An emoji with the name "{name}" already exists!', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + duplicateText.replace('{name}', emojiName)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const titleText = await t('Reply with Sticker', langCode);
    const descText = await t('Reply to this message using the sticker you want to convert to an emoji.', langCode);
    const emojiNameText = await t('Emoji Name:', langCode);
    const footerPrefix = await t('Waiting for your sticker...', langCode);
    const embed = new EmbedBuilder()
        .setTitle('📌 ' + titleText)
        .setDescription(descText + `\n\n**${emojiNameText}** ${emojiName}`)
        .setColor('#00FFFF')
        .setFooter({ text: footerPrefix + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const response = await interaction.editReply({ embeds: [embed] });
    
    // Add to active sticker sessions
    const indexFile = require('../../../index.js');
    if (indexFile.activeStickerSessions) {
        indexFile.activeStickerSessions.set(interaction.user.id, {
            type: 'sticker_to_emoji',
            data: { name: emojiName },
            channelId: interaction.channelId,
            guildId: interaction.guildId
        });
    }

    return response;
}

module.exports = { execute };
