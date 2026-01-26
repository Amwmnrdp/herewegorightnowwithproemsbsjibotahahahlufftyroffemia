const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, usedUrls) {
    if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply().catch(() => {});
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const nameOption = interaction.options.getString('name');
    const urlOption = interaction.options.getString('url');

    const cleanedName = nameOption.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32);
    if (cleanedName.length < 2) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Emoji name must be between 2 and 32 characters.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (!urlOption) {
        const titleText = await t('Convert Image to Emoji', langCode);
        const descText = await t('Reply to this message with the image you want to convert into an emoji.', langCode);
        const embed = new EmbedBuilder()
            .setTitle('🖼️ ' + titleText)
            .setDescription(descText)
            .setColor('#00FFFF')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

        const response = await interaction.editReply({ embeds: [embed], fetchReply: true });
        return { waitingForImage: true, messageId: response.id, emojiName: cleanedName, userId: interaction.user.id, langCode, guildId: interaction.guild.id };
    }

    const db = require('../../utils/database');
    const finalUrl = urlOption;

    const imageTrackingKey = `${interaction.guild.id}:${finalUrl}`;
    if (usedUrls[imageTrackingKey]) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + await t('Image Already Converted!', langCode))
            .setDescription(await t('This image has already been converted to an emoji!', langCode))
            .setColor('#FF9900')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    try {
        const serverEmojis = await interaction.guild.emojis.fetch();
        if (serverEmojis.find(e => e.name.toLowerCase() === cleanedName.toLowerCase())) {
            const duplicateText = await t('An emoji with the name "{name}" already exists!', langCode);
            const embed = new EmbedBuilder().setDescription('❌ ' + duplicateText.replace('{name}', cleanedName)).setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        const emj = await interaction.guild.emojis.create({ attachment: finalUrl, name: cleanedName });
        usedUrls[imageTrackingKey] = emj.id;
        await db.addEmojiRecord(interaction.guild.id, emj.id, emj.name, interaction.user.tag);
        const convertedText = await t('Image converted to emoji!', langCode);
        const nameText = await t('Name:', langCode);
        const typeText = await t('Type:', langCode);
        const animatedText = emj.animated ? await t('Animated', langCode) : await t('Static', langCode);
        const embed = new EmbedBuilder()
            .setTitle('✅ ' + await t('Emoji Created!', langCode))
            .setDescription(`${convertedText}\n\n${emj.toString()} **${nameText}** \`${cleanedName}\`\n**${typeText}** ${animatedText}`)
            .setThumbnail(emj.imageURL())
            .setColor('#00FF00')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const errorMsg = error.code === 50138 ? 
            await t('Image must be under 256KB', langCode) :
            error.code === 50035 ?
            await t('Invalid request:', langCode) + ' ' + (error.errors?.name?._errors?.[0] || error.message) :
            await t('Error:', langCode) + ' ' + error.message;
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        console.error(`⚠️ Discord Error in image_to_emoji:`, error.code, error.message);
    }
}

module.exports = { execute };
