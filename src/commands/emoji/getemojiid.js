const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    try {
        const emoji = interaction.options.getString('emoji');
        const match = emoji.match(/<a?:.+:(\d+)>/) || emoji.match(/^(\d+)$/);
        
        if (!match) {
            const errorText = await t('Invalid emoji! Please provide a custom emoji.', langCode);
            const embed = new EmbedBuilder().setDescription('❌ ' + errorText).setColor('#FF0000');
            return await interaction.editReply({ embeds: [embed] });
        }

        const emojiId = match[1];
        const embed = new EmbedBuilder()
            .setTitle('🆔 ' + await t('Emoji ID', langCode))
            .setDescription(`${await t('The ID of the emoji is:', langCode)} \`${emojiId}\``)
            .setColor('#00FFFF')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in get_emoji_id:', error);
        const errorText = await t('An error occurred while executing this command.', langCode);
        await interaction.editReply({ content: '❌ ' + errorText }).catch(() => {});
    }
}

module.exports = { execute };
