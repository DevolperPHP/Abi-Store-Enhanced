const express = require('express');
const User = require('../../models/User');
const router = express.Router();
const multer = require('multer');
const Product = require('../../models/Product');
const moment = require('moment');
const Size = require('../../models/Size');
const Colors = require('../../models/Colors');
const fs = require('fs');
const Category = require('../../models/Category');
const Brand = require('../../models/Brand');


const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public/upload/images");
    },

    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1000 * 1000,
    },
});


router.get("/", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
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
        if (user) {
            const permission = user.permissions.includes("Items")
            if (user.isAdmin == true || permission == true) {
                res.render("items/items", {
                    user: user,
                    products: uniqueProducts,
                    del: req.flash("delete-suc"),
                    data: uniqueArray,
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else[
            res.redirect("/passport/sign-up")
        ]
    } catch (err) {
        console.log(err);
    }
})

router.get("/filter/all", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        if (user) {
            const permission = user.permissions.includes("Items")
            if (user.isAdmin == true || permission == true) {
                res.render("items/items", {
                    user: user,
                    products: products,
                    del: req.flash("delete-suc"),
                    data: uniqueArray
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else[
            res.redirect("sign-up")
        ]
    } catch (err) {
        console.log(err);
    }
})

router.get("/filter/new", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const products = await Product.find({}).sort({ Date: -1 })
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        if (user) {
            const permission = user.permissions.includes("Items")
            if (user.isAdmin == true || permission == true) {
                res.render("items/items", {
                    user: user,
                    products: products,
                    del: req.flash("delete-suc"),
                    data: data,
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else[
            res.redirect("sign-up")
        ]
    } catch (err) {
        console.log(err);
    }
})

router.get("/filter/Old", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const products = await Product.find({}).sort({ Date: 1 })
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        if (user) {
            const permission = user.permissions.includes("Items")
            if (user.isAdmin == true || permission == true) {
                res.render("items/items", {
                    user: user,
                    products: products,
                    del: req.flash("delete-suc"),
                    data: data,
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else[
            res.redirect("sign-up")
        ]
    } catch (err) {
        console.log(err);
    }
})

router.get("/add-item", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const size = await Size.find({})
        const colors = await Colors.find({})
        const category = await Category.find({})
        const brand = await Brand.find({})

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Items")) {
                res.render("items/add-item-new", {
                    user: user,
                    suc: req.flash("item-add-success"),
                    size: size,
                    colors: colors,
                    err: req.flash("item-added-error"),
                    category: category,
                    brand: brand,
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

router.post("/add-item", upload.single("image"), async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Items")) {
                const { name, brand, price, qty, barcode, sell_price, color, size, colorName, category } = req.body

                const filter = await Product.findOne({ name: name, color: color, size: size })

                if (filter) {
                    req.flash("item-added-error", "error")
                    return res.redirect("/items/add-item")
                } else {
                    if (typeof req.file === "undefined") {
                        const newItem = [
                            new Product({
                                name: name,
                                price: price,
                                qty: qty,
                                barcode: barcode,
                                sell_price: sell_price,
                                color: color,
                                size: size,
                                colorName: colorName,
                                category: category,
                                brand: brand,
                                Date: moment().locale("ar-kw").format("l"),
                                image: "/upload/images/noImage.png",
                                des: req.body.des
                            })
                        ]

                        newItem.forEach((product) => {
                            product.save()
                        })
                    } else {
                        const newItem = [
                            new Product({
                                name: name,
                                price: price,
                                qty: qty,
                                barcode: barcode,
                                barcode: barcode,
                                sell_price: sell_price,
                                color: color,
                                size: size,
                                colorName: colorName,
                                category: category,
                                brand: brand,
                                Date: moment().locale("ar-kw").format("l"),
                                image: req.file.filename,
                                des: req.body.des
                            })
                        ]

                        newItem.forEach((product) => {
                            product.save()
                        })
                    }
                }

                req.flash("item-add-success", "success")
                return res.redirect("/items/add-item")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get("/get/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Items")) {
                const data = await Product.findOne({ _id: req.params.id })
                const colors = await Product.find({ name: data.name, size: data.size })

                const sizes = await Product.find({ name: data.name })

                const uniqueItems = Object.values(
                    sizes.reduce((acc, item) => {
                        if (!acc[item.size]) {
                            acc[item.size] = item;
                        }
                        return acc;
                    }, {})
                );

                const score = data.score.map(x => parseInt(x.num)).slice(-10)
                const scoreDate = data.score.map(x => x.Date).slice(-10)

                res.render("items/item", {
                    user: user,
                    data: data,
                    colors: colors,
                    suc: req.flash("color-added"),
                    sizes: uniqueItems,
                    edit_suc: req.flash("edit-suc"),
                    score: score,
                    scoreDate: scoreDate
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

router.get("/add-color/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Items")) {
                res.render("items/add-color", {
                    user: user,
                    data: data
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

router.post("/add-color/:id", upload.single('image'), async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Items")) {

                const { price, sell_price, barcode, qty, color, colorName } = req.body
                const newProduct = [
                    new Product({
                        name: data.name,
                        price: price,
                        qty: qty,
                        barcode: barcode,
                        Date: moment().locale("ar-kw").format("l"),
                        image: 'none',
                        color: color,
                        sell_price: sell_price,
                        size: data.size,
                        colorName: colorName,
                        category: data.category,
                        brand: data.brand,
                        des: data.des,
                    })
                ]

                newProduct.forEach((product) => {
                    product.save()
                })

                req.flash("color-added", "sucess")
                return res.redirect(`/items/get/${data.id}`)
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

router.get("/edit/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true || user.permissions.includes("Items")) {
            const data = await Product.findOne({ _id: req.params.id })
            const sizes = await Size.find({})
            const category = await Category.find({})
            const brand = await Brand.find({})
            res.render("items/edit", {
                user: user,
                data: data,
                sizes: sizes,
                category: category,
                brand: brand,
            })
        } else {
            req.flash("permission-error", "error")
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put("/edit/:id", upload.single("image"), async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Items")) {

                const { name, brand, category, price, sell_price, qty, barcode, color, size, colorName, stock} = req.body
                if (typeof req.file === "undefined") {
                    await Product.updateOne({ _id: req.params.id }, {
                        $set: {
                            name: name,
                            price: price,
                            sell_price: sell_price,
                            qty: qty,
                            barcode: barcode,
                            color: color,
                            size: size,
                            colorName: colorName,
                            category: category,
                            brand: brand,
                            des: req.body.des,
                            stock,
                        }
                    })

                } else {
                    await Product.updateOne({ _id: req.params.id }, {
                        $set: {
                            name: name,
                            price: price,
                            sell_price: sell_price,
                            qty: qty,
                            barcode: barcode,
                            color: color,
                            size: size,
                            image: req.file.filename,
                            category: category,
                            colorName: colorName,
                            brand: brand,
                            des: req.body.des,
                            stock,
                        }
                    })
                }

                await Product.updateMany({ name: data.name }, {
                    $set: {
                        des: req.body.des
                    }
                })

                req.flash("edit-suc", "success")
                return res.redirect(`/items/get/${data.id}`)
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

router.delete("/delete/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Items")) {
                await Product.deleteOne({ _id: req.params.id })
                req.flash("delete-suc", "success")
                return res.redirect("/items")
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
        if (user) {
            const permission = user.permissions.includes("Items")
            if (user.isAdmin == true || permission == true) {
                res.render("items/items", {
                    user: user,
                    products: products,
                    del: req.flash("delete-suc"),
                    data: uniqueArray,
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect("sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})


router.get('/add-size/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true || user.permissions.includes("Items")) {
            const data = await Product.findOne({ _id: req.params.id })
            const size = await Size.find({})
            res.render('items/add-size', {
                user: user,
                data: data,
                size: size
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.post('/add-size/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })
        if (user.isAdmin == true || user.permissions.includes("Items")) {
            const { price, sell_price, qty, barcode, size } = req.body
            const newItem = [
                new Product({
                    name: data.name,
                    price: price,
                    qty: qty,
                    barcode: barcode,
                    sell_price: sell_price,
                    color: data.color,
                    size: size,
                    colorName: data.colorName,
                    Date: moment().locale("ar-kw").format("l"),
                    image: data.image,
                    category: data.category,
                    brand: data.brand,
                    des: data.des
                })
            ]

            newItem.forEach((product) => {
                product.save()
            })

            return res.redirect(`/items/get/${data.id}`)
        }
    } catch (err) {
        console.log(err);
    }
})

router.get("/edit/price-all/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const categories = await Category.find({})
        const brand = await Brand.find({})

        if (user.isAdmin == true) {
            const data = await Product.findOne({ _id: req.params.id })
            res.render('items/edit-price-all', {
                data: data,
                user: user,
                brand: brand,
                category: categories
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put("/edit/price-all/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ id: id })

        if (user.isAdmin == true) {
            const data = await Product.findOne({ _id: req.params.id })
            await Product.updateMany({ name: data.name }, {
                $set: {
                    price: req.body.price,
                    sell_price: req.body.sell_price,
                    category: req.body.category,
                    brand: req.body.brand
                }
            })

            res.redirect(`/items/get/${data.id}`)
        }
    } catch (err) {
        console.log(err);
    }
})


router.get("/edit/name-all/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const data = await Product.findOne({ _id: req.params.id })
            res.render('items/edit-name-all', {
                data: data,
                user: user,
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put("/edit/name-all/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const data = await Product.findOne({ _id: req.params.id })
            await Product.updateMany(
                { name: data.name },
                {
                    $set: {
                        name: req.body.name,
                    }
                }
            )

            res.redirect(`/items/get/${data.id}`)
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("An error occurred while updating the name.")
    }
})


router.get("/edit/image-color-all/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const data = await Product.findOne({ _id: req.params.id })
            res.render('items/edit-img-colors', {
                data: data,
                user: user,
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/image-color-all/:id', upload.single('image'), async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ id: id })

        if (user.isAdmin == true) {
            const data = await Product.findOne({ _id: req.params.id })
            await Product.updateMany({ colorName: data.colorName, name: data.name }, {
                $set: {
                    image: req.file.filename
                }
            })

            res.redirect(`/items/get/${data.id}`)
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/barcode/:item', async (req, res) => {
    try {

        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const item = await Product.findOne({ _id: req.params.item })
        if (user.isAdmin == true) {
            res.render('items/barcode', {
                user: user,
                item: item.barcode,
                data: item
            })
        }

    } catch (err) {
        console.log(err);
    }
})
module.exports = router