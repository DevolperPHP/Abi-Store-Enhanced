const express = require('express');
const User = require('../../models/User');
const Product = require('../../models/Product');
const router = express.Router();
const moment = require('moment');
const Purchase = require('../../models/Purchase');
const mongoose = require('mongoose')


router.get("/", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const products = await Product.find({})
        const data = products.map((item) => {
            return {
                name: item.name,
                size: item.size,

            }
        })

        const transformedArray = data.map((item) => `${item.name} - ${item.size}`);
        const uniqueArray = [...new Set(transformedArray)];

        if (user) {
            if (user.isAdmin == true || (user.permissions.includes("Purchase"))) {

                if (user.purchase.length > 0) {
                    const cost = user.purchase.map(x => x.total)
                    const total = cost.reduce((a, b) => a + b)

                    res.render("purchase/purchase", {
                        user: user,
                        data: uniqueArray,
                        err: req.flash("purchase-filter-error"),
                        err_new: req.flash("new-purchase-error"),
                        total: total,
                    })
                } else {

                    res.render("purchase/purchase", {
                        user: user,
                        data: uniqueArray,
                        err: req.flash("purchase-filter-error"),
                        err_new: req.flash("new-purchase-error"),
                        total: 0,
                    })
                }

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
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                res.render("purchase/search", {
                    user: user,
                    products: products,
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

router.get("/get/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const products = await Product.find({ _id: req.params.id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                res.render("purchase/get-item", {
                    user: user,
                    products: products,
                    data: data,
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

router.get('/get-by-code/:code', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ barcode: req.params.code })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                res.render('purchase/get-item-by-code', {
                    user: user,
                    data: data
                })
            }
        } else {
            res.redirect("/passport/sgin-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put("/add/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                const qty = Number(req.body.qty)
                const filter = user.purchase.find((item) => item.id === req.params.id)
                if (filter) {
                    req.flash("purchase-filter-error", "error")
                } else {
                    await User.updateOne({ _id: id }, {
                        $push: {
                            purchase: {
                                id: data.id,
                                name: data.name,
                                qty: qty,
                                image: data.image,
                                color: data.color,
                                size: data.size,
                                cost: data.price,
                                sell: data.sell_price,
                                total: Number(data.price) * Number(qty)
                            }
                        }
                    })
                }

                return res.redirect("/purchase")
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

router.put("/remove/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                const data = user.purchase.find((item) => item.id === req.params.id)

                await User.updateOne({ _id: id }, {
                    $pull: {
                        purchase: {
                            id: data.id,
                        }
                    }
                })
                res.redirect("back")
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

router.post("/new", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                if (user.purchase.length > 0) {
                    let cartItems = user.purchase;
                    const ids = cartItems.map(item => mongoose.Types.ObjectId(item.id));
                    const products = await Product.find({ _id: { $in: ids } });
                    if(req.body.storage == "Store"){
                        for (let product of products) {
                            const orderItem = cartItems.find(item => item.id === product._id.toString());
                            if (orderItem) {
                                product.stock += orderItem.qty;
                                await product.save();
                            }
                        }
                        const newPurchase = [
                            new Purchase({
                                trader: req.body.trader,
                                purchase: user.purchase,
                                user: user.name,
                                cost: req.body.cost,
                                store: true,
                                Date: moment().locale("ar-kw").format("l"),
                            })
                        ]
    
                        newPurchase.forEach((data) => {
                            data.save()
                        })
                    } else {
                        for (let product of products) {
                            const orderItem = cartItems.find(item => item.id === product._id.toString());
                            if (orderItem) {
                                product.qty += orderItem.qty;
                                await product.save();
                            }
                        }

                        const newPurchase = [
                            new Purchase({
                                trader: req.body.trader,
                                purchase: user.purchase,
                                user: user.name,
                                cost: req.body.cost,
                                Date: moment().locale("ar-kw").format("l"),
                            })
                        ]
    
                        newPurchase.forEach((data) => {
                            data.save()
                        })
                    }

                    await User.updateOne({ _id: id }, {
                        $set: { purchase: [] }
                    })

                    res.redirect("/purchase/get-purchases")
                } else {
                    req.flash("new-purchase-error", "error")
                    res.redirect("back")
                }
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


router.get("/get-purchases", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        
        // Get all purchases and sort by DD/MM/YYYY date format
        const purchases = await Purchase.find({})
        
        // Custom sorting function for DD/MM/YYYY format
        const sortedPurchases = purchases.sort((a, b) => {
            const [dayA, monthA, yearA] = a.Date.split('/').map(Number)
            const [dayB, monthB, yearB] = b.Date.split('/').map(Number)
            
            // Convert to timestamp for proper comparison (newest first)
            const dateA = new Date(yearA, monthA - 1, dayA).getTime()
            const dateB = new Date(yearB, monthB - 1, dayB).getTime()
            
            return dateB - dateA // Descending order (newest to oldest)
        })
        
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                res.render("purchase/get-purchases", {
                    user: user,
                    purchases: sortedPurchases,
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

// Search by trader
router.get("/search-by-trader/:trader", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const traderName = decodeURIComponent(req.params.trader)
        // Get purchases for specific trader and sort by DD/MM/YYYY date format
        const purchases = await Purchase.find({ trader: traderName })
        
        // Custom sorting function for DD/MM/YYYY format
        const sortedPurchases = purchases.sort((a, b) => {
            const [dayA, monthA, yearA] = a.Date.split('/').map(Number)
            const [dayB, monthB, yearB] = b.Date.split('/').map(Number)
            
            // Convert to timestamp for proper comparison (newest first)
            const dateA = new Date(yearA, monthA - 1, dayA).getTime()
            const dateB = new Date(yearB, monthB - 1, dayB).getTime()
            
            return dateB - dateA // Descending order (newest to oldest)
        })
        
        // Add search mode flag to indicate this is search results
        const searchResults = sortedPurchases.map(purchase => ({
            ...purchase.toObject(),
            searchMode: true
        }))
        
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                res.render("purchase/get-purchases", {
                    user: user,
                    purchases: searchResults,
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

// Search by date range
router.get("/search-by-date/:startDate/:endDate", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const { startDate, endDate } = req.params
        
        // Function to parse different date formats
        function parseDate(dateStr) {
            if (!dateStr || typeof dateStr !== 'string') {
                return null
            }
            
            // Handle YYYY-MM-DD format (from HTML date inputs)
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-')
                if (parts.length !== 3) {
                    return null
                }
                const [year, month, day] = parts.map(Number)
                return new Date(year, month - 1, day).getTime()
            }
            // Handle DD/MM/YYYY format
            else if (dateStr.includes('/')) {
                const parts = dateStr.split('/')
                if (parts.length !== 3) {
                    return null
                }
                const [day, month, year] = parts.map(Number)
                return new Date(year, month - 1, day).getTime()
            }
            return null
        }
        
        // Parse search date range
        const searchStartTimestamp = parseDate(startDate)
        const searchEndTimestamp = parseDate(endDate)
        
        if (!searchStartTimestamp || !searchEndTimestamp) {
            return res.render("purchase/get-purchases", {
                user: user,
                purchases: [],
            })
        }
        
        // Get all purchases and filter by date range
        const allPurchases = await Purchase.find({})
        
        // Filter purchases within date range
        const purchases = allPurchases.filter(purchase => {
            const purchaseTimestamp = parseDate(purchase.Date)
            if (!purchaseTimestamp) return false
            
            return purchaseTimestamp >= searchStartTimestamp && purchaseTimestamp <= searchEndTimestamp
        })
        
        // Custom sorting function for DD/MM/YYYY format
        const sortedPurchases = purchases.sort((a, b) => {
            const [dayA, monthA, yearA] = a.Date.split('/').map(Number)
            const [dayB, monthB, yearB] = b.Date.split('/').map(Number)
            
            // Convert to timestamp for proper comparison (newest first)
            const dateA = new Date(yearA, monthA - 1, dayA).getTime()
            const dateB = new Date(yearB, monthB - 1, dayB).getTime()
            
            return dateB - dateA // Descending order (newest to oldest)
        })
        
        // Add search mode flag to indicate this is search results
        const searchResults = sortedPurchases.map(purchase => ({
            ...purchase.toObject(),
            searchMode: true
        }))
        
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                res.render("purchase/get-purchases", {
                    user: user,
                    purchases: searchResults,
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log('💥 Date search error:', err);
        // Return empty array on error instead of showing all data
        res.render("purchase/get-purchases", {
            user: user,
            purchases: [],
        })
    }
})

// Search by filter (newest, oldest, store, main)
router.get("/search-by-filter/:filter", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const filter = req.params.filter
        
        let purchases
        
        switch(filter) {
            case 'newest':
                purchases = await Purchase.find({})
                break
            case 'oldest':
                purchases = await Purchase.find({})
                break
            case 'store':
                purchases = await Purchase.find({ store: true })
                break
            case 'main':
                purchases = await Purchase.find({ store: false })
                break
            default:
                purchases = await Purchase.find({})
        }
        
        // Custom sorting function for DD/MM/YYYY format
        const sortedPurchases = purchases.sort((a, b) => {
            const [dayA, monthA, yearA] = a.Date.split('/').map(Number)
            const [dayB, monthB, yearB] = b.Date.split('/').map(Number)
            
            // Convert to timestamp for proper comparison
            const dateA = new Date(yearA, monthA - 1, dayA).getTime()
            const dateB = new Date(yearB, monthB - 1, dayB).getTime()
            
            // Handle different sort orders based on filter
            if (filter === 'oldest') {
                return dateA - dateB // Ascending order (oldest to newest)
            } else {
                return dateB - dateA // Descending order (newest to oldest)
            }
        })
        
        // Add search mode flag to indicate this is search results
        const searchResults = sortedPurchases.map(purchase => ({
            ...purchase.toObject(),
            searchMode: true
        }))
        
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                res.render("purchase/get-purchases", {
                    user: user,
                    purchases: searchResults,
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

// API endpoint for infinite scroll
router.get("/api", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 20
        const skip = (page - 1) * limit
        
        let purchases = await Purchase.find({})
            .skip(skip)
            .limit(limit)
            .lean()
        
        // Sort by DD/MM/YYYY date format (newest to oldest)
        purchases.sort((a, b) => {
            const [dayA, monthA, yearA] = a.Date.split('/').map(Number)
            const [dayB, monthB, yearB] = b.Date.split('/').map(Number)
            
            // Convert to timestamp for proper comparison
            const dateA = new Date(yearA, monthA - 1, dayA).getTime()
            const dateB = new Date(yearB, monthB - 1, dayB).getTime()
            
            return dateB - dateA // Descending order (newest to oldest)
        })
        
        // Transform data to include calculated totals
        const transformedPurchases = purchases.map(purchase => {
            let calculatedTotal = 0
            let itemsTotal = 0
            
            // Sum up all item totals
            if (purchase.purchase && purchase.purchase.length > 0) {
                itemsTotal = purchase.purchase.reduce((sum, item) => sum + (item.total || 0), 0)
            }
            
            // Add the additional cost
            calculatedTotal = itemsTotal + (purchase.cost || 0)
            
            return {
                ...purchase,
                calculatedTotal
            }
        })
        
        res.json(transformedPurchases)
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server error" });
    }
})

router.get("/get-purchase/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                const data = await Purchase.findOne({ _id: req.params.id })
                if (data.purchase.length > 1) {
                    const cost = data.purchase.map(x => x.total)
                    const total = cost.reduce((a, b) => a + b)


                    res.render("purchase/get-purchase-data", {
                        user: user,
                        data: data,
                        total: total,
                    })
                } else {

                    res.render("purchase/get-purchase-data", {
                        user: user,
                        data: data,
                        total: data.purchase[0].cost,
                    })
                }
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true || user.permissions.includes("Purchase")) {
            const data = await Purchase.findOne({ _id: req.params.id })
            if (data.purchase.length > 0) {
                
                const cost = data.purchase.map(x => x.cost)
                const qty = data.purchase.map(x => x.qty)
                var total = []
                for (let i = 0; i < cost.length; i++) {
                    total.push(cost[i] * qty[i])
                }
                var finalTotal = total.reduce((a, b) => a+b)
                res.render('purchase/edit', {
                    user: user,
                    data: data,
                    total: finalTotal,
                })
            } else {
                await Purchase.deleteOne({ _id: req.params.id })
                res.redirect("/purchase/get-purchases")
            }
        }
    } catch (err) {
        console.log(err);
    }
})


router.put("/edit/remove/:pId/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const getPurchase = await Purchase.findOne({ _id: req.params.pId })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                const data = getPurchase.purchase.find((item) => item.id === req.params.id)
                const product = await Product.findOne({ _id: req.params.id })
                await Product.updateOne({ _id: req.params.id }, {
                    $set: {
                        qty: Number(product.qty) - Number(data.qty)
                    },

                    $pull: {
                        purchase: {
                            date: data.date
                        }
                    }
                })

                await Purchase.updateOne({ _id: req.params.pId }, {
                    $pull: {
                        purchase: {
                            id: data.id,
                        }
                    }
                })
                res.redirect(`/purchase/edit/${getPurchase.id}`)
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


router.put('/edit/confirm/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true || uesr.permissions.includes("Purchase")) {
            const { trader, cost } = req.body
            await Purchase.updateOne({ _id: req.params.id }, {
                $set: {
                    trader: trader,
                    cost: cost,
                    user: user.name
                }
            })

            res.redirect(`/purchase/get-purchase/${req.params.id}`)
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/add-by-code/:code', async (req, res) => {
    try {
        try {
            const id = req.cookies.id
            const user = await User.findOne({ _id: id })
            const data = await Product.findOne({ barcode: req.params.code })
            if (user) {
                if (user.isAdmin == true || user.permissions.includes("Purchase")) {
                    const filter = user.purchase.find((item) => item.id === data.id)
                    if (filter) {
                        const oldQty = filter.qty
                        await User.updateOne({ _id: id, 'purchase.id': data.id }, {
                            $set: {
                                'purchase.$.qty': oldQty + 1,
                                'purchase.$.total': (oldQty + 1) * data.price
                            }
                        })

                    } else {
                        await User.updateOne({ _id: id }, {
                            $push: {
                                purchase: {
                                    id: data.id,
                                    name: data.name,
                                    qty: 1,
                                    image: data.image,
                                    color: data.color,
                                    size: data.size,
                                    cost: data.price,
                                    sell: data.sell_price,
                                    total: Number(data.price) * 1
                                }
                            }
                        })
                    }

                    return res.redirect("/purchase")
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

    } catch (err) {
        console.log(err);
    }
})

router.get('/edit-qty/:id/:oldQty', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user.isAdmin == true || user.permissions.includes("Purchase")) {
            res.render('purchase/edit-qty', {
                user: user,
                data: data,
                oldQty: req.params.oldQty
            })
        }

    } catch (err) {
        console.log(err);
    }
})

router.put('/edit-qty/:id/:oldQty', async (req, res) => {
    try {
        const id = req.cookies.id
        const oldQty = req.params.oldQty
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })
        if (user.isAdmin == true || user.permissions.includes("Purchase")) {
            const qty = Number(req.body.qty)
            await User.updateOne({ _id: id, 'purchase.id': req.params.id }, {
                $set: {
                    'purchase.$.qty': qty,
                    'purchase.$.total': qty * data.price
                }
            })
            res.redirect('/purchase')
        }
    } catch (err) {
        console.log(err);

    }
})

router.delete('/delete/:id', async (req, res) => {
    try {
        const userId = req.cookies.id;
        const purchaseId = req.params.id;
        const data = await Purchase.findOne({ _id: purchaseId })
        const user = await User.findOne({ _id: userId })

        if (user.isAdmin == true) {
            for (let item of data.purchase) {
                await Product.updateOne({ _id: item.id }, {
                    $inc: {
                        qty: item.qty
                    }
                })
            }

            await Purchase.deleteOne({ _id: purchaseId })
            res.redirect("/purchase/get-purchases")
        }

    } catch (error) {
        console.log(error);

    }
});

module.exports = router