const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const emojis = Array.from(interaction.guild.emojis.cache.values());
    const pageText = await t('Page', langCode);
    const emojisTitle = await t('Emojis', langCode);
    const noEmojis = await t('No emojis.', langCode);
    const totalText = await t('Total', langCode);
    const animatedText = await t('Animated', langCode);
    const staticText = await t('Static', langCode);
    
    if (emojis.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📋 ' + emojisTitle)
            .setDescription('❌ ' + noEmojis)
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    
    const animatedCount = emojis.filter(e => e.animated).length;
    const staticCount = emojis.length - animatedCount;
    
    let pages = [];
    let chunk = 25;
    for (let i = 0; i < emojis.length; i += chunk) {
        const pageEmojis = emojis.slice(i, i + chunk);
        const emojiDisplay = pageEmojis.map(e => e.toString()).join(' ');
        pages.push(emojiDisplay);
    }

    let page = 0;
    const statsLine = `📊 **${totalText}:** ${emojis.length} | 🎞️ **${animatedText}:** ${animatedCount} | 🖼️ **${staticText}:** ${staticCount}`;
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle(`📋 ${emojisTitle}`)
        .setColor('#00FFFF')
        .setDescription(`${statsLine}\n\n${pages[page]}`)
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
            if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
            
            if (i.customId === 'next_emoji') { page++; if (page >= pages.length) page = 0; }
            else { page--; if (page < 0) page = pages.length - 1; }

            const pageTextUpdate = await t('Page', storedLangCode);
            const emojisTitleUpdate = await t('Emojis', storedLangCode);
            const totalTextUpdate = await t('Total', storedLangCode);
            const animatedTextUpdate = await t('Animated', storedLangCode);
            const staticTextUpdate = await t('Static', storedLangCode);
            const statsLineUpdate = `📊 **${totalTextUpdate}:** ${emojis.length} | 🎞️ **${animatedTextUpdate}:** ${animatedCount} | 🖼️ **${staticTextUpdate}:** ${staticCount}`;
            
            const e = new EmbedBuilder()
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setTitle(`📋 ${emojisTitleUpdate}`)
                .setColor('#00FFFF')
                .setDescription(`${statsLineUpdate}\n\n${pages[page]}`)
                .setFooter({ text: `${pageTextUpdate} ${page + 1}/${pages.length} • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

            const prevButton = new ButtonBuilder().setCustomId('prev_emoji').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0);
            const nextButton = new ButtonBuilder().setCustomId('next_emoji').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === pages.length - 1);
            const newRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

            await i.editReply({ embeds: [e], components: [newRow] }).catch(() => {});
        } catch (e) {
            console.error('Error in listemoji collector:', e);
        }
    });

    collector.on('end', async () => {
        try {
            const currentMsg = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
            if (currentMsg) {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev_emoji').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next_emoji').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(true)
                );
                await interaction.editReply({ components: [disabledRow] }).catch(() => {});
            }
        } catch (e) {}
    });
}

module.exports = { execute };
