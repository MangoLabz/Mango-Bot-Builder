module.exports = {
    name: "Send Message",

    description: "Sends a message.",

    category: "Message Stuff",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Acceptable Types: Action\n\nDescription: Executes this block.",
            types: ["action"]
        },
        {
            id: "channel",
            name: "Channel",
            description:
                "Acceptable Types: Object, Unspecified\n\nDescription: The text channel or DM channel to send this message.",
            types: ["object", "unspecified"],
            required: true
        },
        {
            id: "text",
            name: "Text",
            description:
                "Acceptable Types: Text, Unspecified\n\nDescription: The text to put in the message. (OPTIONAL)",
            types: ["text", "unspecified"]
        },
        {
            id: "embed",
            name: "Embed",
            description:
                "Acceptable Types: Object, Unspecified\n\nDescription: The embeds to put in the message. (OPTIONAL)",
            types: ["object", "list", "unspecified"],
            multiInput: true
        },
        {
            id: "components",
            name: "Component",
            description:
                "Acceptable Types: Object, Unspecified\n\nDescription: The components to put in the message. (OPTIONAL)",
            types: ["object", "unspecified"],
            multiInput: true
        },
        {
            id: "attachment",
            name: "Attachment",
            description:
                "Acceptable Types: Object, Text, Unspecified\n\nDescription: The attachments to put in the message. Supports Image, file path and URL. (OPTIONAL)",
            types: ["object", "text", "unspecified"],
            multiInput: true
        }
    ],

    options: [
        {
            id: "silent",
            name: "Silent Message",
            description: "Description: Prevents users from getting a notification.",
            type: "CHECKBOX"
        }
    ],

    outputs: [
        {
            id: "action",
            name: "Action",
            description:
                "Type: Action\n\nDescription: Executes the following blocks when this block finishes its task.",
            types: ["action"]
        },
        {
            id: "message",
            name: "Message",
            description: "Type: Object\n\nDescription: The message obtained.",
            types: ["object"]
        }
    ],

    code(cache) {
        const { ActionRowBuilder, MessageFlags } = require("discord.js")

        const channel = this.GetInputValue("channel", cache)
        const text = this.GetInputValue("text", cache)
        const embed = this.GetInputValue("embed", cache).filter((a) => a)
        const components = this.GetInputValue("components", cache).filter((a) => a)
        const attachment = this.GetInputValue("attachment", cache).filter((a) => a)
        const silent = this.GetOptionValue("silent", cache)

        function getComponents(components) {
            if (components?.length > 0) {
                let defaultRow

                const res = components.reduce((arr, component) => {
                    // Action Row
                    if (component.data?.type === 1) {
                        if (defaultRow) {
                            arr.push(defaultRow)
                            defaultRow = undefined
                        }
                        arr.push(component)
                    } else {
                        if (!defaultRow) {
                            defaultRow = new ActionRowBuilder()
                        }

                        if (defaultRow.components.length === 5) {
                            arr.push(defaultRow)
                            defaultRow = new ActionRowBuilder()
                        }

                        defaultRow.addComponents(component)
                    }
                    return arr
                }, [])

                if (defaultRow) res.push(defaultRow)

                return res
            } else {
                return undefined
            }
        }

        channel
            .send({
                flags: silent ? MessageFlags.SuppressNotifications : undefined,
                content: text,
                embeds: embed,
                components: getComponents(components),
                files: attachment
            })
            .then((msg) => {
                this.StoreOutputValue(msg, "message", cache)
                this.RunNextBlock("action", cache)
            })
    }
}
