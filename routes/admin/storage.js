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

        // OPTIMIZED: Single efficient aggregation query for all analytics with new metrics
        const analyticsData = await Product.aggregate([
            {
                $facet: {
                    // Main analytics in one query with enhanced metrics
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
                    // Enhanced stock analysis with new critical metrics
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
                                },
                                // New metrics for enhanced dashboard
                                reorderAlertItems: { 
                                    $sum: { 
                                        $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 5] }, 1, 0] 
                                    } 
                                },
                                highValueItems: { 
                                    $sum: { 
                                        $cond: [{ $gte: ["$sell_price", 200000] }, 1, 0] 
                                    } 
                                }
                            }
                        }
                    ],
                    // Category analysis for new totalCategories metric
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

        // Calculate total categories count separately for accuracy
        const totalCategoriesData = await Product.distinct('name');
        const totalCategories = totalCategoriesData.length;

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
        const totalPotentialProfit = totalPotentialRevenue - totalInvestment;

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
            // COMPREHENSIVE: Enhanced analytics with all critical metrics for superior dashboard
            analytics: {
                totalProducts: totalProducts,
                totalPotentialRevenue: totalPotentialRevenue,
                totalInvestment: totalInvestment,
                totalPotentialProfit: totalPotentialProfit,
                profitMargin: totalInvestment > 0 ? ((totalPotentialProfit / totalInvestment) * 100).toFixed(1) : 0,
                avgProductPrice: Math.round(analytics.avgProductPrice || 0),
                avgSellPrice: Math.round(analytics.avgSellPrice || 0),
                inStockItems: stock.inStockItems || 0,
                lowStockItems: stock.lowStockItems || 0,
                outOfStockItems: stock.outOfStockItems || 0,
                highStockItems: stock.highStockItems || 0,
                // New critical metrics for enhanced analysis
                totalCategories: totalCategories,
                reorderAlertItems: stock.reorderAlertItems || 0,
                highValueItems: stock.highValueItems || 0
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

// Enhanced infinite scrolling API endpoint with full filter support
router.get("/api/infinite-scroll", async (req, res) => {
    try {
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 50;
        const searchTerm = req.query.search || '';
        const category = req.query.category || '';
        const sortField = req.query.sortField || 'Date';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        
        // New filter parameters
        const size = req.query.size || '';
        const stockStatus = req.query.stockStatus || '';
        const price = req.query.price || '';
        const sort = req.query.sort || '';

        // Build comprehensive query
        let query = {};
        
        // Search filter
        if (searchTerm) {
            query.name = { $regex: searchTerm, $options: 'i' };
        }
        
        // Category filter
        if (category && category !== 'all') {
            query.$or = [
                { category: category },
                { name: category }
            ];
        }
        
        // Size filter
        if (size && size !== '') {
            query.size = size;
        }
        
        // Stock status filter
        if (stockStatus && stockStatus !== '') {
            switch(stockStatus) {
                case 'in-stock':
                    query.$expr = { 
                        ...query.$expr,
                        $gte: [{ $add: ["$qty", "$stock"] }, 10] 
                    };
                    break;
                case 'low-stock':
                    query.$expr = { 
                        ...query.$expr,
                        $and: [
                            { $gte: [{ $add: ["$qty", "$stock"] }, 1] },
                            { $lte: [{ $add: ["$qty", "$stock"] }, 10] }
                        ]
                    };
                    break;
                case 'out-of-stock':
                    query.$expr = { 
                        ...query.$expr,
                        $eq: [{ $add: ["$qty", "$stock"] }, 0] 
                    };
                    break;
                case 'overstocked':
                    query.$expr = { 
                        ...query.$expr,
                        $gte: [{ $add: ["$qty", "$stock"] }, 100] 
                    };
                    break;
            }
        }
        
        // Price range filter
        if (price && price !== '') {
            switch(price) {
                case '0-50000':
                    query.sell_price = { $lt: 50000 };
                    break;
                case '50000-100000':
                    query.sell_price = { $gte: 50000, $lt: 100000 };
                    break;
                case '100000-500000':
                    query.sell_price = { $gte: 100000, $lt: 500000 };
                    break;
                case '500000+':
                    query.sell_price = { $gte: 500000 };
                    break;
            }
        }

        // Build sort options (support both old and new sort formats)
        let sortOptions = { Date: -1 };
        if (sort) {
            switch(sort) {
                case 'qty-most':
                    sortOptions = { qty: -1, Date: -1 };
                    break;
                case 'qty-less':
                    sortOptions = { qty: 1, Date: -1 };
                    break;
                case 'price-most':
                    sortOptions = { sell_price: -1, Date: -1 };
                    break;
                case 'price-less':
                    sortOptions = { sell_price: 1, Date: -1 };
                    break;
                case 'name-asc':
                    sortOptions = { name: 1, Date: -1 };
                    break;
                case 'name-desc':
                    sortOptions = { name: -1, Date: -1 };
                    break;
                case 'profit-desc':
                    sortOptions = { sell_price: -1, price: 1, Date: -1 };
                    break;
                case 'profit-asc':
                    sortOptions = { price: 1, sell_price: -1, Date: -1 };
                    break;
                case 'updated-desc':
                    sortOptions = { Date: -1 };
                    break;
                default:
                    sortOptions = { [sortField]: sortOrder };
            }
        } else {
            sortOptions = { [sortField]: sortOrder };
        }

        // Get total count for pagination info
        const totalCount = await Product.countDocuments(query);

        // Fetch products with pagination and minimal fields (50 per chunk for optimal UX)
        const products = await Product.find(query)
            .select('name sku size color colorName colorHex category qty stock price sell_price image barcode Date')
            .sort(sortOptions)
            .skip(offset)
            .limit(limit); // 50 items per scroll chunk

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

// COMPREHENSIVE: Enhanced lazy loading analytics API with all new metrics
router.get("/api/analytics", async (req, res) => {
    try {
        // Enhanced aggregation for comprehensive analytics
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
                                },
                                // Enhanced metrics for superior dashboard
                                reorderAlertItems: { 
                                    $sum: { 
                                        $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 5] }, 1, 0] 
                                    } 
                                },
                                highValueItems: { 
                                    $sum: { 
                                        $cond: [{ $gte: ["$sell_price", 200000] }, 1, 0] 
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
        const totalPotentialProfit = totalPotentialRevenue - totalInvestment;

        // Calculate total categories for enhanced metrics
        const totalCategoriesData = await Product.distinct('name');
        const totalCategories = totalCategoriesData.length;

        res.json({
            analytics: {
                totalProducts,
                totalPotentialRevenue,
                totalInvestment,
                totalPotentialProfit,
                profitMargin: totalInvestment > 0 ? ((totalPotentialProfit / totalInvestment) * 100).toFixed(1) : 0,
                avgProductPrice: Math.round(analytics.avgProductPrice || 0),
                avgSellPrice: Math.round(analytics.avgSellPrice || 0),
                // Enhanced metrics
                totalCategories: totalCategories,
                reorderAlertItems: stock.reorderAlertItems || 0,
                highValueItems: stock.highValueItems || 0,
                // Original stock metrics
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

// COMPREHENSIVE: Advanced filtering route for all filter combinations
router.get("/filter", async (req, res) => {
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
        const productDataForAutocomplete = await Product.find({}, 'name size').limit(5000);
        const uniqueArray = [
            ...new Set(productDataForAutocomplete.map(item => `${item.name} - ${item.size}`))
        ];

        // Extract filter parameters from query string
        const { sort, size, category, stockStatus, price, search, page = 1, limit = 50 } = req.query;
        
        // Build filter query
        let filterQuery = {};
        
        // Search filter
        if (search && search !== '') {
            filterQuery.name = { $regex: search, $options: 'i' };
        }
        
        // Size filter
        if (size && size !== '') {
            filterQuery.size = size;
        }
        
        // Category filter (using name as category fallback)
        if (category && category !== '') {
            filterQuery.$or = [
                { category: category },
                { name: category }
            ];
        }
        
        // Stock status filter
        if (stockStatus && stockStatus !== '') {
            switch(stockStatus) {
                case 'in-stock':
                    filterQuery.$expr = { 
                        ...filterQuery.$expr,
                        $gte: [{ $add: ["$qty", "$stock"] }, 10] 
                    };
                    break;
                case 'low-stock':
                    filterQuery.$expr = { 
                        ...filterQuery.$expr,
                        $and: [
                            { $gte: [{ $add: ["$qty", "$stock"] }, 1] },
                            { $lte: [{ $add: ["$qty", "$stock"] }, 10] }
                        ]
                    };
                    break;
                case 'out-of-stock':
                    filterQuery.$expr = { 
                        ...filterQuery.$expr,
                        $eq: [{ $add: ["$qty", "$stock"] }, 0] 
                    };
                    break;
                case 'overstocked':
                    filterQuery.$expr = { 
                        ...filterQuery.$expr,
                        $gte: [{ $add: ["$qty", "$stock"] }, 100] 
                    };
                    break;
            }
        }
        
        // Price range filter
        if (price && price !== '') {
            switch(price) {
                case '0-50000':
                    filterQuery.sell_price = { $lt: 50000 };
                    break;
                case '50000-100000':
                    filterQuery.sell_price = { $gte: 50000, $lt: 100000 };
                    break;
                case '100000-500000':
                    filterQuery.sell_price = { $gte: 100000, $lt: 500000 };
                    break;
                case '500000+':
                    filterQuery.sell_price = { $gte: 500000 };
                    break;
            }
        }

        // Build sort options
        let sortOptions = { Date: -1 }; // Default sort
        if (sort) {
            switch(sort) {
                case 'qty-most':
                    sortOptions = { qty: -1, Date: -1 };
                    break;
                case 'qty-less':
                    sortOptions = { qty: 1, Date: -1 };
                    break;
                case 'price-most':
                    sortOptions = { sell_price: -1, Date: -1 };
                    break;
                case 'price-less':
                    sortOptions = { sell_price: 1, Date: -1 };
                    break;
                case 'name-asc':
                    sortOptions = { name: 1, Date: -1 };
                    break;
                case 'name-desc':
                    sortOptions = { name: -1, Date: -1 };
                    break;
                case 'profit-desc':
                    sortOptions = { sell_price: -1, price: 1, Date: -1 };
                    break;
                case 'profit-asc':
                    sortOptions = { price: 1, sell_price: -1, Date: -1 };
                    break;
                case 'updated-desc':
                    sortOptions = { Date: -1 };
                    break;
                default:
                    sortOptions = { Date: -1 };
            }
        }

        // COMPREHENSIVE: Enhanced aggregation query for filtered analytics with new metrics
        const analyticsData = await Product.aggregate([
            { $match: filterQuery }, // Apply filters to analytics too
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
                                },
                                // Enhanced filtered metrics
                                reorderAlertItems: { 
                                    $sum: { 
                                        $cond: [{ $lte: [{ $add: ["$qty", "$stock"] }, 5] }, 1, 0] 
                                    } 
                                },
                                highValueItems: { 
                                    $sum: { 
                                        $cond: [{ $gte: ["$sell_price", 200000] }, 1, 0] 
                                    } 
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        // Calculate filtered total categories
        const filteredCategoriesData = await Product.distinct('name', filterQuery);
        const totalCategories = filteredCategoriesData.length;

        // Extract results from facet
        const result = analyticsData[0] || {};
        const analytics = result.mainStats?.[0] || {};
        const stock = result.stockAnalysis?.[0] || {};
        
        const totalSell = analytics.totalSellValue || 0;
        const totalBuy = analytics.totalBuyValue || 0;
        const totalStore = analytics.totalCashierValue || 0;
        const totalProducts = analytics.totalProducts || 0;
        const totalPotentialRevenue = analytics.totalPotentialRevenue || 0;
        const totalInvestment = analytics.totalInvestment || 0;
        const totalPotentialProfit = totalPotentialRevenue - totalInvestment;

        // Pagination
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;
        
        // Get filtered products with sorting and pagination
        const products = await Product.find(filterQuery)
            .select('name sku size color colorName colorHex category qty stock price sell_price image barcode Date')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        // Get all products for category extraction (with filters applied)
        const allProductsForCategories = await Product.find(filterQuery).select('category name').lean();
        
        res.render("storage/storage-dashboard", {
            user: user,
            err: req.flash("permission-error"),
            products: products,
            allProductsForCategories: allProductsForCategories,
            size: sizes,
            totalSell: totalSell,
            totalBuy: totalBuy,
            data: uniqueArray,
            initialLimit: limitNum,
            totalStore,
            api: '/api/filter',
            // COMPREHENSIVE: Enhanced analytics for filtered results with new metrics
            analytics: {
                totalProducts: totalProducts,
                totalPotentialRevenue: totalPotentialRevenue,
                totalInvestment: totalInvestment,
                totalPotentialProfit: totalPotentialProfit,
                profitMargin: totalInvestment > 0 ? ((totalPotentialProfit / totalInvestment) * 100).toFixed(1) : 0,
                avgProductPrice: Math.round(analytics.avgProductPrice || 0),
                avgSellPrice: Math.round(analytics.avgSellPrice || 0),
                inStockItems: stock.inStockItems || 0,
                lowStockItems: stock.lowStockItems || 0,
                outOfStockItems: stock.outOfStockItems || 0,
                highStockItems: stock.highStockItems || 0,
                // Enhanced filtered metrics
                totalCategories: totalCategories,
                reorderAlertItems: stock.reorderAlertItems || 0,
                highValueItems: stock.highValueItems || 0
            },
            categoryAnalysis: [], // Empty for now, can be enhanced later
            // Pass current filter values to maintain UI state
            currentFilters: {
                sort: sort || '',
                size: size || '',
                category: category || '',
                stockStatus: stockStatus || '',
                price: price || '',
                search: search || ''
            }
        });

    } catch (err) {
        console.error("Error in filter route:", err);
        res.status(500).send("Server error occurred.");
    }
});

// API endpoint for filtered data
router.get("/api/filter", async (req, res) => {
    try {
        const { sort, size, category, stockStatus, price, page = 1, limit = 50 } = req.query;
        
        // Build filter query (same logic as main filter route)
        let filterQuery = {};
        
        // Size filter
        if (size && size !== '') {
            filterQuery.size = size;
        }
        
        // Category filter
        if (category && category !== '') {
            filterQuery.$or = [
                { category: category },
                { name: category }
            ];
        }
        
        // Stock status filter
        if (stockStatus && stockStatus !== '') {
            switch(stockStatus) {
                case 'in-stock':
                    filterQuery.$expr = { 
                        ...filterQuery.$expr,
                        $gte: [{ $add: ["$qty", "$stock"] }, 10] 
                    };
                    break;
                case 'low-stock':
                    filterQuery.$expr = { 
                        ...filterQuery.$expr,
                        $and: [
                            { $gte: [{ $add: ["$qty", "$stock"] }, 1] },
                            { $lte: [{ $add: ["$qty", "$stock"] }, 10] }
                        ]
                    };
                    break;
                case 'out-of-stock':
                    filterQuery.$expr = { 
                        ...filterQuery.$expr,
                        $eq: [{ $add: ["$qty", "$stock"] }, 0] 
                    };
                    break;
                case 'overstocked':
                    filterQuery.$expr = { 
                        ...filterQuery.$expr,
                        $gte: [{ $add: ["$qty", "$stock"] }, 100] 
                    };
                    break;
            }
        }
        
        // Price range filter
        if (price && price !== '') {
            switch(price) {
                case '0-50000':
                    filterQuery.sell_price = { $lt: 50000 };
                    break;
                case '50000-100000':
                    filterQuery.sell_price = { $gte: 50000, $lt: 100000 };
                    break;
                case '100000-500000':
                    filterQuery.sell_price = { $gte: 100000, $lt: 500000 };
                    break;
                case '500000+':
                    filterQuery.sell_price = { $gte: 500000 };
                    break;
            }
        }

        // Build sort options
        let sortOptions = { Date: -1 };
        if (sort) {
            switch(sort) {
                case 'qty-most':
                    sortOptions = { qty: -1, Date: -1 };
                    break;
                case 'qty-less':
                    sortOptions = { qty: 1, Date: -1 };
                    break;
                case 'price-most':
                    sortOptions = { sell_price: -1, Date: -1 };
                    break;
                case 'price-less':
                    sortOptions = { sell_price: 1, Date: -1 };
                    break;
                case 'name-asc':
                    sortOptions = { name: 1, Date: -1 };
                    break;
                case 'name-desc':
                    sortOptions = { name: -1, Date: -1 };
                    break;
                case 'profit-desc':
                    sortOptions = { sell_price: -1, price: 1, Date: -1 };
                    break;
                case 'profit-asc':
                    sortOptions = { price: 1, sell_price: -1, Date: -1 };
                    break;
                case 'updated-desc':
                    sortOptions = { Date: -1 };
                    break;
            }
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        const products = await Product.find(filterQuery)
            .select('name sku size color colorName colorHex category qty stock price sell_price image barcode Date')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        res.json({
            products,
            totalCount: products.length,
            currentPage: pageNum,
            totalPages: Math.ceil(products.length / limitNum)
        });

    } catch (err) {
        console.error("Error in filter API:", err);
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

// Export API endpoint for CSV download
router.get("/api/export", async (req, res) => {
    try {
        // Fetch all products for export (no pagination)
        const products = await Product.find({})
            .select('name sku size color colorName colorHex category qty stock price sell_price image barcode Date')
            .sort({ Date: -1 });

        res.json({
            products,
            totalCount: products.length,
            exportDate: new Date().toISOString()
        });

    } catch (err) {
        console.error("Error in export API:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

// Fuzzy Search API endpoint for real-time suggestions
router.get("/api/search-suggestions", async (req, res) => {
    try {
        const query = req.query.query || '';
        const limit = parseInt(req.query.limit) || 10;

        if (query.length < 2) {
            return res.json({ suggestions: [] });
        }

        // Get all products for fuzzy matching (limit for performance)
        const products = await Product.find({})
            .select('name sku size category colorName sell_price qty stock')
            .lean();

        // Fuzzy search algorithm - simple but effective
        const suggestions = [];
        const queryLower = query.toLowerCase();

        for (const product of products) {
            let score = 0;
            const nameLower = (product.name || '').toLowerCase();
            const skuLower = (product.sku || '').toLowerCase();
            const categoryLower = (product.category || '').toLowerCase();
            const colorLower = (product.colorName || '').toLowerCase();
            const sizeLower = (product.size || '').toLowerCase();

            // Exact match (highest score)
            if (nameLower === queryLower) {
                score = 100;
            }
            // Starts with query
            else if (nameLower.startsWith(queryLower)) {
                score = 90;
            }
            // Contains query
            else if (nameLower.includes(queryLower)) {
                score = 80;
            }
            // Fuzzy matching - calculate similarity
            else {
                score = calculateSimilarity(queryLower, nameLower) * 70;
            }

            // Bonus scores for other fields
            if (skuLower.includes(queryLower)) score += 20;
            if (categoryLower.includes(queryLower)) score += 15;
            if (colorLower.includes(queryLower)) score += 10;
            if (sizeLower.includes(queryLower)) score += 5;

            // Only include products with reasonable match score
            if (score > 20) {
                const totalStock = (product.qty || 0) + (product.stock || 0);
                const stockStatus = totalStock === 0 ? 'out-of-stock' : 
                                  totalStock <= 10 ? 'low-stock' : 'in-stock';

                suggestions.push({
                    _id: product._id,
                    name: product.name,
                    sku: product.sku,
                    size: product.size,
                    category: product.category || product.name,
                    color: product.colorName,
                    sellPrice: product.sell_price,
                    stock: totalStock,
                    stockStatus: stockStatus,
                    score: score,
                    // Create display text
                    displayText: createDisplayText(product),
                    // Create highlight text
                    highlightText: createHighlightText(product, query)
                });
            }
        }

        // Sort by score (highest first) and limit results
        suggestions.sort((a, b) => b.score - a.score);
        const limitedSuggestions = suggestions.slice(0, limit);

        res.json({ 
            suggestions: limitedSuggestions,
            query: query,
            totalResults: suggestions.length
        });

    } catch (err) {
        console.error("Error in fuzzy search API:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

// Helper function to calculate string similarity (Levenshtein-like)
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Helper function to create display text for suggestions
function createDisplayText(product) {
    const parts = [];
    
    if (product.name) parts.push(product.name);
    if (product.size) parts.push(`Size: ${product.size}`);
    if (product.colorName) parts.push(`Color: ${product.colorName}`);
    if (product.sku) parts.push(`SKU: ${product.sku}`);
    
    return parts.join(' • ');
}

// Helper function to create highlight text
function createHighlightText(product, query) {
    const name = product.name || '';
    const queryLower = query.toLowerCase();
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes(queryLower)) {
        const index = nameLower.indexOf(queryLower);
        const before = name.substring(0, index);
        const match = name.substring(index, index + query.length);
        const after = name.substring(index + query.length);
        
        return `${before}<mark>${match}</mark>${after}`;
    }
    
    return name;
}

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