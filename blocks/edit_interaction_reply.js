module.exports = {
    name: "Edit Interaction Reply",

    description: "Edits the reply to the interaction made by a slash command for example.",

    category: "Command Stuff",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Acceptable Types: Action\n\nDescription: Executes this block.",
            types: ["action"]
        },
        {
            id: "interaction",
            name: "Interaction",
            description:
                "Acceptable Types: Object, Unspecified\n\nDescription: The interaction to edit its reply.",
            types: ["object", "unspecified"],
            required: true
        },
        {
            id: "content",
            name: "Text",
            description: "Acceptable Types: Text, Unspecified\n\nDescription: The text to edit.",
            types: ["text", "unspecified"]
        },
        {
            id: "embeds",
            name: "Embed",
            description:
                "Acceptable Types: Object, Unspecified\n\nDescription: The embeds to edit.",
            types: ["object", "unspecified"],
            multiInput: true
        },
        {
            id: "components",
            name: "Component",
            description:
                "Acceptable Types: Object, Unspecified\n\nDescription: The components to edit.",
            types: ["object", "unspecified"],
            multiInput: true
        },
        {
            id: "files",
            name: "Attachment",
            description:
                "Acceptable Types: Object, Text, Unspecified\n\nDescription: The attachments to edit. Supports Image, file path and URL.",
            types: ["object", "text", "unspecified"],
            multiInput: true
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
            description: "Type: Object\n\nDescription: The message edited.",
            types: ["object"]
        }
    ],

    code(cache) {
        const { ActionRowBuilder } = require("discord.js")

        const interaction = this.GetInputValue("interaction", cache)
        const content = this.GetInputValue("content", cache)
        const embeds = this.GetInputValue("embeds", cache).filter((a) => a)
        const components = this.GetInputValue("components", cache).filter((a) => a)
        const files = this.GetInputValue("files", cache).filter((a) => a)

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

        interaction
            .editReply({
                content,
                embeds: embeds?.length > 0 ? embeds : undefined,
                components: getComponents(components),
                files: files?.length > 0 ? files : undefined
            })
            .then((msg) => {
                this.StoreOutputValue(msg, "message", cache)
                this.RunNextBlock("action", cache)
            })
    }
}
