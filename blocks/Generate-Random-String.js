module.exports = {
    name: "Generate Random String",

    description: "Generates a random alphanumeric string with the specified length.",

    category: "Utilities",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Executes this block.",
            types: ["action"]
        },
        {
            id: "length",
            name: "Length",
            description: "The length of the random string.",
            types: ["number", "unspecified"],
            required: true
        }
    ],

    options: [],

    outputs: [
        {
            id: "action",
            name: "Action",
            description: "Executes the following blocks after the string is generated.",
            types: ["action"]
        },
        {
            id: "string",
            name: "Random String",
            description: "The generated random alphanumeric string.",
            types: ["text", "unspecified"]
        }
    ],

    code(cache) {
        const length = this.GetInputValue("length", cache);
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        this.StoreOutputValue(result, "string", cache);
        this.RunNextBlock("action", cache);
    }
};
