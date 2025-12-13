const express = require('express')
const User = require('../../models/User')
const Sell = require('../../models/Sell')
const Purchase = require('../../models/Purchase')
const DailyMoney = require('../../models/DailyMoney')
const Category = require('../../models/Category')
const router = express.Router()

// Utility function to parse dates - FIXED VERSION
function parseDate(dateStr) {
    if (!dateStr) return null
    
    try {
        // Handle YYYY-MM-DD format from URL params
        if (dateStr.includes('-') && !dateStr.includes('/')) {
            const [year, month, day] = dateStr.split('-')
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            return isNaN(date.getTime()) ? null : date
        }
        
        // Handle DD/MM/YYYY format from database
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/')
            if (parts.length === 3) {
                const day = parseInt(parts[0])
                const month = parseInt(parts[1]) - 1 // Month is 0-indexed
                const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])
                const date = new Date(year, month, day)
                return isNaN(date.getTime()) ? null : date
            }
        }
        
        // Fallback: try parsing as Date
        const date = new Date(dateStr)
        return isNaN(date.getTime()) ? null : date
        
    } catch (error) {
        return null
    }
}

// DEBUG ROUTE - Test data retrieval
router.get('/debug', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (!user?.isAdmin) {
            return res.status(403).json({ error: "Access denied" })
        }

        // Get all data to debug
        const [sells, purchases, dailyMoney] = await Promise.all([
            Sell.find({}).limit(5).lean(),
            Purchase.find({}).limit(5).lean(),
            DailyMoney.find({}).limit(5).lean()
        ])

        res.json({
            message: "Debug data",
            user: user.name,
            dataCounts: {
                totalSells: await Sell.countDocuments(),
                totalPurchases: await Purchase.countDocuments(),
                totalDailyMoney: await DailyMoney.countDocuments()
            },
            sampleData: {
                sells: sells.map(s => ({ 
                    _id: s._id, 
                    Date: s.Date, 
                    total: s.total, 
                    isShop: s.isShop,
                    products: s.products ? s.products.length : 0
                })),
                purchases: purchases.map(p => ({ 
                    _id: p._id, 
                    Date: p.Date, 
                    cost: p.cost, 
                    store: p.store,
                    purchase: p.purchase ? p.purchase.length : 0
                })),
                dailyMoney: dailyMoney.map(d => ({ 
                    _id: d._id, 
                    Date: d.Date, 
                    total: d.total 
                }))
            }
        })
        
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Utility function to format date for display
function formatDate(date) {
    if (!date) return 'N/A'
    if (typeof date === 'string') {
        return date // Already formatted
    }
    return date.toLocaleDateString('en-GB') // DD/MM/YYYY format
}

// Utility function to filter data by date range
function filterByDateRange(data, startDate, endDate, dateField = 'Date') {
    return data.filter(item => {
        if (!item[dateField]) return false
        
        const itemDate = parseDate(item[dateField])
        if (!itemDate) return false
        
        return itemDate >= startDate && itemDate <= endDate
    })
}

// Calculate trends data for chart visualization
function calculateTrendsData(sells, purchases, dailyMoney, startDate, endDate) {
    // Group data by date for trend analysis
    const dailyData = new Map()
    
    // Process sales data
    sells.forEach(sale => {
        const date = sale.Date
        const total = calculateSaleTotal(sale)
        
        if (!dailyData.has(date)) {
            dailyData.set(date, { date, sales: 0, purchases: 0, dailyMoney: 0, profit: 0 })
        }
        
        const dayData = dailyData.get(date)
        dayData.sales += total
    })
    
    // Process purchases data
    purchases.forEach(purchase => {
        const date = purchase.Date
        let itemsTotal = 0
        
        if (purchase.purchase && Array.isArray(purchase.purchase)) {
            itemsTotal = purchase.purchase.reduce((pAcc, item) => {
                return pAcc + (parseFloat(item.total) || 0)
            }, 0)
        }
        
        const additionalCost = parseFloat(purchase.cost) || 0
        const totalCost = itemsTotal + additionalCost
        
        if (!dailyData.has(date)) {
            dailyData.set(date, { date, sales: 0, purchases: 0, dailyMoney: 0, profit: 0 })
        }
        
        const dayData = dailyData.get(date)
        dayData.purchases += totalCost
    })
    
    // Process daily money data
    dailyMoney.forEach(day => {
        const date = day.Date
        const total = parseFloat(day.total) || 0
        
        if (!dailyData.has(date)) {
            dailyData.set(date, { date, sales: 0, purchases: 0, dailyMoney: 0, profit: 0 })
        }
        
        const dayData = dailyData.get(date)
        dayData.dailyMoney += total
    })
    
    // Calculate profit and sort by date
    const trendData = Array.from(dailyData.values())
        .map(day => ({
            ...day,
            profit: day.sales - day.purchases - day.dailyMoney
        }))
        .sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))
    
    // Calculate insights
    const insights = calculateBusinessInsights(trendData)
    
    return {
        dailyData: trendData,
        insights
    }
}

// Calculate business insights from trend data
function calculateBusinessInsights(trendData) {
    if (trendData.length === 0) {
        return {
            growthOpportunities: [],
            areasForImprovement: [],
            keyMetrics: {}
        }
    }
    
    // Calculate key metrics
    const totalRevenue = trendData.reduce((sum, day) => sum + day.sales, 0)
    const totalProfit = trendData.reduce((sum, day) => sum + day.profit, 0)
    const avgDailyRevenue = totalRevenue / trendData.length
    const avgDailyProfit = totalProfit / trendData.length
    
    // Calculate trends (first half vs second half)
    const midPoint = Math.floor(trendData.length / 2)
    const firstHalf = trendData.slice(0, midPoint)
    const secondHalf = trendData.slice(midPoint)
    
    const firstHalfRevenue = firstHalf.reduce((sum, day) => sum + day.sales, 0)
    const secondHalfRevenue = secondHalf.reduce((sum, day) => sum + day.sales, 0)
    
    const revenueGrowth = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0
    
    // Generate insights
    const growthOpportunities = []
    const areasForImprovement = []
    
    if (revenueGrowth > 10) {
        growthOpportunities.push(`Revenue growth of ${revenueGrowth.toFixed(1)}% indicates strong market demand`)
        growthOpportunities.push(`Consider expanding inventory to capitalize on growth trend`)
    } else if (revenueGrowth < -5) {
        areasForImprovement.push(`Revenue declined by ${Math.abs(revenueGrowth).toFixed(1)}% - investigate market factors`)
        areasForImprovement.push(`Review pricing strategy and customer acquisition`)
    }
    
    if (totalRevenue > 0 && totalProfit / totalRevenue > 0.15) {
        growthOpportunities.push(`Healthy profit margin of ${((totalProfit / totalRevenue) * 100).toFixed(1)}% shows good pricing strategy`)
    } else if (totalRevenue > 0) {
        areasForImprovement.push(`Profit margin of ${((totalProfit / totalRevenue) * 100).toFixed(1)}% could be improved`)
    }
    
    // Add some general insights
    const bestDay = trendData.reduce((best, day) => day.sales > best.sales ? day : best, trendData[0])
    const worstDay = trendData.reduce((worst, day) => day.sales < worst.sales ? day : worst, trendData[0])
    
    growthOpportunities.push(`Peak performance on ${bestDay.date} with ${bestDay.sales.toLocaleString()} IQD revenue`)
    
    if (worstDay.sales < avgDailyRevenue * 0.5) {
        areasForImprovement.push(`Below-average performance on ${worstDay.date} needs attention`)
    }
    
    return {
        growthOpportunities,
        areasForImprovement,
        keyMetrics: {
            totalRevenue,
            totalProfit,
            avgDailyRevenue,
            avgDailyProfit,
            revenueGrowth,
            totalDays: trendData.length,
            bestDay: bestDay.date,
            worstDay: worstDay.date
        }
    }
}

// Calculate sale total with multiple fallback methods - ENHANCED FOR OLD ORDERS
function calculateSaleTotal(sell) {
    // Method 1: If sale has direct total field (and it's not empty)
    if (sell.total && sell.total !== '' && !isNaN(parseFloat(sell.total))) {
        return parseFloat(sell.total)
    }
    
    // Method 2: If sale has products array, sum product totals
    if (sell.products && Array.isArray(sell.products) && sell.products.length > 0) {
        let productTotal = 0
        
        for (let i = 0; i < sell.products.length; i++) {
            const product = sell.products[i]
            let productValue = 0
            
            // For this specific order pattern, use product.total when qty > 0
            if (product.qty && product.qty > 0) {
                if (product.total && !isNaN(parseFloat(product.total)) && product.total > 0) {
                    // Use stored product total for older orders
                    productValue = parseFloat(product.total)
                } else if (product.sell_price && !isNaN(parseFloat(product.sell_price))) {
                    // Calculate from sell_price * qty if total is missing
                    productValue = parseFloat(product.sell_price) * parseInt(product.qty)
                } else if (product.price && !isNaN(parseFloat(product.price))) {
                    // Fallback to price * qty
                    productValue = parseFloat(product.price) * parseInt(product.qty)
                }
            }
            
            productTotal += productValue
        }
        
        if (productTotal > 0) {
            return productTotal
        }
    }
    
    // Method 3: Check for bid field (sometimes used for total)
    if (sell.bid && !isNaN(parseFloat(sell.bid))) {
        return parseFloat(sell.bid)
    }
    
    // Return 0 if no valid total found
    return 0
}

// Main dashboard route
router.get('/', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user?.isAdmin) {
            res.render("analysis/dashboard", {
                user: user
            })
        } else {
            req.flash("permission-error", "error")
            res.redirect("/")
        }
    } catch (err) {
        res.status(500).send("Internal Server Error")
    }
})

// Enhanced analysis results route
router.get('/get/:start/:end', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const analysisType = req.query.type || 'combined'

        if (!user?.isAdmin) {
            req.flash("permission-error", "You do not have permission to view this page.")
            return res.redirect("/")
        }

        // Parse dates - handle the URL format YYYY-MM-DD
        const startDate = parseDate(req.params.start)
        const endDate = parseDate(req.params.end)
        
        if (!startDate || !endDate) {
            return res.status(400).send("Invalid date format")
        }
        
        if (startDate > endDate) {
            return res.status(400).send("Start date cannot be after end date")
        }

        // Fetch all data
        const [allSells, allPurchases, allDailyMoney, allCategories] = await Promise.all([
            Sell.find({}).lean(),
            Purchase.find({}).lean(),
            DailyMoney.find({}).lean(),
            Category.find({}).lean()
        ])

        // Apply analysis type filtering
        let filteredSells = allSells
        let filteredPurchases = allPurchases
        
        if (analysisType === 'local') {
            // Local store only (isCashier = true ONLY)
            filteredSells = allSells.filter(sell => sell.isCashier === true)
            filteredPurchases = allPurchases.filter(purchase => purchase.store === false || purchase.store === undefined || purchase.store === null)
        } else if (analysisType === 'main') {
            // Main storage only (isCashier = false OR isCashier == null OR isCashier == undefined)
            filteredSells = allSells.filter(sell => sell.isCashier === false || sell.isCashier === null || sell.isCashier === undefined)
            filteredPurchases = allPurchases.filter(purchase => purchase.store === true)
        }
        // For 'combined', use all data

        // Filter by date range
        const sellByDate = filterByDateRange(filteredSells, startDate, endDate)
        const purchasesByDate = filterByDateRange(filteredPurchases, startDate, endDate)
        const dailyMoneyByDate = filterByDateRange(allDailyMoney, startDate, endDate)

        // Calculate comprehensive metrics
        const metrics = calculateMetrics(sellByDate, purchasesByDate, dailyMoneyByDate, analysisType)
        
        // Calculate totals with proper error handling
        const sellTotal = metrics.sellTotal
        const purchaseTotal = metrics.purchaseTotal
        const dailyMoneyTotal = metrics.dailyMoneyTotal

        // Update sale objects with calculated totals for frontend display
        const updatedSells = sellByDate.map(sell => {
            const calculatedTotal = calculateSaleTotal(sell)
            return {
                ...sell,
                total: calculatedTotal, // Override with calculated total
                calculatedTotal: calculatedTotal // Also store in separate field for reference
            }
        })

        // Calculate trends and insights
        const trendsData = calculateTrendsData(sellByDate, purchasesByDate, dailyMoneyByDate, startDate, endDate)

        // Prepare data for the view
        const resultData = {
            user,
            sell: updatedSells, // Use updated sells with calculated totals
            purchases: purchasesByDate,
            purchaseTotal,
            sellTotal,
            dailyMoneyTotal,
            dailyMoney: dailyMoneyByDate,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            analysisType: getAnalysisTypeName(analysisType),
            metrics,
            totalItems: calculateTotalItems(purchasesByDate),
            categories: allCategories,
            trendsData // Add trends data for chart
        }

        res.render("analysis/result", resultData)
        
    } catch (err) {
        res.status(500).send("Internal Server Error")
    }
})

// Calculate comprehensive business metrics
function calculateMetrics(sells, purchases, dailyMoney, analysisType) {
    // Sales calculations with enhanced logic
    const sellTotal = sells.reduce((acc, sell) => {
        const saleTotal = calculateSaleTotal(sell)
        return acc + saleTotal
    }, 0)

    // Purchase calculations
    const purchaseTotal = purchases.reduce((acc, purchase) => {
        let itemsTotal = 0
        
        if (purchase.purchase && Array.isArray(purchase.purchase)) {
            itemsTotal = purchase.purchase.reduce((pAcc, item) => {
                return pAcc + (parseFloat(item.total) || 0)
            }, 0)
        }
        
        const additionalCost = parseFloat(purchase.cost) || 0
        return acc + itemsTotal + additionalCost
    }, 0)

    // Daily money calculations
    const dailyMoneyTotal = dailyMoney.reduce((acc, day) => {
        return acc + (parseFloat(day.total) || 0)
    }, 0)

    // Advanced metrics
    const totalRevenue = sellTotal
    const totalCosts = purchaseTotal + dailyMoneyTotal
    const netProfit = totalRevenue - totalCosts
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    
    // Transaction counts
    const salesTransactions = sells.length
    const purchaseTransactions = purchases.length
    const dailyTransactions = dailyMoney.length
    const totalTransactions = salesTransactions + purchaseTransactions + dailyTransactions
    
    // Average transaction values
    const avgSaleValue = salesTransactions > 0 ? sellTotal / salesTransactions : 0
    const avgPurchaseValue = purchaseTransactions > 0 ? purchaseTotal / purchaseTransactions : 0
    
    // Store type breakdown
    const localStoreSales = sells.filter(s => s.isShop === true).reduce((acc, sell) => {
        return acc + calculateSaleTotal(sell)
    }, 0)
    
    const mainStorageSales = sells.filter(s => s.isShop === false).reduce((acc, sell) => {
        return acc + calculateSaleTotal(sell)
    }, 0)

    return {
        sellTotal,
        purchaseTotal,
        dailyMoneyTotal,
        totalRevenue,
        totalCosts,
        netProfit,
        profitMargin,
        salesTransactions,
        purchaseTransactions,
        dailyTransactions,
        totalTransactions,
        avgSaleValue,
        avgPurchaseValue,
        localStoreSales,
        mainStorageSales,
        localStorePercentage: totalRevenue > 0 ? (localStoreSales / totalRevenue) * 100 : 0,
        mainStoragePercentage: totalRevenue > 0 ? (mainStorageSales / totalRevenue) * 100 : 0
    }
}

// Calculate total unique items in inventory
function calculateTotalItems(purchases) {
    const itemCounts = new Map()
    
    purchases.forEach(purchase => {
        if (purchase.purchase && Array.isArray(purchase.purchase)) {
            purchase.purchase.forEach(item => {
                const itemName = item.name || 'Unknown Item'
                itemCounts.set(itemName, (itemCounts.get(itemName) || 0) + (parseInt(item.qty) || 0))
            })
        }
    })
    
    return Array.from(itemCounts.values()).reduce((sum, count) => sum + count, 0)
}

// Get analysis type display name
function getAnalysisTypeName(type) {
    switch (type) {
        case 'local':
            return 'Local Store'
        case 'main':
            return 'Main Storage'
        case 'combined':
        default:
            return 'Combined Business'
    }
}

// Export data route (for future implementation)
router.get('/export/:start/:end', async (req, res) => {
    try {
        // This would implement Excel/PDF export functionality
        res.status(501).send("Export functionality not yet implemented")
    } catch (err) {
        res.status(500).send("Internal Server Error")
    }
})

// Get categories for filter dropdown
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({}).lean()
        res.json(categories)
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch categories" })
    }
})

// Get analytics summary for dashboard
router.get('/summary', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        
        if (!user?.isAdmin) {
            return res.status(403).json({ error: "Access denied" })
        }

        // Get current month data
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        
        const [sells, purchases, dailyMoney] = await Promise.all([
            Sell.find({}).lean(),
            Purchase.find({}).lean(),
            DailyMoney.find({}).lean()
        ])

        const currentMonthSells = filterByDateRange(sells, startOfMonth, endOfMonth)
        const currentMonthPurchases = filterByDateRange(purchases, startOfMonth, endOfMonth)
        const currentMonthDailyMoney = filterByDateRange(dailyMoney, startOfMonth, endOfMonth)

        const currentMetrics = calculateMetrics(currentMonthSells, currentMonthPurchases, currentMonthDailyMoney, 'combined')
        
        // Get previous month for comparison
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        
        const lastMonthSells = filterByDateRange(sells, startOfLastMonth, endOfLastMonth)
        const lastMonthPurchases = filterByDateRange(purchases, startOfLastMonth, endOfLastMonth)
        const lastMonthDailyMoney = filterByDateRange(dailyMoney, startOfLastMonth, endOfLastMonth)
        
        const lastMonthMetrics = calculateMetrics(lastMonthSells, lastMonthPurchases, lastMonthDailyMoney, 'combined')
        
        // Calculate percentage changes
        const revenueChange = lastMonthMetrics.sellTotal > 0 
            ? ((currentMetrics.sellTotal - lastMonthMetrics.sellTotal) / lastMonthMetrics.sellTotal) * 100 
            : 0
            
        const profitChange = lastMonthMetrics.netProfit > 0 
            ? ((currentMetrics.netProfit - lastMonthMetrics.netProfit) / lastMonthMetrics.netProfit) * 100 
            : 0
            
        const transactionChange = lastMonthMetrics.totalTransactions > 0 
            ? ((currentMetrics.totalTransactions - lastMonthMetrics.totalTransactions) / lastMonthMetrics.totalTransactions) * 100 
            : 0

        // Get unique customers count
        const uniqueCustomers = new Set(currentMonthSells.map(sell => sell.phone).filter(Boolean)).size
        
        res.json({
            totalRevenue: currentMetrics.sellTotal,
            totalProfit: currentMetrics.netProfit,
            totalTransactions: currentMetrics.totalTransactions,
            totalCustomers: uniqueCustomers,
            revenueChange: revenueChange.toFixed(1),
            profitChange: profitChange.toFixed(1),
            transactionChange: transactionChange.toFixed(1)
        })
        
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch summary" })
    }
})

module.exports = router
