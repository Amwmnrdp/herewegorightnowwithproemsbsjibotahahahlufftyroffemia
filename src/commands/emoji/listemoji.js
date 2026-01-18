const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const emojis = Array.from(interaction.guild.emojis.cache.values());
    const pageText = await t('Page', langCode);
    const emojisTitle = await t('Emojis', langCode);
    const noEmojis = await t('No emojis.', langCode);
    if (emojis.length === 0) {
        const embed = new EmbedBuilder().setDescription('❌ ' + noEmojis).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    let pages = [];
    let chunk = 50;
    for (let i = 0; i < emojis.length; i += chunk) {
        pages.push(emojis.slice(i, i + chunk).map(e => e.toString()).join(' '));
    }

    let page = 0;
    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle(`📋 ${emojisTitle}`)
        .setColor('#00FFFF')
        .setDescription(pages[page])
        .setFooter({ text: `${pageText} ${page + 1}/${pages.length} • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_emoji').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('next_emoji').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(pages.length <= 1)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });

    const storedLangCode = langCode;
    const filter = i => (i.customId === 'next_emoji' || i.customId === 'prev_emoji') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 180000 });

    collector.on('collect', async i => {
        try {
            if (i.customId === 'next_emoji') { page++; if (page >= pages.length) page = 0; }
            else { page--; if (page < 0) page = pages.length - 1; }

            const pageTextUpdate = await t('Page', storedLangCode);
            const emojisTitleUpdate = await t('Emojis', storedLangCode);
            const e = new EmbedBuilder()
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setTitle(`📋 ${emojisTitleUpdate}`)
                .setColor('#00FFFF')
                .setDescription(pages[page])
                .setFooter({ text: `${pageTextUpdate} ${page + 1}/${pages.length} • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

            const prevButton = new ButtonBuilder().setCustomId('prev_emoji').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0);
            const nextButton = new ButtonBuilder().setCustomId('next_emoji').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === pages.length - 1);
            const newRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

            await i.update({ embeds: [e], components: [newRow] });
        } catch (e) {}
    });

    collector.on('end', async () => {
        try {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev_emoji').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('next_emoji').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(true)
            );
            await interaction.editReply({ components: [disabledRow] });
        } catch (e) {}
    });
}

module.exports = { execute };
