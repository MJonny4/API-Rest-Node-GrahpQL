import jwt from "jsonwebtoken";
require("dotenv").config();

const isAuth = (req, res, next) => {
    const authHeader = req.get("Authorization"); // get the header
    if (!authHeader) {
        req.isAuth = false;
        return next();
    }
    const token = authHeader.split(" ")[1]; // get the token
    let decodedToken;

    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
        req.isAuth = false;
        return next();
    }

    if (!decodedToken) {
        req.isAuth = false;
        return next();
    }

    req.userId = decodedToken.userId; // add userId to the request
    req.isAuth = true;
    next();
};

export default isAuth;