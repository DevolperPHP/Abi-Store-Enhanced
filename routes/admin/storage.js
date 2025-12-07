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
        
        // OPTIMIZED: Use efficient aggregation instead of loading all products
        // Get autocomplete data with minimal fields
        const productDataForAutocomplete = await Product.find({}, 'name size').limit(5000);
        const uniqueArray = [
            ...new Set(productDataForAutocomplete.map(item => `${item.name} - ${item.size}`))
        ];

        // OPTIMIZED: Single efficient aggregation query for all analytics
        const analyticsData = await Product.aggregate([
            {
                $facet: {
                    // Main analytics in one query
                    mainStats: [
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
                    ],
                    // Stock analysis in same query with accurate calculations
                    stockAnalysis: [
                        {
                            $group: {
                                _id: null,
                                inStockItems: { 
                                    $sum: { 
                                        $cond: [{ $gt: [{ $add: ["$qty", "$stock"] }, 10] }, 1, 0] 
                                    } 
                                },
                                lowStockItems: { 
                                    $sum: { 
                                        $cond: [{ $and: [{ $gte: [{ $add: ["$qty", "$stock"] }, 1] }, { $lte: [{ $add: ["$qty", "$stock"] }, 10] }] }, 1, 0] 
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
                    ],
                    // Top categories by value (limited to 5 for performance)
                    categoryAnalysis: [
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
                        { $limit: 5 }
                    ]
                }
            }
        ]);

        // Extract results from facet
        const result = analyticsData[0] || {};
        const analytics = result.mainStats?.[0] || {};
        const stock = result.stockAnalysis?.[0] || {};
        const categoryAnalysis = result.categoryAnalysis || [];
        
        const totalSell = analytics.totalSellValue || 0;
        const totalBuy = analytics.totalBuyValue || 0;
        const totalStore = analytics.totalCashierValue || 0;
        const totalProducts = analytics.totalProducts || 0;
        const totalPotentialRevenue = analytics.totalPotentialRevenue || 0;
        const totalInvestment = analytics.totalInvestment || 0;
        const potentialProfit = totalPotentialRevenue - totalInvestment;

        // OPTIMIZED: Default initial load for infinite scroll experience
        const page = parseInt(req.query.page) || 1;
        const limitParam = req.query.limit;
        let limit;
        
        if (limitParam === 'all' || limitParam === '0' || !limitParam) {
            limit = 50; // Initial load 50 items, then infinite scroll takes over
        } else {
            // For any specific limit requested
            limit = parseInt(limitParam) || 50;
        }
        
        const skip = limit > 0 ? (page - 1) * limit : 0;
        
        // OPTIMIZED: Load categories separately with minimal data and limit
        // Only load essential fields for category dropdown, limit to prevent memory issues
        const allProductsForCategories = await Product.find({}, 'category name').limit(20000).lean();
        
        // OPTIMIZED: Load products with selective fields and proper indexing
        const products = await Product.find({})
            .select('name sku size color colorName colorHex category qty stock price sell_price image barcode Date') // Only essential fields
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit > 0 ? limit : 0);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            allProductsForCategories: allProductsForCategories,
            size: sizes,
            totalSell: totalSell,
            totalBuy: totalBuy,
            data: uniqueArray,
            initialLimit: limit,
            totalStore,
            api: 'api',
            // OPTIMIZED: Minimal analytics for initial load (loaded async later)
            analytics: {
                totalProducts: totalProducts,
                totalPotentialRevenue: totalPotentialRevenue,
                totalInvestment: totalInvestment,
                potentialProfit: potentialProfit,
                profitMargin: totalInvestment > 0 ? ((potentialProfit / totalInvestment) * 100).toFixed(1) : 0,
                avgProductPrice: Math.round(analytics.avgProductPrice || 0),
                avgSellPrice: Math.round(analytics.avgSellPrice || 0),
                inStockItems: stock.inStockItems || 0,
                lowStockItems: stock.lowStockItems || 0,
                outOfStockItems: stock.outOfStockItems || 0,
                highStockItems: stock.highStockItems || 0
            },
            categoryAnalysis: categoryAnalysis // Limited to 5 for performance
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

// Infinite scrolling API endpoint
router.get("/api/infinite-scroll", async (req, res) => {
    try {
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 20;
        const searchTerm = req.query.search || '';
        const category = req.query.category || '';
        const sortField = req.query.sortField || 'Date';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build query
        let query = {};
        
        if (searchTerm) {
            query.name = { $regex: searchTerm, $options: 'i' };
        }
        
        if (category && category !== 'all') {
            query.category = category;
        }

        // Get total count for pagination info
        const totalCount = await Product.countDocuments(query);

        // Fetch products with pagination and minimal fields (50 per chunk for optimal UX)
        const products = await Product.find(query)
            .select('name sku size color colorName colorHex category qty stock price sell_price image barcode Date')
            .sort({ [sortField]: sortOrder })
            .skip(offset)
            .limit(limit || 50); // Default to 50 items per scroll chunk

        // Calculate if there are more items
        const hasMore = offset + products.length < totalCount;

        res.json({
            products,
            hasMore,
            totalCount,
            currentOffset: offset,
            loadedCount: products.length,
            nextOffset: offset + products.length
        });

    } catch (err) {
        console.error("Error in infinite scroll API:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

// OPTIMIZED: Lazy loading analytics API
router.get("/api/analytics", async (req, res) => {
    try {
        // Efficient aggregation for analytics
        const analyticsData = await Product.aggregate([
            {
                $facet: {
                    mainStats: [
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
                    ],
                    stockAnalysis: [
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
                    ]
                }
            }
        ]);

        const result = analyticsData[0] || {};
        const analytics = result.mainStats?.[0] || {};
        const stock = result.stockAnalysis?.[0] || {};

        const totalSell = analytics.totalSellValue || 0;
        const totalBuy = analytics.totalBuyValue || 0;
        const totalStore = analytics.totalCashierValue || 0;
        const totalProducts = analytics.totalProducts || 0;
        const totalPotentialRevenue = analytics.totalPotentialRevenue || 0;
        const totalInvestment = analytics.totalInvestment || 0;
        const potentialProfit = totalPotentialRevenue - totalInvestment;

        res.json({
            analytics: {
                totalProducts,
                totalPotentialRevenue,
                totalInvestment,
                potentialProfit,
                profitMargin: totalInvestment > 0 ? ((potentialProfit / totalInvestment) * 100).toFixed(1) : 0,
                avgProductPrice: Math.round(analytics.avgProductPrice || 0),
                avgSellPrice: Math.round(analytics.avgSellPrice || 0),
                ...stock
            }
        });

    } catch (err) {
        console.error("Error fetching analytics:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

// OPTIMIZED: Categories API for lazy loading
router.get("/api/categories", async (req, res) => {
    try {
        // Get unique categories with minimal data and limit for performance
        const categories = await Product.aggregate([
            {
                $group: {
                    _id: "$name",
                    category: { $first: "$category" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    category: 1,
                    count: 1
                }
            },
            { $sort: { count: -1 } },
            { $limit: 500 } // Limit to prevent memory issues
        ]);

        res.json({ categories });

    } catch (err) {
        console.error("Error fetching categories:", err);
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
        
        // Get all products for category extraction
        const allProductsForCategories = await Product.find({}).select('category name').lean();
        
        const products = await Product.find({}).sort({ qty: -1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            allProductsForCategories: allProductsForCategories,
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
        
        // Get all products for category extraction
        const allProductsForCategories = await Product.find({}).select('category name').lean();
        
        const products = await Product.find({}).sort({ qty: 1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            allProductsForCategories: allProductsForCategories,
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
        
        // Get all products for category extraction
        const allProductsForCategories = await Product.find({}).select('category name').lean();
        
        const products = await Product.find({}).sort({ price: -1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            allProductsForCategories: allProductsForCategories,
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
        
        // Get all products for category extraction
        const allProductsForCategories = await Product.find({}).select('category name').lean();
        
        const products = await Product.find({}).sort({ price: 1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            allProductsForCategories: allProductsForCategories,
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
        
        // Get all products for category extraction
        const allProductsForCategories = await Product.find({}).select('category name').lean();
        
        const products = await Product.find({ size: req.params.size }).sort({ qty: 1 })
            .sort({ Date: -1 })
            .skip(skip)
            .limit(limit);

    res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            allProductsForCategories: allProductsForCategories,
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
                // Get all products for category extraction
                const allProductsForCategories = await Product.find({}).select('category name').lean();
                
                res.render("storage/storage-dashboard", {
                    user: user,
                    err: req.flash("permission-error"),
                    products: products,
                    allProductsForCategories: allProductsForCategories,
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