const express = require('express')
const User = require('../../models/User')
const Color = require('../../models/Colors')
const router = express.Router()

router.get("/", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const colors = await Color.find({})
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("colors")) {
                res.render("colors/colors", {
                    user: user,
                    colors: colors
                    
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

router.post("/add", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if(user){
            if(user.isAdmin == true || user.permissions.includes("colors")){
                const newColor = [
                    new Color({
                        hex: req.body.color
                    })
                ]

                newColor.forEach((color) => {
                    color.save()
                })

                return res.redirect("/colors")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.delete("/delete/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if(user){
            if(user.isAdmin == true || user.permissions.includes("colors")){
                await Color.deleteOne({ _id: req.params.id })
                res.redirect("/colors")
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
module.exports = router