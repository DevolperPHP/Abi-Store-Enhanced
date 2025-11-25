const express = require('express');
const router = express.Router()
const User = require('../models/User')
const bcrypt = require('bcrypt')
const moment = require('moment')

router.get("/sign-up", async (req, res) => {
    try {
        res.render('passport/sign-up', {
            err: req.flash('faild'),
            login_err: req.flash("login-err"),

        })
    } catch (err) {
        console.log(err);
    }
})

router.post("/sign-up", async (req, res) => {
    try {
        const { name, email, password } = req.body
        const cryptedPassword = await bcrypt.hash(password, 10)
        const check = await User.findOne({ email: email })

        if(check){
            req.flash('faild', 'error')
            res.redirect("back")
        } else {
            const newUser = [
                new User({
                    name: name,
                    email: email,
                    password: cryptedPassword,
                })
            ]
            newUser.forEach(user => {
                user.save()
                res.redirect("/passport/sign-up")
            })
        }

    } catch (err) {
        console.log(err);
    }
})

router.post("/sign-in", async (req, res) => {
    try {
        const {email , password} = req.body
        const user = await User.findOne({ email : email})

        if(user){
            const compare = await bcrypt.compare(password, user.password)

            if(compare){
                res.cookie("id", user.id, { maxAge: moment().add(4, "months") })
                if(user.permissions.includes("Cashier")){
                    res.redirect("/localstore/storage")
                } else {
                    res.redirect("/")
                }
            } else {
                req.flash("login-err", "err")
                res.redirect("back")
            }
        } else {
            req.flash("login-err", "err")
            res.redirect("back")
        }
    } catch (err) {
        console.log(err);
    }
})


router.post("/sign-out", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if(user){
            res.clearCookie("id")
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})
module.exports = router