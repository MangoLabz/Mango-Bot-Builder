module.exports = {
    name: "Check User In Server",

    description: "Checks whether a user is a member of the selected server and branches the action accordingly.",

    category: "Member Stuff",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Executes this block.",
            types: ["action"]
        },
        {
            id: "user",
            name: "User",
            description: "The user to check.",
            types: ["object", "unspecified"],
            required: true
        },
        {
            id: "server",
            name: "Server",
            description: "The server (guild) in which to check the user.",
            types: ["object", "unspecified"],
            required: true
        }
    ],

    options: [],

    outputs: [
        {
            id: "yes",
            name: "Action (User Is In Server)",
            description: "Runs if the user is a member of the server.",
            types: ["action"]
        },
        {
            id: "no",
            name: "Action (User Is NOT In Server)",
            description: "Runs if the user is NOT a member of the server.",
            types: ["action"]
        }
    ],

    async code(cache) {
        const user = this.GetInputValue("user", cache);
        const guild = this.GetInputValue("server", cache);

        try {
            const member = await guild.members.fetch(user.id).catch(() => null);

            if (member) {
                this.RunNextBlock("yes", cache);
            } else {
                this.RunNextBlock("no", cache);
            }
        } catch (err) {
            this.RunNextBlock("no", cache);
        }
    }
};