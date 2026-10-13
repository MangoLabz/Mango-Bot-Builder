module.exports = {
    name: "Delete Interaction Reply",

    description:
        "Deletes the reply to the interaction made by a slash command for example.",

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
                "Acceptable Types: Object, Unspecified\n\nDescription: The interaction to delete.",
            types: ["object", "unspecified"],
            required: true
        }
    ],

    outputs: [
        {
            id: "action",
            name: "Action",
            description:
                "Type: Action\n\nDescription: Executes the following blocks when this block finishes its task.",
            types: ["action"]
        }
    ],

    code(cache) {
        const interaction = this.GetInputValue("interaction", cache)

        interaction.deleteReply().then(() => {
            this.RunNextBlock("action", cache)
        })
    }
}
