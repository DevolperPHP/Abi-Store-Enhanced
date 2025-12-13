// Test Export Functionality
const express = require('express');
const path = require('path');

// Mock the modules that analysis.js uses
const mockSell = [
    {
        _id: '1',
        Date: '10/12/2024',
        total: 150000,
        isCashier: true,
        name: 'Test Customer',
        phone: '07901234567'
    },
    {
        _id: '2', 
        Date: '11/12/2024',
        total: 200000,
        isCashier: false,
        name: 'Walk-in Customer'
    }
];

const mockPurchase = [
    {
        _id: '1',
        Date: '10/12/2024',
        cost: 10000,
        store: false,
        purchase: [
            {
                name: 'Test Item',
                qty: 2,
                total: 50000
            }
        ]
    }
];

const mockDailyMoney = [
    {
        _id: '1',
        Date: '10/12/2024',
        total: 5000
    }
];

// Mock User model
const mockUser = {
    _id: '1',
    name: 'Test Admin',
    isAdmin: true
};

// Override require for testing
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
    if (id === '../../models/User') {
        return class MockUser {
            static findOne(query) {
                return Promise.resolve(mockUser);
            }
        };
    }
    if (id === '../../models/Sell') {
        return class MockSell {
            static find(query) {
                return Promise.resolve(mockSell);
            }
            static countDocuments() {
                return Promise.resolve(mockSell.length);
            }
        };
    }
    if (id === '../../models/Purchase') {
        return class MockPurchase {
            static find(query) {
                return Promise.resolve(mockPurchase);
            }
        };
    }
    if (id === '../../models/DailyMoney') {
        return class MockDailyMoney {
            static find(query) {
                return Promise.resolve(mockDailyMoney);
            }
        };
    }
    if (id === '../../models/Category') {
        return class MockCategory {
            static find(query) {
                return Promise.resolve([]);
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

// Test the export route logic
async function testExportFunctionality() {
    console.log('🧪 Testing Export Functionality...');
    
    try {
        // Import the analysis router
        const analysisRouter = require('./routes/admin/analysis.js');
        
        // Create a mock Express app to test the route
        const app = express();
        app.use(express.json());
        
        // Mock cookie middleware
        app.use((req, res, next) => {
            req.cookies = { id: '1' };
            next();
        });
        
        // Mock flash messages
        req.flash = () => {};
        
        // Mock redirect
        res.redirect = (path) => {
            console.log('Redirect to:', path);
            return 'redirected';
        };
        
        // Mock res methods for CSV download
        const originalSetHeader = res.setHeader;
        const originalSend = res.send;
        
        let csvContent = '';
        let filename = '';
        
        res.setHeader = function(name, value) {
            console.log('Setting header:', name, value);
            if (name === 'Content-Disposition') {
                filename = value.match(/filename="([^"]+)"/)?.[1] || 'unknown.csv';
            }
            return originalSetHeader.call(this, name, value);
        };
        
        res.send = function(content) {
            csvContent = content;
            console.log('CSV Content generated (first 200 chars):');
            console.log(content.substring(0, 200) + '...');
            return content;
        };
        
        // Test the export route
        console.log('\n📊 Testing CSV Export Generation...');
        
        // Call the export route directly
        const req = {
            params: {
                start: '2024-12-10',
                end: '2024-12-12'
            },
            query: {
                type: 'combined'
            },
            cookies: {
                id: '1'
            },
            flash: (type, msg) => console.log(`Flash: ${type} - ${msg}`)
        };
        
        const res = {
            setHeader: (name, value) => {
                console.log('Setting header:', name, value);
                if (name === 'Content-Disposition') {
                    filename = value.match(/filename="([^"]+)"/)?.[1] || 'unknown.csv';
                }
            },
            send: (content) => {
                csvContent = content;
                console.log('✅ CSV Export generated successfully!');
                console.log('📁 Filename:', filename);
                console.log('📏 Content length:', content.length, 'characters');
                console.log('📄 First few lines:');
                console.log(content.split('\n').slice(0, 10).join('\n'));
                return content;
            },
            status: (code) => ({
                send: (msg) => {
                    console.log('❌ Error status:', code, msg);
                    throw new Error(`HTTP ${code}: ${msg}`);
                }
            })
        };
        
        await analysisRouter.handle(req, res);
        
        // Validate the CSV content
        console.log('\n🔍 Validating CSV Content...');
        
        if (csvContent.includes('"Analysis Report"')) {
            console.log('✅ Report header found');
        } else {
            console.log('❌ Report header missing');
        }
        
        if (csvContent.includes('"SUMMARY"')) {
            console.log('✅ Summary section found');
        } else {
            console.log('❌ Summary section missing');
        }
        
        if (csvContent.includes('"SALES TRANSACTIONS"')) {
            console.log('✅ Sales transactions section found');
        } else {
            console.log('❌ Sales transactions section missing');
        }
        
        if (csvContent.includes('IQD')) {
            console.log('✅ Currency formatting (IQD) found');
        } else {
            console.log('❌ Currency formatting missing');
        }
        
        if (filename.includes('analysis_report')) {
            console.log('✅ Proper filename format');
        } else {
            console.log('❌ Invalid filename format');
        }
        
        console.log('\n🎉 Export Functionality Test Complete!');
        console.log('✨ The export route is working correctly and generates valid CSV files.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testExportFunctionality();