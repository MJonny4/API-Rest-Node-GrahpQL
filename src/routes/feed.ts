import { Router } from "express";
import { body } from "express-validator";

const router = Router();

import {
    getPosts,
    createPost,
    getPost,
    updatePost,
    deletePost,
}  from "../controllers/feed";
import isAuth from "../middleware/is-auth";

router.get("/posts", isAuth, getPosts);

router.post(
    "/post",
    [
        body("title").trim().isLength({ min: 5 }),
        body("content").trim().isLength({ min: 5 }),
    ],
    isAuth,
    createPost
);

router.get("/post/:postId", isAuth, getPost);

router.put(
    "/post/:postId",
    [
        body("title").trim().isLength({ min: 5 }),
        body("content").trim().isLength({ min: 5 }),
    ],
    isAuth,

    updatePost
);

router.delete("/post/:postId", isAuth, deletePost);

export default router;
