const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');

function getEmojiLimit(premiumTier) {
    switch (premiumTier) {
        case 1: return 100;
        case 2: return 150;
        case 3: return 250;
        default: return 50;
    }
}

async function execute(interaction, langCode, client) {
    const mainEmbed = new EmbedBuilder()
        .setTitle('🎁 ' + await t('Emoji Pack', langCode))
        .setDescription(await t('Select an emoji pack category to view and add emojis:', langCode))
        .setColor('#00FFFF');

    const select = new StringSelectMenuBuilder()
        .setCustomId('emoji_pack_select')
        .setPlaceholder(await t('Select a category', langCode))
        .addOptions([
            { label: await t('Anime Pack', langCode), value: 'anime', emoji: '🎌' },
            { label: await t('Games Pack', langCode), value: 'game', emoji: '🎮' },
            { label: await t('Romantic Pack', langCode), value: 'romantic', emoji: '💖' }
        ]);

    const row = new ActionRowBuilder().addComponents(select);
    const response = await interaction.editReply({ embeds: [mainEmbed], components: [row] });

    const collector = response.createMessageComponentCollector({ 
        filter: i => i.user.id === interaction.user.id, 
        time: 300000 
    });

    let currentCategory = null;
    let page = 0;
    const pageSize = 5;

    const generateDisplay = async (category, resetPage = false) => {
        if (resetPage) page = 0;
        
        const allInPack = await db.getEmojisByPack(category);
        const serverEmojiIds = interaction.guild.emojis.cache.map(e => e.id);
        
        if (allInPack.length === 0) {
            const noMoreMsg = await t('No emojis in this pack yet. More will be added in the future.', langCode);
            const suggestMsg = await t('Suggest more emojis so we can add them, {link}', langCode);
            
            return {
                embeds: [new EmbedBuilder()
                    .setTitle('🎁 ' + await t('Emoji Pack', langCode))
                    .setDescription(`❌ ${noMoreMsg}\n\n💡 ${suggestMsg.replace('{link}', '[Here](https://discord.gg/qTHehSfaW4)')}`)
                    .setColor('#FF0000')],
                components: [new ActionRowBuilder().addComponents(select)]
            };
        }

        const totalPages = Math.ceil(allInPack.length / pageSize);
        if (page >= totalPages) page = 0;

        const display = allInPack.slice(page * pageSize, (page + 1) * pageSize);
        const emojiList = [];
        const availableForAdd = [];
        
        for (const e of display) {
            const alreadyInServer = serverEmojiIds.includes(e.emoji_id);
            const isAnimated = e.animated === true || e.animated === 't';
            const emojiFormat = isAnimated 
                ? `<a:${e.emoji_name}:${e.emoji_id}>`
                : `<:${e.emoji_name}:${e.emoji_id}>`;
            
            if (alreadyInServer) {
                emojiList.push(`${emojiFormat} \`${e.emoji_name}\` ✅`);
            } else {
                emojiList.push(`${emojiFormat} \`${e.emoji_name}\``);
                availableForAdd.push(e);
            }
        }

        const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1) + ' Pack';
        const totalAvailable = allInPack.filter(e => !serverEmojiIds.includes(e.emoji_id)).length;
        
        const packEmbed = new EmbedBuilder()
            .setTitle(`🎁 ${await t(categoryLabel, langCode)}`)
            .setDescription(
                await t('Emojis in this pack:', langCode) + ` (${allInPack.length} total, ${totalAvailable} available)\n\n` + 
                emojiList.map((e, idx) => `${(page * pageSize) + idx + 1}. ${e}`).join('\n') +
                '\n\n✅ = Already in your server'
            )
            .setFooter({ text: `Page ${page + 1}/${totalPages}` })
            .setColor('#00FFFF');

        const hasAvailableOnPage = availableForAdd.length > 0;
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('pack_add')
                .setLabel(await t('Add to Server', langCode))
                .setStyle(ButtonStyle.Success)
                .setDisabled(!hasAvailableOnPage),
            new ButtonBuilder()
                .setCustomId('pack_prev')
                .setLabel('◀')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('pack_next')
                .setLabel('▶')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId('pack_reset')
                .setLabel(await t('First Page', langCode))
                .setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [packEmbed], components: [new ActionRowBuilder().addComponents(select), buttons] };
    };

    collector.on('collect', async i => {
        try {
            if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
            
            if (i.isStringSelectMenu()) {
                currentCategory = i.values[0];
                const display = await generateDisplay(currentCategory, true);
                await i.editReply(display).catch(() => {});
            } else if (i.isButton()) {
                if (i.customId === 'pack_reset') {
                    const display = await generateDisplay(currentCategory, true);
                    await i.editReply(display).catch(() => {});
                } else if (i.customId === 'pack_prev') {
                    page = Math.max(0, page - 1);
                    const display = await generateDisplay(currentCategory);
                    await i.editReply(display).catch(() => {});
                } else if (i.customId === 'pack_next') {
                    page++;
                    const display = await generateDisplay(currentCategory);
                    await i.editReply(display).catch(() => {});
                } else if (i.customId === 'pack_add') {
                    const allInPack = await db.getEmojisByPack(currentCategory);
                    const serverEmojiIds = interaction.guild.emojis.cache.map(e => e.id);
                    const available = allInPack.filter(e => !serverEmojiIds.includes(e.emoji_id));
                    const currentEmojis = available.slice(page * pageSize, (page + 1) * pageSize);

                    const emojiLimit = getEmojiLimit(interaction.guild.premiumTier);
                    const currentEmojiCount = interaction.guild.emojis.cache.size;
                    const slotsAvailable = emojiLimit - currentEmojiCount;

                    if (slotsAvailable <= 0) {
                        const limitReachedMsg = await t('Cannot add emojis. Your server has reached the emoji limit: {limit} emojis.', langCode);
                        const limitEmbed = new EmbedBuilder()
                            .setDescription('⚠️ ' + limitReachedMsg.replace('{limit}', emojiLimit))
                            .setColor('#FFA500');
                        await i.editReply({ embeds: [limitEmbed], components: [new ActionRowBuilder().addComponents(select)] }).catch(() => {});
                        return;
                    }

                    let added = 0;
                    let hitLimit = false;
                    
                    for (const e of currentEmojis) {
                        if (added >= slotsAvailable) {
                            hitLimit = true;
                            break;
                        }
                        
                        try {
                            const isAnimated = e.animated === true || e.animated === 't';
                            const ext = isAnimated ? 'gif' : 'png';
                            const cdnUrl = `https://cdn.discordapp.com/emojis/${e.emoji_id}.${ext}`;
                            await interaction.guild.emojis.create({ attachment: cdnUrl, name: e.emoji_name });
                            added++;
                        } catch (err) { 
                            console.error('Error adding emoji:', err);
                            if (err.code === 30008) {
                                hitLimit = true;
                                break;
                            }
                        }
                    }

                    let resultEmbed;
                    if (hitLimit && added > 0) {
                        const partialSuccessMsg = await t('{count} emoji(s) added. The rest were not added because the server emoji limit has been reached: {limit} emojis.', langCode);
                        resultEmbed = new EmbedBuilder()
                            .setDescription('⚠️ ' + partialSuccessMsg.replace('{count}', added).replace('{limit}', emojiLimit))
                            .setColor('#FFA500');
                    } else if (hitLimit && added === 0) {
                        const limitReachedMsg = await t('Cannot add emojis. Your server has reached the emoji limit: {limit} emojis.', langCode);
                        resultEmbed = new EmbedBuilder()
                            .setDescription('⚠️ ' + limitReachedMsg.replace('{limit}', emojiLimit))
                            .setColor('#FFA500');
                    } else if (added === 0) {
                        resultEmbed = new EmbedBuilder()
                            .setDescription('❌ ' + await t('No emojis were added. They may already exist in your server.', langCode))
                            .setColor('#FF0000');
                    } else {
                        const successText = await t('Successfully added {count} emojis from the pack!', langCode);
                        resultEmbed = new EmbedBuilder()
                            .setDescription('✅ ' + successText.replace('{count}', added))
                            .setColor('#00FFFF');
                    }
                    
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
