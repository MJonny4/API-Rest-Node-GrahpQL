import { Router } from "express";
import { body } from "express-validator";

const router = Router();

import User from "../models/user";
import {
    signup,
    login,
} from "../controllers/auth";

router.put(
    "/signup",
    [
        body("email")
            .isEmail()
            .withMessage("Please enter a valid email.")
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then((userDoc) => {
                    if (userDoc) {
                        return Promise.reject("E-Mail address already exists!");
                    }
                });
            })
            .normalizeEmail(),
        body("password").trim().isLength({ min: 5 }),
        body("name").trim().not().isEmpty(),
    ],
    signup
);

router.post("/login", login);

export default router;
