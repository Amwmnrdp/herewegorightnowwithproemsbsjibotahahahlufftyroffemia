const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const isImageUrl = require('is-image-url');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, usedUrls) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const nameOption = interaction.options.getString('name');
    const urlOption = interaction.options.getString('url');
    const attachment = interaction.options.getAttachment('attachment');

    // Clean name for Discord (2-32 chars, alphanumeric + underscores)
    const cleanedName = nameOption.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32);
    if (cleanedName.length < 2) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Emoji name must be between 2 and 32 characters.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (urlOption && attachment) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('You cannot provide both a URL and an attachment!', langCode))
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const db = require('../../utils/database');
    const finalUrl = attachment ? attachment.url : urlOption;

    if (!finalUrl) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('You must provide either a URL or an attachment!', langCode))
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // Memory check for images
    const imageTrackingKey = `${interaction.guild.id}:${finalUrl}`;
    if (usedUrls[imageTrackingKey]) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + await t('Image Already Converted!', langCode))
            .setDescription(await t('This image has already been converted to an emoji!', langCode))
            .setColor('#FF9900')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    try {
        const emj = await interaction.guild.emojis.create({ attachment: finalUrl, name: cleanedName });
        usedUrls[imageTrackingKey] = emj.id;
        await db.addEmojiRecord(interaction.guild.id, emj.id, emj.name, interaction.user.tag);
        const embed = new EmbedBuilder().setDescription('✅ ' + await t('Image converted to emoji!', langCode)).setColor('#00FF00').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        const errorMsg = error.code === 50138 ? 
            await t('Image must be under 256KB', langCode) :
            error.code === 50035 ?
            await t('Invalid request:', langCode) + ' ' + (error.errors?.name?._errors?.[0] || error.message) :
            await t('Error:', langCode) + ' ' + error.message;
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
        console.error(`⚠️ Discord Error in image_to_emoji:`, error.code, error.message);
    }
}

module.exports = { execute };
