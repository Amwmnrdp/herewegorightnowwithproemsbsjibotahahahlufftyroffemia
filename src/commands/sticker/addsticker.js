const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need permission!', langCode)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed], flags: 64 });
        return;
    }

    const name = interaction.options.getString('name');

    const serverStickers = await interaction.guild.stickers.fetch();
    if (serverStickers.size >= 5) {
        const limitText = await t('Maximum number of stickers reached (5)', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + limitText).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (name) {
        const duplicate = serverStickers.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
            const duplicateText = await t('A sticker with the name "{name}" already exists!', langCode);
            const embed = new EmbedBuilder().setDescription('❌ ' + duplicateText.replace('{name}', name)).setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
    }

    const titleText = await t('Add Sticker', langCode);
    const descText = await t('Reply to this message using the sticker you want to add to the server.', langCode);
    const footerPrefix = await t('Waiting for your sticker...', langCode);
    const embed = new EmbedBuilder()
        .setTitle('🎨 ' + titleText)
        .setDescription(descText)
        .setColor('#00FFFF')
        .setFooter({ text: footerPrefix + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const response = await interaction.editReply({ embeds: [embed], fetchReply: true });
    
    return response;
}

module.exports = { execute };
