const express = require('express');
const User = require('../../models/User');
const isLoggedIn = require('../../middleware/isUser');
const Product = require('../../models/Product');
const mongoose = require('mongoose');
const Sell = require('../../models/Sell');
const router = express.Router()
const moment = require('moment');

router.use(isLoggedIn)

router.put('/add/:id', async (req, res) => {
    try {
        const user = req.user
        const data = await Product.findOne({ _id: req.params.id })
        const qty = req.body.qty
        if (qty > data.qty) {
            req.flash('qty-error', 'err')
            res.redirect('back')
        } else {
            const filter = user.shop_cart.find((item) => item.id === data.id)
            if (filter) {
                req.flash('cart-err', 'err')
                res.redirect('back')
            } else {
                await User.updateOne({ _id: user.id }, {
                    $push: {
                        shop_cart: {
                            id: data.id,
                            qty: qty,
                        }
                    }
                })
                req.flash('cart-suc', 'success')
                res.redirect('back')
            }
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/', async (req, res) => {
    try {
        const user = req.user;
        const cartItems = user.shop_cart;
        const ids = cartItems.map((item) => mongoose.Types.ObjectId(item.id));
        const products = await Product.find({ _id: { $in: ids } });
        const productsWithQty = products.map(product => {
            const cartItem = cartItems.find(item => item.id === product._id.toString());
            return {
                ...product.toObject(),
                qty: cartItem ? cartItem.qty : 0,
                total: (cartItem ? cartItem.qty : 0) * product.sell_price

            };
        });

        var total
        if(productsWithQty.length > 0) {
            total = productsWithQty.map((x) => x.total).reduce((a, b) => a + b)
        } else {
            total = 0
        }

        res.render('shop/home/cart', {
            user: req.user,
            data: productsWithQty,
            err: req.flash('qty-err'),
            total: total
        });
    } catch (err) {
        console.log(err);
    }
});

router.put('/remove/:id', async (req, res) => {
    try {
        await User.updateOne({ _id: req.user.id }, {
            $pull: {
                shop_cart: {
                    id: req.params.id
                }
            }
        })

        res.redirect('/shop/cart')
    } catch (err) {
        console.log(err);
    }
})

router.post('/confirm', async (req, res) => {
    try {
        const user = req.user;
        let cartItems = user.shop_cart;

        const ids = cartItems.map(item => mongoose.Types.ObjectId(item.id));
        const products = await Product.find({ _id: { $in: ids } });

        var detector = false

        cartItems = cartItems.filter(cartItem => {
            const product = products.find(product => product._id.toString() === cartItem.id);
            if ((product.qty - cartItem.qty) < 0) {
                req.flash('qty-err', `There is only ${product.qty} of ${product.name} left in storage, it will be removed from your cart.`);
                detector = true
                return false;
            }
            return true;
        });
        if (detector == false) {
            for (let product of products) {
                const orderItem = cartItems.find(item => item.id === product._id.toString());
                if (orderItem) {
                    product.qty -= orderItem.qty;
                    await product.save();
                }
            }
        }
        user.shop_cart = [];
        await user.save();

        const generateRandomNumber = () => {
            const min = 100000;
            const max = 999999;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        const randomNumber = generateRandomNumber();

        const data = await Product.find({ _id: { $in: ids } });
        const productsWithQty = data.map(product => {
            const cartItem = cartItems.find(item => item.id === product._id.toString());
            return {
                ...product.toObject(),
                qty: cartItem ? cartItem.qty : 0,
                total: (cartItem ? cartItem.qty : 0) * product.sell_price,
                price: product.sell_price
            };
        });

        new Sell({
            name: user.name,
            products: productsWithQty,
            phone: user.phone,
            note: req.body.note,
            status: 'pending',
            adress: user.city,
            bid: randomNumber,
            Date: moment().locale('ar-kw').format('l'),
            userId: user.id,
            isShop: true,
            total: Number(req.body.total)
        }).save()

        req.flash('order-suc', 'success')
        res.redirect('/shop/profile');
    } catch (err) {
        console.log(err);
        res.status(500).send('An error occurred while confirming the order');
    }
});




module.exports = router