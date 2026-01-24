const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const stickers = Array.from(interaction.guild.stickers.cache.values());
    if (stickers.length === 0) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('No stickers.', langCode)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    let page = 0;
    const pageText = await t('Page', langCode);
    const stickersTitle = await t('Stickers', langCode);

    const createEmbed = async (pageNum) => {
        const sticker = stickers[pageNum];
        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTitle(`📌 ${stickersTitle}`)
            .setDescription(`**${await t('Name', langCode)}:** ${sticker.name}\n**ID:** ${sticker.id}`)
            .setImage(sticker.url)
            .setFooter({ text: `${pageText} ${pageNum + 1}/${stickers.length}` })
            .setColor('#FFA500');
        return embed;
    };

    const embed = await createEmbed(page);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_sticker').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('next_sticker').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(stickers.length <= 1)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });

    const filter = i => (i.customId === 'next_sticker' || i.customId === 'prev_sticker') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 180000 });

    collector.on('collect', async i => {
        try {
            if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
            
            if (i.customId === 'next_sticker') { 
                page++; 
                if (page >= stickers.length) page = 0; 
            } else { 
                page--; 
                if (page < 0) page = stickers.length - 1; 
            }

            const updatedEmbed = await createEmbed(page);
            const prevButton = new ButtonBuilder().setCustomId('prev_sticker').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0);
            const nextButton = new ButtonBuilder().setCustomId('next_sticker').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === stickers.length - 1);
            const newRow = new ActionRowBuilder().addComponents(prevButton, nextButton);

            await i.editReply({ embeds: [updatedEmbed], components: [newRow] }).catch(() => {});
        } catch (e) {
            console.error('Error in liststicker collector:', e);
        }
    });

    collector.on('end', async () => {
        try {
            const currentMsg = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
            if (currentMsg) {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev_sticker').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next_sticker').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(true)
                );
                await interaction.editReply({ components: [disabledRow] }).catch(() => {});
            }
        } catch (e) {}
    });
}

module.exports = { execute };
