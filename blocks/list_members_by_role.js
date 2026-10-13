module.exports = {
    name: "Mention Members by Role",

    description: "Gets all members with a given role and returns them as a formatted mention list. If no one has the role, it returns '- brak'.",

    category: "Server Stuff",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Executes this block.",
            types: ["action"]
        },
        {
            id: "role",
            name: "Role",
            description: "The role object to get members from.",
            types: ["object", "unspecified"],
            required: true
        }
    ],

    options: [],

    outputs: [
        {
            id: "action",
            name: "Action",
            description: "Executes the following blocks when this block finishes its task.",
            types: ["action"]
        },
        {
            id: "text",
            name: "Formatted Mentions",
            description: "The formatted mention list of members with the given role (or '- brak' if none).",
            types: ["text", "unspecified"]
        }
    ],

    async code(cache) {
        const role = this.GetInputValue("role", cache);

        if (!role || !role.members) {
            this.StoreOutputValue("- brak", "text", cache);
            this.RunNextBlock("action", cache);
            return;
        }

        const members = role.members.map(member => `<@${member.id}>`);

        const list = members.length > 0 ? members.map(m => `- ${m}`).join("\n") : "- brak";

        this.StoreOutputValue(list, "text", cache);
        this.RunNextBlock("action", cache);
    }
}
