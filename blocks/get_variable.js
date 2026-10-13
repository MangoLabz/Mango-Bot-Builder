module.exports = {
    name: "Get Variable",

    description: "Gets the value of the variable.",

    category: "Data Stuff",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Acceptable Types: Action\n\nDescription: Executes this block.",
            types: ["action"]
        },
        {
            id: "name",
            name: "Name",
            description:
                "Acceptable Types: Text, Unspecified\n\nDescription: The name of the variable.",
            types: ["text", "unspecified"],
            required: true
        },
        {
            id: "search_value",
            name: "Workspace Search Value",
            description:
                'Acceptable Types: Unspecified, Text, Number\n\nDescription: The value according to your choice in the "Workspace Search Type" option only if you selected the option "Specific Workspace(s)" in "Variable Restriction Type".',
            types: ["unspecified", "text", "number"]
        }
    ],

    options: [
        {
            id: "variable_type",
            name: "Variable Type",
            description: "Description: The type of the variable.",
            type: "SELECT",
            options: {
                temp: "Temporary Variable",
                global: "Global Variable"
            }
        },
        {
            id: "variable_restriction_type",
            name: "Variable Restriction Type",
            description:
                'Description: The type of access restriction of the variable. If "Specific Workspace(s)", you need to put a number in the "Workspace Number" input.',
            type: "SELECT",
            options: {
                current: "Current Workspace",
                specific: "Specific Workspace(s)",
                all: "All Workspace"
            }
        },
        {
            id: "workspace_search_type",
            name: "Workspace Search Type",
            description:
                'Description: The type of search to find the workspace(s) related to this variable only if you selected the option "Specific Workspace(s)" in "Variable Restriction Type". You need to put a value in the "Workspace Search Value" input.',
            type: "SELECT",
            options: {
                id: "Workspace ID",
                title: "Workspace Title",
                description: "Workspace Description",
                groupId: "Category ID"
            }
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
            id: "value",
            name: "Value",
            description: "Type: Unspecified\n\nDescription: The value of the variable.",
            types: ["unspecified"]
        }
    ],

    code(cache) {
        const name = this.GetInputValue("name", cache) + ""
        const search_value = this.GetInputValue("search_value", cache)
        const type = this.GetOptionValue("variable_type", cache) + ""
        const restriction = this.GetOptionValue("variable_restriction_type", cache) + ""
        const workspace_search_type = this.GetOptionValue('workspace_search_type', cache)

        const value = this.getVariable(name, { type, restriction, workspace_search_type, search_value }, cache)

        this.StoreOutputValue(value, "value", cache)
        this.RunNextBlock("action", cache)
    }
}
