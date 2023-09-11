const fs = require("fs");

const { validationResult } = require("express-validator");

const socket = require("../socket");
const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;

    Post.find()
        .countDocuments()
        .then((count) => {
            totalItems = count;
            return Post.find()
                .populate("creator", "-password")
                .sort({ createdAt: -1 })
                .skip((currentPage - 1) * perPage)
                .limit(perPage);
        })
        .then((posts) => {
            res.status(200).json({
                message: "Fetched posts successfully.",
                posts: posts,
                totalItems: totalItems,
            });
        })
        .catch((err) => {
            if (!err.statusCode) {
                // 500 = server error
                err.statusCode = 500;
            }
            next(err);
        });
};

exports.createPost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // 422 = validation failed
        const error = new Error(
            "Validation failed, entered data is incorrect."
        );
        error.statusCode = 422;
        throw error;
    }

    if (!req.file) {
        // 422 = validation failed
        const error = new Error("No image provided.");
        error.statusCode = 422;
        throw error;
    }

    const title = req.body.title;
    const content = req.body.content;
    const imageUrl = req.file.path;
    let creator;

    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId,
    });

    post.save()
        .then((result) => {
            return User.findById(req.userId)
                .populate("posts", "-__v")
                .select("-password");
        })
        .then((user) => {
            creator = user;
            res.status(201).json({
                message: "Post created successfully!",
                post: post,
                creator: { _id: creator._id, name: creator.name },
            });
            io.getIO().emit("posts", {
                action: "create",
                post: {
                    ...post._doc,
                    creator: { _id: req.userId, name: user.name },
                },
            });

            user.posts.push(post);
            return user.save();
        })
        .catch((err) => {
            if (!err.statusCode) {
                // 500 = server error
                err.statusCode = 500;
            }
            next(err);
        });
};

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;

    Post.findById(postId)
        .then((post) => {
            if (!post) {
                // 404 = not found
                const error = new Error("Could not find post.");
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({ message: "Post fetched.", post: post });
        })
        .catch((err) => {
            if (!err.statusCode) {
                // 500 = server error
                err.statusCode = 500;
            }
            next(err);
        });
};

exports.updatePost = (req, res, next) => {
    const postId = req.params.postId;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // 422 = validation failed
        const error = new Error(
            "Validation failed, entered data is incorrect."
        );
        error.statusCode = 422;
        throw error;
    }

    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;

    if (req.file) {
        imageUrl = req.file.path;
    }

    if (!imageUrl) {
        // 422 = validation failed
        const error = new Error("No file picked.");
        error.statusCode = 422;
        throw error;
    }

    Post.findById(postId)
        .then((post) => {
            if (!post) {
                // 404 = not found
                const error = new Error("Could not find post.");
                error.statusCode = 404;
                throw error;
            }

            if (post.creator.toString() !== req.userId) {
                // 403 = forbidden
                const error = new Error("Not authorized.");
                error.statusCode = 403;
                throw error;
            }

            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl);
            }

            post.title = title;
            post.imageUrl = imageUrl;
            post.content = content;

            return post.save();
        })
        .then((result) => {
            res.status(200).json({ message: "Post updated!", post: result });
        })
        .catch((err) => {
            if (!err.statusCode) {
                // 500 = server error
                err.statusCode = 500;
            }
            next(err);
        });
};

const clearImage = (filePath) => {
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, (err) => console.log(err));
};

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;

    if (!postId) {
        // 422 = validation failed
        const error = new Error("No post ID provided.");
        error.statusCode = 422;
        throw error;
    }

    Post.findById(postId)
        .then((post) => {
            // check logged in user
            if (!post) {
                // 404 = not found
                const error = new Error("Could not find post.");
                error.statusCode = 404;
                throw error;
            }

            if (post.creator.toString() !== req.userId) {
                // 403 = forbidden
                const error = new Error("Not authorized.");
                error.statusCode = 403;
                throw error;
            }

            clearImage(post.imageUrl);
            return Post.findByIdAndRemove(postId);
        })
        .then((result) => {
            User.findById(req.userId)
                .then((user) => {
                    io.getIO().emit("posts", { action: "delete", post: postId });
                    user.posts.pull(postId);
                    return user.save();
                })
                .then((result) => {
                    res.status(200).json({ message: "Post deleted!" });
                });
        })
        .catch((err) => {
            if (!err.statusCode) {
                // 500 = server error
                err.statusCode = 500;
            }
            next(err);
        });
};
