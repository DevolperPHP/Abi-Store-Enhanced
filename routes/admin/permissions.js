const express = require('express');
const User = require('../../models/User');
const router = express.Router()

router.get("/", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const users = await User.find({})

        if(user){
            if(user.isAdmin == true){
                res.render("permissions/dashboard", {
                    user: user,
                    users: users,
                    err: req.flash("faild-add-permission"),
                    add_suc: req.flash("add-permission-success"),
                    remove_suc: req.flash("remove-permission-success"),
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get("/add-permission/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const users = await User.find({})
        const userData = await User.findOne({ _id: req.params.id})

        if(user){
            if(user.isAdmin == true){
                res.render("permissions/add-permission", {
                    user: user,
                    users: users,
                    userData: userData
                })
            }
        }
    } catch (err) {
        console.log(err);
    }
})

router.get("/remove-permission/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const users = await User.find({})
        const userData = await User.findOne({ _id: req.params.id})

        if(user){
            if(user.isAdmin == true){
                res.render("permissions/remove-permission", {
                    user: user,
                    users: users,
                    userData: userData
                })
            }
        }
    } catch (err) {
        console.log(err);
    }
})

router.put("/add-permission/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const permission = req.body.selective

        if(user.isAdmin){
            const userID = req.params.id
            const uesrData = await User.findOne({ _id: userID })

            if(uesrData.permissions.includes(`${permission}`)){
                req.flash("faild-add-permission", "err")
                return res.redirect("/permissions")
            } else {
                await User.updateOne({ _id: userID }, {
                    $push: {
                        permissions: permission
                    }
                })
                req.flash("add-permission-success","success")
                return res.redirect("/permissions")
            }
        } else {
            res.send("Hehe don't even try")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put("/remove-permission/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id})

        if(user.isAdmin == true){
            const userID = req.params.id
            await User.updateOne({ _id: userID }, {
                $pull: {
                    permissions : req.body.selective_remove
                }
            })
            req.flash("remove-permission-success","success")
            return res.redirect("/permissions")
        }
    } catch (err) {
        console.log(err);
    }
})

module.exports = router