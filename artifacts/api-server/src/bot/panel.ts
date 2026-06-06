import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type TextChannel,
  type Message,
} from "discord.js";

export function buildPanelEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("✦ Larpathon — 4L Username Service")
    .setDescription(
      [
        `> Instantly claim a rare **4-letter Discord username** straight to your inbox.`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `**▸ How to claim**`,
        `Press **✦ Claim Username** below. Your username will arrive in your **DMs** within seconds.`,
        ``,
        `**▸ Check availability**`,
        `Press **Stock** to see how many usernames are left.`,
        ``,
        `**▸ Note**`,
        `Make sure your DMs are open before claiming.`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
    )
    .setFooter({ text: `Larpathon · @9wp9 · Serving since 2026` })
    .setTimestamp();
}

export function buildPanelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("generate_username")
      .setLabel("✦ Claim Username")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("check_stock")
      .setLabel("Stock")
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function sendPanel(channel: TextChannel): Promise<Message> {
  return channel.send({
    embeds: [buildPanelEmbed()],
    components: [buildPanelRow()],
  });
}

export async function updatePanelMessage(message: Message): Promise<void> {
  try {
    await message.edit({
      embeds: [buildPanelEmbed()],
      components: [buildPanelRow()],
    });
  } catch {
    // message deleted
  }
}
