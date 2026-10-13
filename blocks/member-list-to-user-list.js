module.exports = {
  name: "Members to Usernames",
  description: "Zamienia listę memberów na listę nazw użytkowników",
  category: "Members",

  inputs: {
    members: {
      name: "Members",
      type: "array",      // Array<Member>
      required: true
    }
  },

  outputs: {
    usernames: {
      name: "Usernames",
      type: "array"       // Array<String>
    }
  },

  async run(ctx) {
    const members = ctx.inputs.members;

    if (!Array.isArray(members)) {
      ctx.outputs.usernames = [];
      return;
    }

    const usernames = members.map(member => {
      // Nick na serwerze (jeśli istnieje)
      if (member.displayName) return member.displayName;

      // Globalna nazwa użytkownika
      if (member.user && member.user.username) {
        return member.user.username;
      }

      return "Unknown";
    });

    ctx.outputs.usernames = usernames;
  }
};
