import { validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
require('dotenv').config()

import User from '../models/user'

type CustomError = Error & { data?: any; code?: number, statusCode?: number }

export const signup = (req, res, next) => {
    const errors = validationResult(req) // get the errors from express-validator
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed.') as CustomError
        error.statusCode = 422 // 422 = validation failed
        error.data = errors.array() // get the errors from express-validator
        throw error
    }

    const email = req.body.email
    const name = req.body.name
    const password = req.body.password

    bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
            const user = new User({
                email: email,
                password: hashedPassword,
                name: name,
                // remove after
                status: 'I am new!',
            })
            return user.save()
        })
        .then((result) => {
            res.status(201).json({
                message: 'User created!',
                userId: result._id,
            })
        })
        .catch((err) => {
            if (!err.statusCode) {
                // 500 = server error
                err.statusCode = 500
            }
            next(err)
        })
}

export const login = (req, res, next) => {
    const email = req.body.email
    const password = req.body.password

    let loadedUser

    User.findOne({ email: email })
        .then((user) => {
            if (!user) {
                const error = new Error(
                    'A user with this email could not be found.'
                ) as CustomError
                error.statusCode = 401 // 401 = not authenticated
                throw error
            }
            loadedUser = user
            return bcrypt.compare(password, user.password)
        })
        .then((isEqual) => {
            if (!isEqual) {
                const error = new Error('Wrong password.') as CustomError
                error.statusCode = 401 // 401 = not authenticated
                throw error
            }
            //JsonWebToken
            const token = jwt.sign(
                {
                    email: loadedUser.email,
                    userId: loadedUser._id.toString(),
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            )
            res.status(200).json({
                token: token,
                userId: loadedUser._id.toString(),
            })
        })
        .catch((err) => {
            if (!err.statusCode) {
                // 500 = server error
                err.statusCode = 500
            }
            next(err)
        })
}
