const { EmbedBuilder } = require('discord.js');
const { parseEmoji } = require('../../utils/helpers');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');

async function execute(interaction, langCode) {
    const emoji = interaction.options.getString('emoji');
    const name = interaction.options.getString('name');
    let info = parseEmoji(emoji);

    if (!info.id) {
        const errorText = await t('Invalid emoji!', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + errorText).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const serverEmojis = await interaction.guild.emojis.fetch();
    if (await db.isEmojiInDb(interaction.guild.id, info.id) || serverEmojis.has(info.id)) {
        const alreadyExistsText = await t('already exists!', langCode);
        const embed = new EmbedBuilder().setDescription('⚠️ ' + emoji + ' ' + alreadyExistsText).setColor('#FF9900').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const emojiName = name || info.name;
    if (serverEmojis.find(e => e.name.toLowerCase() === emojiName.toLowerCase())) {
        const duplicateText = await t('An emoji with the name "{name}" already exists!', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + duplicateText.replace('{name}', emojiName)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    try {
        let type = info.animated ? '.gif' : '.png';
        let url = `https://cdn.discordapp.com/emojis/${info.id + type}`;
        const emj = await interaction.guild.emojis.create({ attachment: url, name: emojiName, reason: `By ${interaction.user.tag}` });
        await db.addEmojiRecord(interaction.guild.id, emj.id, emj.name, interaction.user.tag);
        const addedText = await t('Added!', langCode);
        const embed = new EmbedBuilder().setDescription('✅ ' + addedText + ' ' + emj.toString()).setColor('#00FFFF').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const errorPrefix = await t('Error:', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + errorPrefix + ' ' + error.message).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { execute };
