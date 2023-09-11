const path = require("path");
const fs = require("fs");
require("dotenv").config()

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");

const MONGODB_URI = process.env.MONGODB_URI;

// const feedRoutes = require("./routes/feed");
// const authRoutes = require("./routes/auth");

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images"); // null = no error, "images" = folder name
    },
    filename: (req, file, cb) => {
        //Windows user
        cb(
            null,
            new Date().toISOString().replace(/:/g, "-") +
                "-" +
                file.originalname
        );
        //Linux user
        //cb(null, new Date().toISOString() + "-" + file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"
    ) {
        // accept file
        cb(null, true);
    } else {
        // reject file
        cb(null, false);
    }
};

app.use(bodyParser.json()); //! application/json, set header Content-Type: application/json if you do Ajax request
app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
); // single = single file upload, "image" = name of the field in the incoming request
app.use("/images", express.static(path.join(__dirname, "images"))); // serve images statically

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*"); // * = allow all domains
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE"
    ); // allow these methods
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    ); // allow these headers
    if (req.method === "OPTIONS") {
        return res.sendStatus(200); // return 200 for OPTIONS request
    }
    next();
});

// app.use("/feed", feedRoutes);
// app.use("/auth", authRoutes);

app.use("/post-image", (req, res, next) => {
    if (!req.isAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    if (!req.file) {
        return res.status(200).json({ message: "No file provided!" });
    }
    if (req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res
        .status(201)
        .json({ message: "File stored.", filePath: req.file.path });
        // req.file.path is the path of the file on the server
});

app.use(require("./middleware/is-auth"));

app.use(
    "/graphql",
    graphqlHTTP({
        schema: require("./graphql/schema"),
        rootValue: require("./graphql/resolvers"),
        graphiql: true,
        customFormatErrorFn(err) {
            if (!err.originalError) {
                return err;
            }
            const data = err.originalError.data;
            const message = err.message || "An error occurred.";
            const code = err.originalError.code || 500;
            return { message: message, status: code, data: data };
        },
    })
);

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500; // 500 = server error
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message, data: data });
});

mongoose
    .connect(MONGODB_URI)
    .then((result) => {
        // const server =
        app.listen(8080);
        // const io = require("./socket").init(server);
        // io.on("connection", (socket) => {
        //     console.log("Client connected");
        // });
    })
    .catch((err) => console.log(err));

const clearImage = (filePath) => {
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, (err) => console.log(err));
};
