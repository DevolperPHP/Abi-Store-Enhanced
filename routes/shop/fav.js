const express = require('express');
const User = require('../../models/User');
const Product = require('../../models/Product');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/fav', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        if (user) {
            const favIds = user.fav

            const objectIds = favIds.map(id => mongoose.Types.ObjectId(id))
            const products = await Product.find({ _id: { $in: objectIds } })
            res.render('shop/fav/fav', {
                user: user,
                products: products,
            })
        } else {
            res.render('shop/fav/fav', {
                user: user,
                products: [],
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/fav/add/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user) {
            await User.updateOne({ _id: id }, {
                $push: {
                    fav: data.id
                }
            })
            req.flash('fav-success', 'Success')
            res.redirect(`/shop/product/get/${data.id}`)
        } else {
            req.flash('login-err', 'err')
            res.redirect('back')
        }
    } catch (err) {
        console.log(err);
    }
})


router.put('/fav/remove/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user) {
            await User.updateOne({ _id: id }, {
                $pull: {
                    fav: data.id
                }
            })
            res.redirect("back")
        } else {

        }
    } catch (err) {
        console.log(err);
    }
})


module.exports = router