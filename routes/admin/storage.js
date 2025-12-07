const express = require('express')
const User = require('../../models/User')
const Product = require('../../models/Product')
const Size = require('../../models/Size')
const router = express.Router()

router.get("/", async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findById(id);

        if (!user) {
            return res.redirect("/passport/sign-up");
        }

        const hasPermission = user.isAdmin || user.permissions.includes('Storage');
        if (!hasPermission) {
            req.flash("permission-error", "error");
            return res.redirect("/");
        }

        const sizes = await Size.find({});
        const productDataForAutocomplete = await Product.find({}, 'name size');
        const uniqueArray = [
            ...new Set(productDataForAutocomplete.map(item => `${item.name} - ${item.size}`))
        ];

        // Enhanced analytics with multiple calculations
        const analyticsData = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalSellValue: { $sum: { $multiply: ["$qty", "$sell_price"] } },
                    totalBuyValue: { $sum: { $multiply: ["$qty", "$price"] } },
                    totalCashierValue: { $sum: { $multiply: ["$stock", "$sell_price"] } },
                    totalPotentialRevenue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } },
                    totalInvestment: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$price"] } },
                    avgProductPrice: { $avg: "$price" },
                    avgSellPrice: { $avg: "$sell_price" }
                }
            }
        ]);

        // Stock level analysis
        const stockAnalysis = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    lowStockItems: { 
                        $sum: { 
                            $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 10] }, 1, 0] 
                        } 
                    },
                    outOfStockItems: { 
                        $sum: { 
                            $cond: [{ $eq: [{ $add: ["$qty", "$stock"] }, 0] }, 1, 0] 
                        } 
                    },
                    highStockItems: { 
                        $sum: { 
                            $cond: [{ $gte: [{ $add: ["$qty", "$stock"] }, 100] }, 1, 0] 
                        } 
                    }
                }
            }
        ]);

        // Category analysis
        const categoryAnalysis = await Product.aggregate([
            {
                $group: {
                    _id: "$name",
                    totalQuantity: { $sum: "$qty" },
                    storeQuantity: { $sum: "$stock" },
                    totalValue: { $sum: { $multiply: ["$qty", "$sell_price"] } },
                    avgPrice: { $avg: "$price" },
                    avgSellPrice: { $avg: "$sell_price" }
                }
            },
            { $sort: { totalValue: -1 } },
            { $limit: 10 }
        ]);

        const analytics = analyticsData[0] || {};
        const stock = stockAnalysis[0] || {};
        
        const totalSell = analytics.totalSellValue || 0;
        const totalBuy = analytics.totalBuyValue || 0;
        const totalStore = analytics.totalCashierValue || 0;
        const totalProducts = analytics.totalProducts || 0;
        const totalPotentialRevenue = analytics.totalPotentialRevenue || 0;
        const totalInvestment = analytics.totalInvestment || 0;
        const potentialProfit = totalPotentialRevenue - totalInvestment;

        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = req.query.limit === 'all' ? 0 : (parseInt(req.query.limit) || 24);
        const skip = limit > 0 ? (page - 1) * limit : 0;
        
        const products = await Product.find({})
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit > 0 ? limit : 0);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            size: sizes,
            totalSell: totalSell,
            totalBuy: totalBuy,
            data: uniqueArray,
            initialLimit: limit,
            totalStore,
            api: 'api',
            // Enhanced analytics data
            analytics: {
                totalProducts,
                totalPotentialRevenue,
                totalInvestment,
                potentialProfit,
                profitMargin: totalInvestment > 0 ? ((potentialProfit / totalInvestment) * 100).toFixed(1) : 0,
                avgProductPrice: Math.round(analytics.avgProductPrice || 0),
                avgSellPrice: Math.round(analytics.avgSellPrice || 0),
                ...stock
            },
            categoryAnalysis: categoryAnalysis.slice(0, 5) // Top 5 categories
        });

    } catch (err) {
        console.error("Error fetching storage data:", err);
        res.status(500).send("Server error occurred.");
    }
});

router.get("/api", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const products = await Product.find({})
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

        res.json(products);

    } catch (err) {
        console.error("Error fetching storage API data:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

router.get("/filter/qty-most", async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findById(id);

        if (!user) {
            return res.redirect("/passport/sign-up");
        }

        const hasPermission = user.isAdmin || user.permissions.includes('Storage');
        if (!hasPermission) {
            req.flash("permission-error", "error");
            return res.redirect("/");
        }

        const sizes = await Size.find({});
        const productDataForAutocomplete = await Product.find({}, 'name size');
        const uniqueArray = [
            ...new Set(productDataForAutocomplete.map(item => `${item.name} - ${item.size}`))
        ];
        const analyticsData = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalSellValue: { $sum: { $multiply: ["$qty", "$sell_price"] } },
                    totalBuyValue: { $sum: { $multiply: ["$qty", "$price"] } },
                    totalCashierValue: { $sum: { $multiply: ["$stock", "$sell_price"] } },
                    totalProducts: { $sum: 1 },
                    totalPotentialRevenue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } },
                    totalInvestment: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$price"] } }
                }
            }
        ]);

        const stockAnalysis = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    lowStockItems: { 
                        $sum: { 
                            $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 10] }, 1, 0] 
                        } 
                    },
                    outOfStockItems: { 
                        $sum: { 
                            $cond: [{ $eq: [{ $add: ["$qty", "$stock"] }, 0] }, 1, 0] 
                        } 
                    }
                }
            }
        ]);

        const totalSell = analyticsData[0]?.totalSellValue || 0;
        const totalBuy = analyticsData[0]?.totalBuyValue || 0;
        const totalStore = analyticsData[0]?.totalCashierValue || 0;
        const page = 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({}).sort({ qty: -1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            size: sizes,
            totalSell: totalSell,
            totalBuy: totalBuy,
            data: uniqueArray,
            initialLimit: limit,
            totalStore,
            api: "/api-qty-most",
        });

    } catch (err) {
        console.error("Error fetching storage data:", err);
        res.status(500).send("Server error occurred.");
    }
})

router.get("/api-qty-most", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({})
            .sort({ qty: -1 })
            .skip(skip)
            .limit(limit);

        res.json(products);

    } catch (err) {
        console.error("Error fetching storage API data:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

router.get("/filter/qty-less", async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findById(id);

        if (!user) {
            return res.redirect("/passport/sign-up");
        }

        const hasPermission = user.isAdmin || user.permissions.includes('Storage');
        if (!hasPermission) {
            req.flash("permission-error", "error");
            return res.redirect("/");
        }

        const sizes = await Size.find({});
        const productDataForAutocomplete = await Product.find({}, 'name size');
        const uniqueArray = [
            ...new Set(productDataForAutocomplete.map(item => `${item.name} - ${item.size}`))
        ];
        const analyticsData = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalSellValue: { $sum: { $multiply: ["$qty", "$sell_price"] } },
                    totalBuyValue: { $sum: { $multiply: ["$qty", "$price"] } },
                    totalCashierValue: { $sum: { $multiply: ["$stock", "$sell_price"] } },
                    totalProducts: { $sum: 1 },
                    totalPotentialRevenue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } },
                    totalInvestment: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$price"] } }
                }
            }
        ]);

        const stockAnalysis = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    lowStockItems: { 
                        $sum: { 
                            $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 10] }, 1, 0] 
                        } 
                    },
                    outOfStockItems: { 
                        $sum: { 
                            $cond: [{ $eq: [{ $add: ["$qty", "$stock"] }, 0] }, 1, 0] 
                        } 
                    }
                }
            }
        ]);

        const totalSell = analyticsData[0]?.totalSellValue || 0;
        const totalBuy = analyticsData[0]?.totalBuyValue || 0;
        const totalStore = analyticsData[0]?.totalCashierValue || 0;
        const page = 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({}).sort({ qty: 1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            size: sizes,
            totalSell: totalSell,
            totalBuy: totalBuy,
            data: uniqueArray,
            initialLimit: limit,
            totalStore,
            api: "/api-qty-less",
        });

    } catch (err) {
        console.error("Error fetching storage data:", err);
        res.status(500).send("Server error occurred.");
    }
})

router.get("/api-qty-less", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({})
            .sort({ qty: 1 })
            .skip(skip)
            .limit(limit);

        res.json(products);

    } catch (err) {
        console.error("Error fetching storage API data:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

router.get("/filter/cost-most", async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findById(id);

        if (!user) {
            return res.redirect("/passport/sign-up");
        }

        const hasPermission = user.isAdmin || user.permissions.includes('Storage');
        if (!hasPermission) {
            req.flash("permission-error", "error");
            return res.redirect("/");
        }

        const sizes = await Size.find({});
        const productDataForAutocomplete = await Product.find({}, 'name size');
        const uniqueArray = [
            ...new Set(productDataForAutocomplete.map(item => `${item.name} - ${item.size}`))
        ];
        const analyticsData = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalSellValue: { $sum: { $multiply: ["$qty", "$sell_price"] } },
                    totalBuyValue: { $sum: { $multiply: ["$qty", "$price"] } },
                    totalCashierValue: { $sum: { $multiply: ["$stock", "$sell_price"] } },
                    totalProducts: { $sum: 1 },
                    totalPotentialRevenue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } },
                    totalInvestment: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$price"] } }
                }
            }
        ]);

        const stockAnalysis = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    lowStockItems: { 
                        $sum: { 
                            $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 10] }, 1, 0] 
                        } 
                    },
                    outOfStockItems: { 
                        $sum: { 
                            $cond: [{ $eq: [{ $add: ["$qty", "$stock"] }, 0] }, 1, 0] 
                        } 
                    }
                }
            }
        ]);

        const totalSell = analyticsData[0]?.totalSellValue || 0;
        const totalBuy = analyticsData[0]?.totalBuyValue || 0;
        const totalStore = analyticsData[0]?.totalCashierValue || 0;
        const page = 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({}).sort({ price: -1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            size: sizes,
            totalSell: totalSell,
            totalBuy: totalBuy,
            data: uniqueArray,
            initialLimit: limit,
            totalStore,
            api: "/api-cost-most",
        });

    } catch (err) {
        console.error("Error fetching storage data:", err);
        res.status(500).send("Server error occurred.");
    }
})

router.get("/api-cost-most", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({})
            .sort({ price: -1 })
            .skip(skip)
            .limit(limit);

        res.json(products);

    } catch (err) {
        console.error("Error fetching storage API data:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

router.get("/filter/cost-less", async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findById(id);

        if (!user) {
            return res.redirect("/passport/sign-up");
        }

        const hasPermission = user.isAdmin || user.permissions.includes('Storage');
        if (!hasPermission) {
            req.flash("permission-error", "error");
            return res.redirect("/");
        }

        const sizes = await Size.find({});
        const productDataForAutocomplete = await Product.find({}, 'name size');
        const uniqueArray = [
            ...new Set(productDataForAutocomplete.map(item => `${item.name} - ${item.size}`))
        ];
        const analyticsData = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalSellValue: { $sum: { $multiply: ["$qty", "$sell_price"] } },
                    totalBuyValue: { $sum: { $multiply: ["$qty", "$price"] } },
                    totalCashierValue: { $sum: { $multiply: ["$stock", "$sell_price"] } },
                    totalProducts: { $sum: 1 },
                    totalPotentialRevenue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } },
                    totalInvestment: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$price"] } }
                }
            }
        ]);

        const stockAnalysis = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    lowStockItems: { 
                        $sum: { 
                            $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 10] }, 1, 0] 
                        } 
                    },
                    outOfStockItems: { 
                        $sum: { 
                            $cond: [{ $eq: [{ $add: ["$qty", "$stock"] }, 0] }, 1, 0] 
                        } 
                    }
                }
            }
        ]);

        const totalSell = analyticsData[0]?.totalSellValue || 0;
        const totalBuy = analyticsData[0]?.totalBuyValue || 0;
        const totalStore = analyticsData[0]?.totalCashierValue || 0;
        const page = 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({}).sort({ price: 1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            size: sizes,
            totalSell: totalSell,
            totalBuy: totalBuy,
            data: uniqueArray,
            initialLimit: limit,
            totalStore,
            api: "/api-cost-less",
        });

    } catch (err) {
        console.error("Error fetching storage data:", err);
        res.status(500).send("Server error occurred.");
    }
})

router.get("/api-cost-less", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({})
            .sort({ price: 1 })
            .skip(skip)
            .limit(limit);

        res.json(products);

    } catch (err) {
        console.error("Error fetching storage API data:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

router.get("/size/:size", async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findById(id);

        if (!user) {
            return res.redirect("/passport/sign-up");
        }

        const hasPermission = user.isAdmin || user.permissions.includes('Storage');
        if (!hasPermission) {
            req.flash("permission-error", "error");
            return res.redirect("/");
        }

        const sizes = await Size.find({});
        const productDataForAutocomplete = await Product.find({}, 'name size');
        const uniqueArray = [
            ...new Set(productDataForAutocomplete.map(item => `${item.name} - ${item.size}`))
        ];
        const analyticsData = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalSellValue: { $sum: { $multiply: ["$qty", "$sell_price"] } },
                    totalBuyValue: { $sum: { $multiply: ["$qty", "$price"] } },
                    totalCashierValue: { $sum: { $multiply: ["$stock", "$sell_price"] } },
                    totalProducts: { $sum: 1 },
                    totalPotentialRevenue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } },
                    totalInvestment: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$price"] } }
                }
            }
        ]);

        const stockAnalysis = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    lowStockItems: { 
                        $sum: { 
                            $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 10] }, 1, 0] 
                        } 
                    },
                    outOfStockItems: { 
                        $sum: { 
                            $cond: [{ $eq: [{ $add: ["$qty", "$stock"] }, 0] }, 1, 0] 
                        } 
                    }
                }
            }
        ]);

        const totalSell = analyticsData[0]?.totalSellValue || 0;
        const totalBuy = analyticsData[0]?.totalBuyValue || 0;
        const totalStore = analyticsData[0]?.totalCashierValue || 0;
        const page = 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const products = await Product.find({ size: req.params.size }).sort({ qty: 1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            size: sizes,
            totalSell: totalSell,
            totalBuy: totalBuy,
            data: uniqueArray,
            initialLimit: limit,
            totalStore,
            api: `api/size/${req.params.size}`
        });

    } catch (err) {
        console.error("Error fetching storage data:", err);
        res.status(500).send("Server error occurred.");
    }
})

router.get("/api/size/:size", async (req, res) => {
    try {
        const size = req.params.size;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const sortField = req.query.sortField || 'Date';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const products = await Product.find({ size })
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit);

        res.json(products);
    } catch (err) {
        console.error("Error fetching size-filtered data:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

router.get("/search/:name", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const uniqueProductNames = await Product.distinct('name');
        const searchValue = req.params.name
        const [name, size] = searchValue.split(' - ');
        const products = await Product.find({ name: name, size: size })
        const allProducts = await Product.find({})
        const data = allProducts.map((item) => `${item.name} - ${item.size}`)
        const uniqueProducts = [];
        const uniqueArray = [... new Set(data)]

        for (const name of uniqueProductNames) {
            const product = await Product.findOne({ name });
            if (product) {
                uniqueProducts.push(product);
            }
        }
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Storage')) {
                const size = await Size.find({})

                const totalSell = []
                const totalBuy = []
                const totalStore = []
                for (let i = 0; i < products.length; i++) {
                    totalSell.push(products[i].qty * products[i].sell_price)
                }

                for (let i = 0; i < products.length; i++) {
                    totalStore.push(products[i].stock * products[i].sell_price)
                }

                for (let i = 0; i < products.length; i++) {
                    totalBuy.push(products[i].qty * products[i].price)
                }
                res.render("storage/storage-dashboard", {
                    user: user,
                    err: req.flash("permission-error"),
                    products: products,
                    size: size,
                    totalSell: totalSell.reduce((a, b) => a + b),
                    totalBuy: totalBuy.reduce((a, b) => a + b),
                    data: uniqueArray,
                    initialLimit: 1000,
                    totalStore: totalStore.reduce((a, b) => Number(a) + Number(b)),
                    api: `/api/search/${req.params.name}`,
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

router.get("/api/search/:name", async (req, res) => {
    try {
        const searchValue = req.params.name;
        const [name, size] = searchValue.split(' - ');
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const query = { name };
        if (size) query.size = size;

        const products = await Product.find(query)
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

        const totalSell = products.reduce((sum, p) => sum + (p.qty * p.sell_price), 0);
        const totalBuy = products.reduce((sum, p) => sum + (p.qty * p.price), 0);
        const totalStore = products.reduce((sum, p) => sum + (p.stock * p.sell_price), 0);

        res.json({
            products,
            totalSell,
            totalBuy,
            totalStore,
            currentPage: page,
            limit,
        });
    } catch (err) {
        console.error("Error in search API:", err);
        res.status(500).json({ error: "Server error occurred." });
    }
});

// Storage Analytics Route
router.get("/analysis", async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findById(id);

        if (!user) {
            return res.redirect("/passport/sign-up");
        }

        const hasPermission = user.isAdmin || user.permissions.includes('Storage');
        if (!hasPermission) {
            req.flash("permission-error", "error");
            return res.redirect("/");
        }

        // Comprehensive analytics data aggregation
        const analytics = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalMainStock: { $sum: "$qty" },
                    totalStoreStock: { $sum: "$stock" },
                    totalStock: { $sum: { $add: ["$qty", "$stock"] } },
                    totalValue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } },
                    totalCost: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$price"] } },
                    lowStock: { 
                        $sum: { 
                            $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 10] }, 1, 0] 
                        } 
                    },
                    outOfStock: { 
                        $sum: { 
                            $cond: [{ $eq: [{ $add: ["$qty", "$stock"] }, 0] }, 1, 0] 
                        } 
                    }
                }
            }
        ]);

        // Category distribution
        const categoryDistribution = await Product.aggregate([
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryData'
                }
            },
            {
                $unwind: {
                    path: '$categoryData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$categoryData.name',
                    count: { $sum: 1 },
                    totalStock: { $sum: { $add: ["$qty", "$stock"] } },
                    totalValue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Brand distribution
        const brandDistribution = await Product.aggregate([
            {
                $lookup: {
                    from: 'brands',
                    localField: 'brand',
                    foreignField: '_id',
                    as: 'brandData'
                }
            },
            {
                $unwind: {
                    path: '$brandData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$brandData.name',
                    count: { $sum: 1 },
                    totalStock: { $sum: { $add: ["$qty", "$stock"] } },
                    totalValue: { $sum: { $multiply: [{ $add: ["$qty", "$stock"] }, "$sell_price"] } }
                }
            },
            { $sort: { totalValue: -1 } },
            { $limit: 10 }
        ]);

        // Top products by value
        const topProducts = await Product.find()
            .select('name size qty stock sell_price price')
            .lean()
            .sort({ sell_price: -1 })
            .limit(10);

        // Calculate profit margins
        const topProductsWithMetrics = topProducts.map(p => {
            const totalStock = (p.qty || 0) + (p.stock || 0);
            const totalValue = totalStock * (p.sell_price || 0);
            const totalCost = totalStock * (p.price || 0);
            const profit = totalValue - totalCost;
            const margin = p.sell_price && p.price ? 
                (((p.sell_price - p.price) / p.sell_price) * 100).toFixed(1) : 0;
            
            return {
                ...p,
                totalStock,
                totalValue,
                profit,
                margin
            };
        });

        // Low stock alerts
        const lowStockProducts = await Product.find({
            $expr: { $lte: [{ $add: ["$qty", "$stock"] }, 10] }
        })
            .select('name size qty stock barcode')
            .lean()
            .limit(20);

        // Stock distribution by location
        const locationDistribution = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    mainQty: { $sum: "$qty" },
                    storeQty: { $sum: "$stock" }
                }
            }
        ]);

        res.render("storage/analytics", {
            user,
            analytics: analytics[0] || {},
            categoryDistribution,
            brandDistribution,
            topProducts: topProductsWithMetrics,
            lowStockProducts,
            locationDistribution: locationDistribution[0] || { mainQty: 0, storeQty: 0 }
        });
    } catch (err) {
        console.error("Error in storage analysis:", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router