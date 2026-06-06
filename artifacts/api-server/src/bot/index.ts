import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Events,
  ActivityType,
  PresenceUpdateStatus,
  type TextChannel,
  type Message,
  ButtonInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { commands, handleCommand, handleGenerate, handleStockButton } from "./commands.js";
import { updatePanelMessage } from "./panel.js";

const TOKEN = process.env["DISCORD_TOKEN"]!;
const GUILD_ID = process.env["DISCORD_GUILD_ID"]!;

const panelMessages: Map<string, Message> = new Map();

async function registerCommands(clientId: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  logger.info("Cleared global commands.");
  await rest.put(Routes.applicationGuildCommands(clientId, GUILD_ID), {
    body: commands,
  });
  logger.info("Slash commands registered to guild.");
}

function setIdleStatus(client: Client): void {
  const ping = client.ws.ping;
  const pingDisplay = ping < 0 ? "..." : `${ping}ms`;
  client.user?.setPresence({
    status: PresenceUpdateStatus.Idle,
    activities: [
      {
        name: `4L Generator - ${pingDisplay}`,
        type: ActivityType.Playing,
      },
    ],
  });
}

function startPanelAutoUpdate(client: Client): void {
  setInterval(async () => {
    // Update panel messages
    for (const [key, message] of panelMessages.entries()) {
      try {
        await updatePanelMessage(message);
      } catch {
        panelMessages.delete(key);
      }
    }
    // Refresh status with current ping
    setIdleStatus(client);
  }, 10_000);
}

export async function startBot(): Promise<void> {
  if (!TOKEN || !GUILD_ID) {
    logger.error("DISCORD_TOKEN or DISCORD_GUILD_ID not set. Bot not started.");
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "Discord bot ready");
    await registerCommands(readyClient.user.id);
    setIdleStatus(client);
    startPanelAutoUpdate(client);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const cmd = interaction as ChatInputCommandInteraction;

        if (cmd.commandName === "panel") {
          await handleCommand(cmd);
          const channel = cmd.channel as TextChannel;
          const messages = await channel.messages.fetch({ limit: 5 });
          const panelMsg = messages.find(
            (m) => m.author.id === client.user?.id && m.embeds.length > 0,
          );
          if (panelMsg) {
            panelMessages.set(panelMsg.id, panelMsg);
          }
          return;
        }

        await handleCommand(cmd);
        return;
      }

      if (interaction.isButton()) {
        const btn = interaction as ButtonInteraction;
        if (btn.customId === "generate_username") {
          await handleGenerate(btn);
        } else if (btn.customId === "check_stock") {
          await handleStockButton(btn);
        }
        return;
      }
    } catch (err) {
      logger.error({ err }, "Error handling interaction");
    }
  });

  await client.login(TOKEN);
}
