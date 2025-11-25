const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const Brand = require('../../models/Brand');
const User = require('../../models/User');
const userData = require('../../middleware/userData')

router.use(userData)

router.get('/home', async (req, res) => {
    try {
        const count = await Category.countDocuments();
        const randomIndex = Math.floor(Math.random() * count)
        const category = await Category.findOne({}).skip(randomIndex)
        const products = await Product.find({ category: category.name }).limit(4)
        const brand = await Brand.find({})
        res.render('shop/home/index', {
            category: category,
            products: products,
            brand: brand,
            user: req.userData,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({});
        const data = await Promise.all(categories.map(async (category) => {
            const products = await Product.find({ category: category.name }).limit(4);
            return {
                category: category,
                products: products,
            };
        }));
        res.render('shop/home/categories', {
            category: data,
            user: req.userData,
        });
    } catch (err) {
        console.log(err);
    }
})

router.get('/category/:name', async (req, res) => {
    try {
        const category = await Category.findOne({ name: req.params.name });
        const uniqueProductNames = await Product.find({ category: category.name }).distinct('name');
        const uniqueProducts = [];

        for (const name of uniqueProductNames) {
            const product = await Product.findOne({ name });
            if (product) {
                uniqueProducts.push(product);
            }
        }

        res.render('shop/home/category-products', {
            products: uniqueProducts,
            category: category,
            user: req.userData,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/product/get/:id', async (req, res) => {
    try {
        const data = await Product.findOne({ _id: req.params.id })
        const images = await Product.find({ name: data.name })
        const uniqueImages = []
        const Images = []
        for (let i = 0; i < images.length; i++) {
            if (images[i].image !== data.image && images[i].color !== data.color && data.size == images[i].size) {
                uniqueImages.push(images[i])
            }
        }
        if (uniqueImages.length >= 3) {
            for (let i = 0; i < 3; i++) {
                Images.push(uniqueImages[i])
            }
        } else if (uniqueImages.length < 3) {
            for (let i = 0; i < uniqueImages.length; i++) {
                Images.push(uniqueImages[i])
            }
        }
        const sizes = await Product.find({ name: data.name })
        const uniqueItems = Object.values(
            sizes.reduce((acc, item) => {
                if (!acc[item.size]) {
                    acc[item.size] = item;
                }
                return acc;
            }, {})
        );

        const colors = await Product.find({ name: data.name })
        const uniqueColors = []

        const fav = []

        const user = await User.findOne({ _id: req.cookies.id })

        if (user) {
            for (let i = 0; i < user.fav.length; i++) {
                if (user.fav[i] == data.id) {
                    fav.push(user.fav[i])
                }
            }
        }


        for (let i = 0; i < colors.length; i++) {
            if (colors[i].size == data.size) {
                uniqueColors.push(colors[i])
            }
        }

        res.render('shop/home/product', {
            data: data,
            images: Images,
            sizes: uniqueItems,
            colors: uniqueColors,
            suc: req.flash('fav-success'),
            fav: fav,
            login_err: req.flash('login-err'),
            qty_err: req.flash('qty-error'),
            cart_suc: req.flash('cart-suc'),
            cart_err: req.flash('cart-err'),
            user: req.userData,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/brands', async (req, res) => {
    try {
        const brand = await Brand.find({})
        res.render('shop/home/brands', {
            brand: brand,
            user: req.userData,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/brands/:name', async (req, res) => {
    try {
        const brand = await Brand.findOne({ name: req.params.name })
        const products = await Product.find({ brand: brand.name })

        res.render('shop/home/brand-products', {
            brand: brand,
            products: products,
            user: req.userData,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/search', async (req, res) => {
    try {
        const uniqueProductNames = await Product.distinct('name');
        const uniqueProducts = [];
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]

        for (const name of uniqueProductNames) {
            const product = await Product.findOne({ name });
            if (product) {
                uniqueProducts.push(product);
            }
        }

        res.render('shop/home/search', {
            user: req.user,
            products: uniqueProducts,
            data: uniqueArray,
        })
    } catch (err) {
        console.log(err);
    }
})


router.get("/search/:name", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const searchValue = req.params.name
        const [name, size] = searchValue.split(' - ');
        const products = await Product.find({ name: name, size: size })
        const allProducts = await Product.find({})
        const data = allProducts.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render("shop/home/search", {
            user: user,
            products: products,
            data: uniqueArray,
        })
    } catch (err) {
        console.log(err);
    }
})
module.exports = router