// Simple Export Logic Test
// Test the CSV generation logic without needing Express

// Mock data for testing
const mockData = {
    sells: [
        {
            _id: '1',
            Date: '10/12/2024',
            total: 150000,
            isCashier: true,
            name: 'Ahmed Ali',
            phone: '07901234567'
        },
        {
            _id: '2', 
            Date: '11/12/2024',
            total: 200000,
            isCashier: false,
            name: 'Sara Hassan'
        },
        {
            _id: '3',
            Date: '12/12/2024',
            total: 75000,
            isCashier: true,
            name: 'Walk-in Customer'
        }
    ],
    purchases: [
        {
            _id: '1',
            Date: '10/12/2024',
            cost: 10000,
            store: false,
            purchase: [
                {
                    name: 'iPhone Case',
                    qty: 5,
                    total: 25000
                }
            ]
        }
    ],
    dailyMoney: [
        {
            _id: '1',
            Date: '10/12/2024',
            total: 5000
        },
        {
            _id: '2',
            Date: '11/12/2024', 
            total: 8000
        }
    ]
};

// Utility functions (copied from analysis.js)
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
        if (dateStr.includes('-') && !dateStr.includes('/')) {
            const [year, month, day] = dateStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return isNaN(date.getTime()) ? null : date;
        }
        
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
                const date = new Date(year, month, day);
                return isNaN(date.getTime()) ? null : date;
            }
        }
        
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
        
    } catch (error) {
        return null;
    }
}

function formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date === 'string') {
        return date;
    }
    return date.toLocaleDateString('en-GB');
}

function filterByDateRange(data, startDate, endDate, dateField = 'Date') {
    return data.filter(item => {
        if (!item[dateField]) return false;
        
        const itemDate = parseDate(item[dateField]);
        if (!itemDate) return false;
        
        return itemDate >= startDate && itemDate <= endDate;
    });
}

function calculateSaleTotal(sell) {
    if (sell.total && sell.total !== '' && !isNaN(parseFloat(sell.total))) {
        return parseFloat(sell.total);
    }
    
    if (sell.products && Array.isArray(sell.products) && sell.products.length > 0) {
        let productTotal = 0;
        
        for (let i = 0; i < sell.products.length; i++) {
            const product = sell.products[i];
            let productValue = 0;
            
            if (product.qty && product.qty > 0) {
                if (product.total && !isNaN(parseFloat(product.total)) && product.total > 0) {
                    productValue = parseFloat(product.total);
                } else if (product.sell_price && !isNaN(parseFloat(product.sell_price))) {
                    productValue = parseFloat(product.sell_price) * parseInt(product.qty);
                } else if (product.price && !isNaN(parseFloat(product.price))) {
                    productValue = parseFloat(product.price) * parseInt(product.qty);
                }
            }
            
            productTotal += productValue;
        }
        
        if (productTotal > 0) {
            return productTotal;
        }
    }
    
    if (sell.bid && !isNaN(parseFloat(sell.bid))) {
        return parseFloat(sell.bid);
    }
    
    return 0;
}

function calculateMetrics(sells, purchases, dailyMoney, analysisType) {
    const sellTotal = sells.reduce((acc, sell) => {
        const saleTotal = calculateSaleTotal(sell);
        return acc + saleTotal;
    }, 0);

    const purchaseTotal = purchases.reduce((acc, purchase) => {
        let itemsTotal = 0;
        
        if (purchase.purchase && Array.isArray(purchase.purchase)) {
            itemsTotal = purchase.purchase.reduce((pAcc, item) => {
                return pAcc + (parseFloat(item.total) || 0);
            }, 0);
        }
        
        const additionalCost = parseFloat(purchase.cost) || 0;
        return acc + itemsTotal + additionalCost;
    }, 0);

    const dailyMoneyTotal = dailyMoney.reduce((acc, day) => {
        return acc + (parseFloat(day.total) || 0);
    }, 0);

    const totalRevenue = sellTotal;
    const totalCosts = purchaseTotal + dailyMoneyTotal;
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const salesTransactions = sells.length;
    const purchaseTransactions = purchases.length;
    const dailyTransactions = dailyMoney.length;
    const totalTransactions = salesTransactions + purchaseTransactions + dailyTransactions;

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
        totalTransactions
    };
}

function getAnalysisTypeName(type) {
    switch (type) {
        case 'local':
            return 'Local Store';
        case 'main':
            return 'Main Storage';
        case 'combined':
        default:
            return 'Combined Business';
    }
}

// Test the CSV generation logic
function testCSVGeneration() {
    console.log('🧪 Testing CSV Export Logic...\n');
    
    try {
        // Setup test data
        const startDate = parseDate('2024-12-10');
        const endDate = parseDate('2024-12-12');
        const analysisType = 'combined';
        
        console.log('📅 Test Period:', formatDate(startDate), '-', formatDate(endDate));
        console.log('🏪 Analysis Type:', getAnalysisTypeName(analysisType));
        
        // Filter data by date range
        const sellByDate = filterByDateRange(mockData.sells, startDate, endDate);
        const purchasesByDate = filterByDateRange(mockData.purchases, startDate, endDate);
        const dailyMoneyByDate = filterByDateRange(mockData.dailyMoney, startDate, endDate);
        
        console.log('\n📊 Filtered Data:');
        console.log('Sales:', sellByDate.length, 'transactions');
        console.log('Purchases:', purchasesByDate.length, 'transactions');
        console.log('Daily Money:', dailyMoneyByDate.length, 'entries');
        
        // Calculate metrics
        const metrics = calculateMetrics(sellByDate, purchasesByDate, dailyMoneyByDate, analysisType);
        
        console.log('\n💰 Calculated Metrics:');
        console.log('Total Revenue:', metrics.sellTotal.toLocaleString(), 'IQD');
        console.log('Total Costs:', metrics.totalCosts.toLocaleString(), 'IQD');
        console.log('Net Profit:', metrics.netProfit.toLocaleString(), 'IQD');
        console.log('Profit Margin:', metrics.profitMargin.toFixed(1), '%');
        console.log('Total Transactions:', metrics.totalTransactions);
        
        // Generate CSV content
        const csvData = [];
        
        // Header
        csvData.push(['Analysis Report', getAnalysisTypeName(analysisType)]);
        csvData.push(['Period', `${formatDate(startDate)} - ${formatDate(endDate)}`]);
        csvData.push(['Generated', new Date().toLocaleDateString()]);
        csvData.push([]);
        
        // Summary
        csvData.push(['SUMMARY']);
        csvData.push(['Total Revenue', metrics.sellTotal.toLocaleString() + ' IQD']);
        csvData.push(['Total Costs', metrics.totalCosts.toLocaleString() + ' IQD']);
        csvData.push(['Net Profit', metrics.netProfit.toLocaleString() + ' IQD']);
        csvData.push(['Profit Margin', metrics.profitMargin.toFixed(1) + '%']);
        csvData.push(['Total Transactions', metrics.totalTransactions]);
        csvData.push([]);
        
        // Sales Data
        csvData.push(['SALES TRANSACTIONS']);
        csvData.push(['Date', 'Customer', 'Amount', 'Store Type']);
        sellByDate.forEach(sale => {
            csvData.push([
                sale.Date,
                sale.name || 'Walk-in Customer',
                calculateSaleTotal(sale).toLocaleString() + ' IQD',
                sale.isCashier === true ? 'Local Store' : 'Main Storage'
            ]);
        });
        
        // Convert to CSV string
        const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        
        console.log('\n📄 Generated CSV Content:');
        console.log('='.repeat(60));
        console.log(csvContent);
        console.log('='.repeat(60));
        
        // Validate CSV content
        console.log('\n🔍 CSV Validation:');
        
        const validations = [
            { test: csvContent.includes('"Analysis Report"'), desc: 'Report header present' },
            { test: csvContent.includes('"SUMMARY"'), desc: 'Summary section present' },
            { test: csvContent.includes('"SALES TRANSACTIONS"'), desc: 'Sales section present' },
            { test: csvContent.includes('IQD'), desc: 'Currency formatting present' },
            { test: csvContent.includes('"10/12/2024"'), desc: 'Date formatting correct' },
            { test: csvContent.includes('"Ahmed Ali"'), desc: 'Customer names present' },
            { test: csvContent.includes('"Local Store"'), desc: 'Store type classification' }
        ];
        
        let passed = 0;
        validations.forEach(validation => {
            const status = validation.test ? '✅' : '❌';
            console.log(`${status} ${validation.desc}`);
            if (validation.test) passed++;
        });
        
        console.log(`\n🎯 Test Results: ${passed}/${validations.length} validations passed`);
        
        if (passed === validations.length) {
            console.log('🎉 All tests passed! CSV export logic is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Review the implementation.');
        }
        
        // Test different analysis types
        console.log('\n🔄 Testing Different Analysis Types...');
        
        const analysisTypes = ['combined', 'local', 'main'];
        
        analysisTypes.forEach(type => {
            console.log(`\n📊 Testing ${getAnalysisTypeName(type)}:`);
            
            let filteredSells = mockData.sells;
            let filteredPurchases = mockData.purchases;
            
            if (type === 'local') {
                filteredSells = mockData.sells.filter(sell => sell.isCashier === true);
                filteredPurchases = mockData.purchases.filter(purchase => purchase.store === false || purchase.store === undefined || purchase.store === null);
            } else if (type === 'main') {
                filteredSells = mockData.sells.filter(sell => sell.isCashier === false || sell.isCashier === null || sell.isCashier === undefined);
                filteredPurchases = mockData.purchases.filter(purchase => purchase.store === true);
            }
            
            const sellByDateFiltered = filterByDateRange(filteredSells, startDate, endDate);
            const typeMetrics = calculateMetrics(sellByDateFiltered, purchasesByDate, dailyMoneyByDate, type);
            
            console.log(`  Revenue: ${typeMetrics.sellTotal.toLocaleString()} IQD`);
            console.log(`  Transactions: ${typeMetrics.totalTransactions}`);
        });
        
        console.log('\n✨ Export Logic Test Complete!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testCSVGeneration();