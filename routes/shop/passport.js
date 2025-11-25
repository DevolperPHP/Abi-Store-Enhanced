const express = require('express')
const router = express.Router()
const userData = require('../../middleware/userData')
const User = require('../../models/User')
const bcrypt = require('bcrypt')
const moment = require('moment')

router.use(userData)


router.get('/sign-out', async (req, res) => {
    try {
        res.clearCookie("id")
        res.redirect('/shop/passport/sign-in')
    } catch (err) {
        console.log(err);
    }
})

router.get('/sign-in', async (req, res) => {
    try {
        if (req.user) {
            res.redirect('/shop/home')
        } else {
            res.render('shop/home/passport', {
                sign_in: true,
                sign_up: false,
                user: req.user,
                err_filter: req.flash('faild'),
                err: req.flash("login-err"),
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.post('/sign-in', async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email: email })

        if (user) {
            const compare = await bcrypt.compare(password, user.password)

            if (compare) {
                res.cookie("id", user.id, { maxAge: moment().add(4, "months") })
                if(user.permissions.includes("Cashier")){
                    res.redirect("/localstore/storage")
                } else {
                    res.redirect("/shop/home")
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

router.get('/sign-up', async (req, res) => {
    try {
        if (req.user) {
            res.redirect('/shop/home')
        } else {
            res.render('shop/home/passport', {
                sign_in: false,
                sign_up: true,
                user: req.user,
                err: req.flash("login-err"),
                err_filter: req.flash('faild'),
            })
        }
    } catch (err) {
        console.log(err);
    }
})


router.post('/sign-up', async (req, res) => {
    try {
        const { name, email, password, city, phone } = req.body
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
                    city: city,
                    phone: phone
                })
            ]
            newUser.forEach(user => {
                user.save()
                res.redirect("/shop/passport/sign-in")
            })
        }
    } catch (err) {
        console.log(err);
    }
})
module.exports = router