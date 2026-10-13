module.exports = {
    name: "Create Slash Command",

    description:
        "Creates a slash command for the user to type and execute. Supports subcommands too.",

    category: "Command Stuff",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Acceptable Types: Action\n\nDescription: Executes this block.",
            types: ["action"]
        },
        {
            id: "command_name",
            name: "Command Name",
            description:
                "Acceptable Types: Text, Unspecified\n\nDescription: The name of the command, which will be typed by the user. Add a single whitespace between names to convert it into a subcommand.",
            types: ["text", "unspecified"],
            required: true
        },
        {
            id: "command_description",
            name: "Command Description",
            description:
                "Acceptable Types: Text, Unspecified\n\nDescription: The description of the command.",
            types: ["text", "unspecified"]
        },
        {
            id: "command_server",
            name: "Command Server",
            description:
                "Acceptable Types: Object, Text, Unspecified\n\nDescription: The server (id) to create this command in.",
            types: ["object", "text", "unspecified"]
        },
        {
            id: "nsfw_command",
            name: "NSFW Command?",
            description:
                "Acceptable Types: Boolean, Unspecified\n\nDescription: Whether the command is age-restricted.",
            types: ["boolean", "unspecified"]
        },
        {
            id: "command_options",
            name: "Command Option",
            description:
                "Acceptable Types: Object, Unspecified\n\nDescription: The options for the command.",
            types: ["object", "unspecified"],
            multiInput: true
        }
    ],

    options: [
        {
            id: "contexts",
            name: "Contexts",
            description: "Description: Where this slash command can be used.",
            type: "MULTISELECT",
            options: [
                ["Guild", "Server"],
                ["BotDM", "Bot DM"],
                ["PrivateChannel", "Other DM"]
            ],
            defaultValue: ["Guild"]
        },
        {
            id: "integration_types",
            name: "Integration Types",
            description: "Description: The integration types of this slash command.",
            type: "MULTISELECT",
            options: [
                ["GuildInstall", "Server Bot"],
                ["UserInstall", "User Bot"]
            ],
            defaultValue: ["GuildInstall"]
        }
    ],

    outputs: [
        {
            id: "action2",
            name: "Action",
            description:
                "Type: Action\n\nDescription: Executes the following blocks whenever this slash command is executed.",
            types: ["action"]
        },
        {
            id: "interaction",
            name: "Interaction",
            description:
                "Type: Object\n\nDescription: The interaction created by executing the slash command.",
            types: ["object"]
        }
    ],

    async code(cache) {
        const DiscordCommands = await this.getDependency("DiscordCommands", cache.name)

        const { SlashCommandBuilder, ApplicationCommandOptionType } = require("discord.js")

        const command_name = this.GetInputValue("command_name", cache)
        const command_description = this.GetInputValue("command_description", cache, false, " ឵")
        const command_server = this.GetInputValue("command_server", cache)
        const nsfw_command = Boolean(this.GetInputValue("nsfw_command", cache))
        const command_options = this.GetInputValue("command_options", cache)
        const contexts = this.GetOptionValue("contexts", cache)
        const integration_types = this.GetOptionValue("integration_types", cache)

        const commandServerId = command_server?.id || command_server

        const slashCommand = new SlashCommandBuilder()
            .setDescription(command_description)
            .setNSFW(nsfw_command)
        if (contexts.length > 0) slashCommand.setContexts(...contexts)
        if (integration_types.length > 0) slashCommand.setIntegrationTypes(...integration_types)
        slashCommand["name"] = command_name // .setName() will throw an error because of whitespace character

        for (const commandOption of command_options) {
            switch (commandOption?.type) {
                case ApplicationCommandOptionType.Attachment:
                    slashCommand.addAttachmentOption(commandOption)
                    break
                case ApplicationCommandOptionType.Boolean:
                    slashCommand.addBooleanOption(commandOption)
                    break
                case ApplicationCommandOptionType.Channel:
                    slashCommand.addChannelOption(commandOption)
                    break
                case ApplicationCommandOptionType.Integer:
                    slashCommand.addIntegerOption(commandOption)
                    break
                case ApplicationCommandOptionType.Mentionable:
                    slashCommand.addMentionableOption(commandOption)
                    break
                case ApplicationCommandOptionType.Number:
                    slashCommand.addNumberOption(commandOption)
                    break
                case ApplicationCommandOptionType.Role:
                    slashCommand.addRoleOption(commandOption)
                    break
                case ApplicationCommandOptionType.String:
                    slashCommand.addStringOption(commandOption)
                    break
                case ApplicationCommandOptionType.User:
                    slashCommand.addUserOption(commandOption)
                    break
            }
        }

        DiscordCommands.create(slashCommand, commandServerId)

        if (this.isOutputConnected("action2", cache)) {
            const [commandName, subcommandName, subcommandName2] = command_name
                .trim()
                .toLowerCase()
                .split(/\s+/, 3)

            this.events.on("interactionCreate", (interaction) => {
                if (interaction.isChatInputCommand() && interaction.commandName === commandName) {
                    if (
                        interaction.commandGuildId &&
                        interaction.commandGuildId !== commandServerId
                    ) {
                        return
                    }

                    const subcommandGroup = interaction.options.getSubcommandGroup(false)
                    const subcommand = interaction.options.getSubcommand(false)
                    if (!subcommandName2 && subcommandGroup) return
                    if (!subcommandName && subcommand) return

                    if (subcommandName2) {
                        if (subcommandGroup !== subcommandName || subcommand !== subcommandName2) {
                            return
                        }
                    } else if (subcommandName) {
                        if (subcommand !== subcommandName) {
                            return
                        }
                    }

                    this.StoreOutputValue(interaction, "interaction", cache)
                    this.RunNextBlock("action2", cache)
                }
            })
        }
    }
}
