const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { t } = require('../../utils/languages');

const PACKS = {
    anime: [
        { id: '1329415474773131346', name: 'Anime1' },
        { id: '1329415494050152509', name: 'Anime2' },
        { id: '1449046993727918254', name: 'Anime3' },
        { id: '1287169436398125137', name: 'Anime4' },
        { id: '1287414191497547868', name: 'Anime5' },
        { id: '1450504931420278979', name: 'Anime6' },
        { id: '1434970945113690192', name: 'Anime7' },
        { id: '1434970709133627524', name: 'Anime8' }
    ],
    game: [
        { id: '1329415510659715103', name: 'Game1' },
        { id: '1329415528825225256', name: 'Game2' }
    ],
    romantic: [
        { id: '1329415546252431441', name: 'Romantic1' },
        { id: '1329415563969171486', name: 'Romantic2' }
    ]
};

async function execute(interaction, langCode, client) {
    const mainEmbed = new EmbedBuilder()
        .setTitle('🎁 ' + await t('Emoji Pack', langCode))
        .setDescription(await t('Select an emoji pack category to view and add emojis:', langCode))
        .setColor('#00FFFF');

    const select = new StringSelectMenuBuilder()
        .setCustomId('emoji_pack_select')
        .setPlaceholder(await t('Select a category', langCode))
        .addOptions([
            { label: await t('Anime', langCode), value: 'anime', emoji: '🎌' },
            { label: await t('Game', langCode), value: 'game', emoji: '🎮' },
            { label: await t('Romantic', langCode), value: 'romantic', emoji: '💖' }
        ]);

    const row = new ActionRowBuilder().addComponents(select);
    const response = await interaction.editReply({ embeds: [mainEmbed], components: [row] });

    const collector = response.createMessageComponentCollector({ 
        filter: i => i.user.id === interaction.user.id, 
        time: 180000 
    });

    let currentCategory = null;
    let currentEmojis = [];

    const getAvailableEmojis = (category) => {
        const allInPack = PACKS[category] || [];
        const serverEmojiNames = interaction.guild.emojis.cache.map(e => e.name.toLowerCase());
        return allInPack.filter(e => !serverEmojiNames.includes(e.name.toLowerCase()));
    };

    const generateDisplay = async (category) => {
        const available = getAvailableEmojis(category);
        if (available.length === 0) {
            return {
                embeds: [new EmbedBuilder()
                    .setTitle('🎁 ' + await t('Emoji Pack', langCode))
                    .setDescription('❌ ' + await t('This pack is currently empty. More emojis will be added in the future!', langCode))
                    .setColor('#FF0000')],
                components: [new ActionRowBuilder().addComponents(select)]
            };
        }

        const display = available.sort(() => Math.random() - 0.5).slice(0, 5);
        currentEmojis = display;

        const emojiList = [];
        for (const e of display) {
            let found = null;
            for (const g of client.guilds.cache.values()) {
                const emoji = g.emojis.cache.get(e.id);
                if (emoji) { found = emoji; break; }
            }
            if (found) emojiList.push(found);
        }

        const packEmbed = new EmbedBuilder()
            .setTitle(`🎁 ${await t(category.charAt(0).toUpperCase() + category.slice(1), langCode)} Pack`)
            .setDescription(await t('Found these emojis in the pack:', langCode) + '\n\n' + emojiList.map((e, idx) => `${idx + 1}. ${e} (${e.name})`).join('\n'))
            .setColor('#00FFFF');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pack_add').setLabel(await t('Add', langCode)).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('pack_reset').setLabel(await t('Reset', langCode)).setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [packEmbed], components: [new ActionRowBuilder().addComponents(select), buttons] };
    };

    collector.on('collect', async i => {
        try {
            if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
            
            if (i.isStringSelectMenu()) {
                currentCategory = i.values[0];
                const display = await generateDisplay(currentCategory);
                await i.editReply(display).catch(() => {});
            } else if (i.isButton()) {
                if (i.customId === 'pack_reset') {
                    const display = await generateDisplay(currentCategory);
                    await i.editReply(display).catch(() => {});
                } else if (i.customId === 'pack_add') {
                    let added = 0;
                    for (const e of currentEmojis) {
                        try {
                            const allEmoji = Array.from(client.guilds.cache.values()).flatMap(g => Array.from(g.emojis.cache.values()));
                            const emojiObj = allEmoji.find(em => em.id === e.id);
                            if (emojiObj && !interaction.guild.emojis.cache.find(em => em.name === emojiObj.name)) {
                                await interaction.guild.emojis.create({ attachment: emojiObj.url, name: emojiObj.name });
                                added++;
                            }
                        } catch (err) { console.error('Error adding emoji:', err); }
                    }
                    const successText = await t('Successfully added {count} emojis from the pack!', langCode);
                    const resultEmbed = new EmbedBuilder()
                        .setDescription('✅ ' + successText.replace('{count}', added))
                        .setColor('#00FFFF');
                    await i.editReply({ embeds: [resultEmbed], components: [new ActionRowBuilder().addComponents(select)] }).catch(() => {});
                }
            }
        } catch (e) {
            console.error('Error in emojipack collector:', e);
        }
    });

    collector.on('end', async () => {
        try {
            const currentMsg = await interaction.channel.messages.fetch(response.id).catch(() => null);
            if (currentMsg) {
                const disabledComponents = currentMsg.components.map(row => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach(c => c.setDisabled(true));
                    return newRow;
                });
                await interaction.editReply({ components: disabledComponents }).catch(() => {});
            }
        } catch (e) {}
    });
}

module.exports = { execute };