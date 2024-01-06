import fs from "fs";
import path from "path";

import bcrypt from "bcryptjs";
import validator from "validator";
import jwt from "jsonwebtoken";
require("dotenv").config();

import User from "../models/user";
import Post from "../models/post";

type CustomError = Error & { data?: any; code?: number };
// module.exports = {
export default {
    createUser: async function ({ userInput }, req) {
        // const email = userInput.email;
        // const name = userInput.name;
        // const password = userInput.password;
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({ message: "E-Mail is invalid." });
        }

        if (
            validator.isEmpty(userInput.password) ||
            !validator.isLength(userInput.password, { min: 5 })
        ) {
            errors.push({ message: "Password too short!" });
        }

        if (errors.length > 0) {
            const error = new Error("Invalid input.") as CustomError;
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const userExists = await User.findOne({ email: userInput.email });

        if (userExists) {
            const error = new Error("User exists already!");
            throw error;
        }

        const hashedPassword = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            email: userInput.email,
            name: userInput.name,
            password: hashedPassword,
        });

        const createdUser = await user.save();
        return { ...createdUser.toObject(), _id: createdUser._id.toString() };
    },

    login: async function ({ email, password }) {
        const user = await User.findOne({ email: email });
        if (!user) {
            const error = new Error("User not found.") as CustomError;
            error.code = 401;
            throw error;
        }

        const isEqual = await bcrypt.compare(password, user.password);

        if (!isEqual) {
            const error = new Error("Password is incorrect.") as CustomError;
            error.code = 401;
            throw error;
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        return { token: token, userId: user._id.toString() };
    },

    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!") as CustomError;
            error.code = 401;
            throw error;
        }

        const errors = [];
        if (
            validator.isEmpty(postInput.title) ||
            !validator.isLength(postInput.title, { min: 5 })
        ) {
            errors.push({ message: "Title is invalid." });
        }

        if (
            validator.isEmpty(postInput.content) ||
            !validator.isLength(postInput.content, { min: 5 })
        ) {
            errors.push({ message: "Content is invalid." });
        }

        if (errors.length > 0) {
            const error = new Error("Invalid input.") as CustomError;
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            const error = new Error("Invalid user.") as CustomError;
            error.code = 401;
            throw error;
        }

        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user,
        });

        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString(),
        };
    },

    posts: async function ({ page }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!") as CustomError;
            error.code = 401;
            throw error;
        }

        if (!page) {
            page = 1;
        }

        const perPage = 2;

        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate("creator");

        return {
            posts: posts.map((p) => {
                return {
                    ...p._doc,
                    _id: p._id.toString(),
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString(),
                };
            }),
            totalPosts: totalPosts,
        };
    },

    post: async function ({ id }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!") as CustomError;
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate("creator");

        if (!post) {
            const error = new Error("No post found!") as CustomError;
            error.code = 404;
            throw error;
        }

        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
        };
    },

    updatePost: async function ({ id, postInput }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!") as CustomError;
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate("creator");

        if (!post) {
            const error = new Error("No post found!") as CustomError;
            error.code = 404;
            throw error;
        }

        if (post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized!") as CustomError;
            error.code = 403;
            throw error;
        }

        const errors = [];
        if (
            validator.isEmpty(postInput.title) ||
            !validator.isLength(postInput.title, { min: 5 })
        ) {
            errors.push({ message: "Title is invalid." });
        }

        if (
            validator.isEmpty(postInput.content) ||
            !validator.isLength(postInput.content, { min: 5 })
        ) {
            errors.push({ message: "Content is invalid." });
        }

        if (errors.length > 0) {
            const error = new Error("Invalid input.") as CustomError;
            error.data = errors;
            error.code = 422;
            throw error;
        }

        post.title = postInput.title;
        post.content = postInput.content;

        if (postInput.imageUrl !== "undefined") {
            post.imageUrl = postInput.imageUrl;
        }

        const updatedPost = await post.save();

        return {
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString(),
        };
    },

    deletePost: async function ({ id }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!") as CustomError;
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id);

        if (!post) {
            const error = new Error("No post found!") as CustomError;
            error.code = 404;
            throw error;
        }

        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error("Not authorized!") as CustomError;
            error.code = 403;
            throw error;
        }

        clearImage(post.imageUrl);

        await Post.findByIdAndRemove(id);
        const user = await User.findById(req.userId);
        user.posts = user.posts.filter(postId => postId.toString() !== id.toString());
        await user.save();
        return true;
    },

    user: async function (args, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!") as CustomError;
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            const error = new Error("No user found!") as CustomError;
            error.code = 404;
            throw error;
        }

        return {
            ...user.toObject(),
            _id: user._id.toString(),
        };
    },

    updateStatus: async function ({ status }, req) {
        if (!req.isAuth) {
            const error = new Error("Not authenticated!") as CustomError;
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            const error = new Error("No user found!") as CustomError;
            error.code = 404;
            throw error;
        }

        user.status = status;
        await user.save();

        return {
            ...user.toObject(),
            _id: user._id.toString(),
        };
    },
};

const clearImage = (filePath) => {
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, (err) => console.log(err));
};
