const express = require('express');
const User = require('../../models/User');
const Size = require('../../models/Size');
const router = express.Router()

router.get('/', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id})
        const size = await Size.find({}).sort({ _id: -1 })

        if(user){
            if(user.isAdmin == true || user.permissions.includes("Size")){
                res.render("size/size", {
                    user: user,
                    size: size,
                    err: req.flash("unique-size-error"),
            success: req.query.success
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
        const user = await User.findOne({ _id: id})

        if(user){
            if(user.isAdmin == true || user.permissions.includes("Size")){
                const unique = await Size.findOne({ size: req.body.size })

                if(unique){
                    req.flash("unique-size-error", "error")
                    res.redirect("/size")
                } else {
                    const newSize = [
                        new Size({
                            size: req.body.size,
                        })
                    ]
    
                    newSize.forEach((data) => {
                        data.save()
                    })
    
                    return res.redirect("/size?success=Size added successfully!")
                }
            }
        } else [
            res.redirect("/passport/sign-up")
        ]
    } catch (err) {
        console.log(err);
    }
})

router.delete("/delete/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if(user){
            if(user.isAdmin == true || user.permissions.includes("Size")){
                await Size.deleteOne({ _id: req.params.id })
                return res.redirect("/size?success=Size added successfully!")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

module.exports = router