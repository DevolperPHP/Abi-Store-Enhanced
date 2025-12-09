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

        // Get all products - simplified approach
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
                    data: uniqueArray,
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
                    data: uniqueArray,
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
                    data: uniqueArray,
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


router.get("/edit/bulk/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const categories = await Category.find({})
        const brand = await Brand.find({})

        if (user.isAdmin == true || user.permissions.includes("Items")) {
            const data = await Product.findOne({ _id: req.params.id })
            res.render('items/edit-bulk', {
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

// Bulk operations API endpoints
router.post('/bulk-delete', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user && (user.isAdmin == true || user.permissions.includes("Items"))) {
            const { productIds } = req.body
            
            if (productIds && Array.isArray(productIds)) {
                await Product.deleteMany({ _id: { $in: productIds } })
                res.json({ success: true, message: 'Products deleted successfully' })
            } else {
                res.status(400).json({ success: false, message: 'Invalid product IDs' })
            }
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

router.post('/bulk-edit', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user && (user.isAdmin == true || user.permissions.includes("Items"))) {
            const { productIds, updates } = req.body
            
            if (productIds && Array.isArray(productIds) && updates) {
                await Product.updateMany(
                    { _id: { $in: productIds } },
                    { $set: updates }
                )
                res.json({ success: true, message: 'Products updated successfully' })
            } else {
                res.status(400).json({ success: false, message: 'Invalid data' })
            }
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// Advanced search API
router.get('/search-advanced', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user && (user.isAdmin == true || user.permissions.includes("Items"))) {
            const { query, category, brand, size, minPrice, maxPrice, inStock } = req.query
            
            let searchConditions = {}
            
            if (query) {
                searchConditions.$or = [
                    { name: { $regex: query, $options: 'i' } },
                    { brand: { $regex: query, $options: 'i' } },
                    { category: { $regex: query, $options: 'i' } },
                    { barcode: { $regex: query, $options: 'i' } }
                ]
            }
            
            if (category) searchConditions.category = category
            if (brand) searchConditions.brand = brand
            if (size) searchConditions.size = size
            if (minPrice || maxPrice) {
                searchConditions.sell_price = {}
                if (minPrice) searchConditions.sell_price.$gte = parseFloat(minPrice)
                if (maxPrice) searchConditions.sell_price.$lte = parseFloat(maxPrice)
            }
            if (inStock === 'true') {
                searchConditions.qty = { $gt: 0 }
            }

            const products = await Product.find(searchConditions)
            res.json({ success: true, products })
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// API endpoint for paginated items (for infinite scroll)
router.get('/api/items', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user && (user.isAdmin == true || user.permissions.includes("Items"))) {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 50
            const sort = req.query.sort || 'Date:-1'
            const [sortField, sortOrder] = sort.split(':')
            const sortOptions = { [sortField]: sortOrder === 'desc' ? -1 : 1 }

            const skip = (page - 1) * limit
            
            const products = await Product.find({})
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
            
            const total = await Product.countDocuments()
            const hasMore = (page * limit) < total
            
            // Get unique data for filters
            const allProducts = await Product.find({})
            const data = allProducts.map((item) => `${item.name} - ${item.size}`)
            const uniqueArray = [... new Set(data)]

            res.json({
                success: true,
                products,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasMore,
                    itemsPerPage: limit
                },
                filterData: uniqueArray
            })
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// API endpoint for paginated filtered items
router.get('/api/items/filter/:type', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user && (user.isAdmin == true || user.permissions.includes("Items"))) {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 50
            const filterType = req.params.type
            const searchQuery = req.query.search
            const category = req.query.category
            const brand = req.query.brand

            let query = {}
            let sortOptions = { Date: -1 }

            switch (filterType) {
                case 'all':
                    query = {}
                    break
                case 'new':
                    sortOptions = { Date: -1 }
                    break
                case 'old':
                    sortOptions = { Date: 1 }
                    break
            }

            // Add search filter if provided
            if (searchQuery && searchQuery.trim()) {
                const [name, size] = searchQuery.split(' - ')
                if (name && size) {
                    query = { name: name.trim(), size: size.trim() }
                } else {
                    query = { name: { $regex: searchQuery.trim(), $options: 'i' } }
                }
            }

            // Add category filter if provided
            if (category && category.trim()) {
                query.category = { $regex: category.trim(), $options: 'i' }
            }

            // Add brand filter if provided
            if (brand && brand.trim()) {
                query.brand = { $regex: brand.trim(), $options: 'i' }
            }

            const skip = (page - 1) * limit
            
            const products = await Product.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
            
            const total = await Product.countDocuments(query)
            const hasMore = (page * limit) < total
            
            res.json({
                success: true,
                products,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasMore,
                    itemsPerPage: limit
                }
            })
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// API endpoint to get ALL categories and brands from entire database
router.get('/api/categories-brands', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user && (user.isAdmin == true || user.permissions.includes("Items"))) {
            // Get ALL unique categories from entire database
            const allCategories = await Product.distinct('category')
            const categories = allCategories.filter(Boolean).sort()
            
            // Get ALL unique brands from entire database  
            const allBrands = await Product.distinct('brand')
            const brands = allBrands.filter(Boolean).sort()
            
            res.json({
                success: true,
                categories,
                brands,
                counts: {
                    totalCategories: categories.length,
                    totalBrands: brands.length
                }
            })
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// API endpoint for search with category and brand filters
router.get('/api/items/filter/search', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user && (user.isAdmin == true || user.permissions.includes("Items"))) {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 50
            const searchQuery = req.query.search
            const category = req.query.category
            const brand = req.query.brand

            if (!searchQuery || !searchQuery.trim()) {
                return res.status(400).json({ success: false, message: 'Search query is required' })
            }

            let query = {}
            let sortOptions = { Date: -1 }

            // Parse search query (supports "name - size" format)
            const [name, size] = searchQuery.split(' - ')
            if (name && size) {
                query = { 
                    name: { $regex: name.trim(), $options: 'i' },
                    size: { $regex: size.trim(), $options: 'i' }
                }
            } else {
                query = { 
                    $or: [
                        { name: { $regex: searchQuery.trim(), $options: 'i' } },
                        { brand: { $regex: searchQuery.trim(), $options: 'i' } },
                        { category: { $regex: searchQuery.trim(), $options: 'i' } },
                        { barcode: { $regex: searchQuery.trim(), $options: 'i' } }
                    ]
                }
            }

            // Add category filter if provided
            if (category && category.trim()) {
                query.category = { $regex: category.trim(), $options: 'i' }
            }

            // Add brand filter if provided
            if (brand && brand.trim()) {
                query.brand = { $regex: brand.trim(), $options: 'i' }
            }

            const skip = (page - 1) * limit
            
            const products = await Product.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
            
            const total = await Product.countDocuments(query)
            const hasMore = (page * limit) < total
            
            res.json({
                success: true,
                products,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasMore,
                    itemsPerPage: limit
                }
            })
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

// Get product statistics
router.get('/stats', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user && (user.isAdmin == true || user.permissions.includes("Items"))) {
            const totalProducts = await Product.countDocuments()
            const totalCategories = await Product.distinct('category').then(cats => cats.filter(Boolean).length)
            const totalBrands = await Product.distinct('brand').then(brands => brands.filter(Boolean).length)
            const lowStockProducts = await Product.countDocuments({ qty: { $lt: 10 } })
            const outOfStockProducts = await Product.countDocuments({ qty: 0 })
            
            const avgPrice = await Product.aggregate([
                { $group: { _id: null, avgPrice: { $avg: '$sell_price' } } }
            ])
            
            res.json({
                success: true,
                stats: {
                    totalProducts,
                    totalCategories,
                    totalBrands,
                    lowStockProducts,
                    outOfStockProducts,
                    avgPrice: Math.round(avgPrice[0]?.avgPrice || 0)
                }
            })
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' })
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server error' })
    }
})

module.exports = router