import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  type TextChannel,
} from "discord.js";
import {
  getStock,
  popUsername,
  addUsernames,
  deleteFirst,
  viewList,
} from "./storage.js";
import { sendPanel } from "./panel.js";
import { logger } from "../lib/logger.js";

const ADMIN_ROLE_ID = process.env["DISCORD_ADMIN_ROLE_ID"]!;
const COOLDOWN_MS = 40_000;
const generateCooldowns = new Map<string, number>();

const FOOTER = "Larpathon · @9wp9";

function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.member;
  if (!member || !("roles" in member)) return false;
  const roles = member.roles;
  if (typeof roles === "string") return false;
  return roles.cache.has(ADMIN_ROLE_ID);
}

export const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Post the username service panel in this channel"),

  new SlashCommandBuilder()
    .setName("stock")
    .setDescription("Check how many usernames are currently available"),

  new SlashCommandBuilder()
    .setName("add")
    .setDescription("[Admin] Upload a .txt file to load usernames into stock")
    .addAttachmentOption((opt) =>
      opt
        .setName("file")
        .setDescription("Plain text file — one username per line")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("delete")
    .setDescription("[Admin] Remove the first N usernames from stock")
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("Number of usernames to remove from the top")
        .setRequired(true)
        .setMinValue(1),
    ),

  new SlashCommandBuilder()
    .setName("viewlist")
    .setDescription("[Admin] Export the top usernames from stock as a file")
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("How many to export (default: 20, max: 100)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100),
    ),
].map((cmd) => cmd.toJSON());

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { commandName } = interaction;

  // ── /panel ──────────────────────────────────────────────
  if (commandName === "panel") {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel as TextChannel;
    await sendPanel(channel);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setDescription("**✦ Panel posted successfully.**")
          .setFooter({ text: FOOTER }),
      ],
    });
    return;
  }

  // ── /stock ──────────────────────────────────────────────
  if (commandName === "stock") {
    const total = getStock();
    const bar =
      total > 0
        ? `\`\`\`fix\n${total.toLocaleString()} username${total !== 1 ? "s" : ""} in stock\`\`\``
        : `\`\`\`diff\n- No stock available right now\`\`\``;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("✦ Current Stock")
          .setDescription(
            [`**Availability**`, bar, `Use the panel button to claim one.`].join("\n"),
          )
          .setFooter({ text: FOOTER })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  // ── /add ────────────────────────────────────────────────
  if (commandName === "add") {
    if (!isAdmin(interaction)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("✦ Access Denied")
            .setDescription("You are not authorised to run this command.")
            .setFooter({ text: FOOTER }),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const attachment = interaction.options.getAttachment("file", true);

    if (!attachment.name?.endsWith(".txt")) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("✦ Invalid File")
            .setDescription("Only `.txt` files are accepted.")
            .setFooter({ text: FOOTER }),
        ],
      });
      return;
    }

    try {
      const res = await fetch(attachment.url);
      const text = await res.text();
      const added = addUsernames(text.split(/\r?\n/));
      const total = getStock();

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("✦ Stock Loaded")
            .setDescription(
              [
                `**Added** — \`${added.toLocaleString()}\` usernames`,
                `**Total stock** — \`${total.toLocaleString()}\` usernames`,
              ].join("\n"),
            )
            .setFooter({ text: FOOTER })
            .setTimestamp(),
        ],
      });
    } catch (err) {
      logger.error({ err }, "Failed to process uploaded file");
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("✦ Read Error")
            .setDescription("Could not read the file. Please try again.")
            .setFooter({ text: FOOTER }),
        ],
      });
    }
    return;
  }

  // ── /delete ─────────────────────────────────────────────
  if (commandName === "delete") {
    if (!isAdmin(interaction)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("✦ Access Denied")
            .setDescription("You are not authorised to run this command.")
            .setFooter({ text: FOOTER }),
        ],
        ephemeral: true,
      });
      return;
    }

    const count = interaction.options.getInteger("count", true);
    const removed = deleteFirst(count);
    const remaining = getStock();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("✦ Stock Trimmed")
          .setDescription(
            [
              `**Removed** — \`${removed.toLocaleString()}\` username${removed !== 1 ? "s" : ""}`,
              `**Remaining** — \`${remaining.toLocaleString()}\` username${remaining !== 1 ? "s" : ""}`,
            ].join("\n"),
          )
          .setFooter({ text: FOOTER })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  // ── /viewlist ────────────────────────────────────────────
  if (commandName === "viewlist") {
    if (!isAdmin(interaction)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("✦ Access Denied")
            .setDescription("You are not authorised to run this command.")
            .setFooter({ text: FOOTER }),
        ],
        ephemeral: true,
      });
      return;
    }

    const amount = interaction.options.getInteger("amount") ?? 20;
    const list = viewList(amount);
    const total = getStock();

    if (list.length === 0) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle("✦ Empty Stock")
            .setDescription("There are no usernames loaded right now.")
            .setFooter({ text: FOOTER }),
        ],
        ephemeral: true,
      });
      return;
    }

    const file = new AttachmentBuilder(Buffer.from(list.join("\n"), "utf-8"), {
      name: "stock-preview.txt",
    });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("✦ Stock Preview")
          .setDescription(
            [
              `Exporting **${list.length}** of **${total.toLocaleString()}** total usernames.`,
              `See the attached file below.`,
            ].join("\n"),
          )
          .setFooter({ text: FOOTER })
          .setTimestamp(),
      ],
      files: [file],
      ephemeral: true,
    });
    return;
  }
}

export async function handleStockButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const total = getStock();
  const bar =
    total > 0
      ? `\`\`\`fix\n${total.toLocaleString()} username${total !== 1 ? "s" : ""} in stock\`\`\``
      : `\`\`\`diff\n- No stock available right now\`\`\``;

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("✦ Current Stock")
        .setDescription(
          [`**Availability**`, bar, `Use **✦ Claim Username** to get one.`].join("\n"),
        )
        .setFooter({ text: FOOTER })
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

export async function handleGenerate(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
): Promise<void> {
  const userId = interaction.user.id;
  const now = Date.now();
  const lastUsed = generateCooldowns.get(userId) ?? 0;
  const remaining = COOLDOWN_MS - (now - lastUsed);

  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("✦ Slow Down")
          .setDescription(
            `You can claim another username in **${seconds}s**.\nHold tight — good things take a moment.`,
          )
          .setFooter({ text: FOOTER })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  generateCooldowns.set(userId, now);
  await interaction.deferReply({ ephemeral: true });

  const username = popUsername();

  if (!username) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("✦ Nothing Left")
          .setDescription(
            "Stock is empty right now. Check back later or contact an admin.",
          )
          .setFooter({ text: FOOTER })
          .setTimestamp(),
      ],
    });
    return;
  }

  try {
    const dm = await interaction.user.createDM();
    await dm.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("✦ Your Username")
          .setDescription(
            [
              `Here's your exclusive **4-letter Discord username**:`,
              ``,
              `\`\`\``,
              username,
              `\`\`\``,
              ``,
              `**How to apply it:**`,
              `→ Open Discord settings`,
              `→ Go to **My Account**`,
              `→ Change your username to the one above`,
              `→ Usernames are case-sensitive — copy it exactly`,
            ].join("\n"),
          )
          .setFooter({ text: `Larpathon · @9wp9 · 2026` })
          .setTimestamp(),
      ],
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✦ Sent to Your DMs")
          .setDescription(
            "Your username is waiting in your DMs.\nCan't see it? Enable **DMs from server members** in your privacy settings.",
          )
          .setFooter({ text: FOOTER })
          .setTimestamp(),
      ],
    });
  } catch {
    addUsernames([username]);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("✦ DMs Closed")
          .setDescription(
            "Couldn't reach your DMs — the username was returned to stock.\n\nEnable **DMs from server members** in your privacy settings and try again.",
          )
          .setFooter({ text: FOOTER })
          .setTimestamp(),
      ],
    });
  }
}
