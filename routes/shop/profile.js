const express = require('express');
const router = express.Router();
const isUser = require('../../middleware/isUser');
const Sell = require('../../models/Sell');
const User = require('../../models/User');

router.use(isUser);

router.get('/', async (req, res) => {
    try {
        const orders = await Sell.find({ userId: req.user.id })
        res.render('shop/profile/profile', {
            user: req.user,
            orders: orders,
            edit_suc: req.flash('edit-suc'),
            order_suc: req.flash('order-suc'),
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const user = req.user
        res.render('shop/profile/edit', {
            user: user
        })
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/:id', async (req, res) => {
    try {
        const { name, phone, city } = req.body
        await User.updateOne({ _id: req.params.id }, {
            $set: {
                name: name,
                phone: phone,
                city: city
            }
        })

        req.flash('edit-suc', 'success')
        res.redirect('/shop/profile')
    } catch (err) {
        console.log(err);
    }
})

router.get('/get-order/:id', async (req, res) => {
    try {
        const data = await Sell.findOne({ _id: req.params.id })
        const total = data.products.map((x) => x.total).reduce((a , b) => a + b)
        res.render('shop/profile/get-order', {
            data: data,
            user: req.user,
            total: total
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/track', async (req, res) => {
    try {
        const orders = await Sell.find({ userId: req.user.id, status: 'pending' })
        res.render('shop/profile/profile', {
            user: req.user,
            orders: orders,
            edit_suc: req.flash('edit-suc'),
            order_suc: req.flash('order-suc'),
        })
    } catch (err) {
        console.log(err);
    }
})

module.exports = router