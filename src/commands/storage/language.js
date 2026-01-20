const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { t } = require('../../utils/languages');
const { SUPPORTED_LANGUAGES } = require('../../utils/constants');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder().setDescription(await t('Need ADMINISTRATOR permission!', langCode)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const currentLang = SUPPORTED_LANGUAGES[langCode] || SUPPORTED_LANGUAGES['en'];
    const embed = new EmbedBuilder()
        .setTitle('🌐 ' + await t('Choose Language', langCode))
        .setColor('#00FFFF')
        .setDescription(await t('Select your preferred language from the dropdown menu below:', langCode) + `\n\n**${await t('Current', langCode)}:** ${currentLang.flag} ${currentLang.native}`);

    const options = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => {
        const option = {
            label: `${info.name} - ${info.native}`,
            description: info.name,
            value: code,
            default: code === langCode
        };
        
        if (info.flag.includes(':')) {
            const match = info.flag.match(/:(\d+)>/);
            if (match) {
                option.emoji = match[1];
            } else {
                option.emoji = info.flag;
            }
        } else {
            option.emoji = info.flag;
        }
        
        return option;
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('language_select')
        .setPlaceholder(await t('Choose a language...', langCode))
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const msgResponse = await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => null);
    if (!msgResponse) return;
    const msg = msgResponse;
    
    const filter = i => i.customId === 'language_select' && i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });
    
    collector.on('end', async collected => {
        if (collected.size === 0) {
            const disabledSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('language_select')
                .setPlaceholder(await t('Choose a language...', langCode))
                .setDisabled(true)
                .addOptions(options);
            const disabledRow = new ActionRowBuilder().addComponents(disabledSelectMenu);
            msg.edit({ components: [disabledRow] }).catch(() => {});
        }
    });
}

module.exports = { execute };
