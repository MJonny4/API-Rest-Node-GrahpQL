const { Schema, model } = require("mongoose");

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    password: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, default: "I am new!", required: true },
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
});

module.exports = model("User", userSchema);
