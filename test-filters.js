/**
 * Test script to verify the new filters API endpoint
 * Run this to check if categories and brands are loaded correctly
 */

const fetch = require('node-fetch');

async function testFiltersAPI() {
    try {
        console.log('🧪 Testing Categories & Brands API...');
        
        // Test the new API endpoint
        const response = await fetch('http://localhost:3000/items/api/categories-brands');
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ API Response Success!');
            console.log(`📊 Categories found: ${data.categories.length}`);
            console.log(`🏷️  Brands found: ${data.brands.length}`);
            
            console.log('\n📋 All Categories:');
            data.categories.forEach((cat, index) => {
                console.log(`   ${index + 1}. ${cat}`);
            });
            
            console.log('\n🏷️  All Brands:');
            data.brands.forEach((brand, index) => {
                console.log(`   ${index + 1}. ${brand}`);
            });
            
            console.log('\n🎯 Filter dropdowns should now show ALL categories and brands!');
        } else {
            console.error('❌ API Response Failed:', data);
        }
        
    } catch (error) {
        console.error('❌ Error testing API:', error);
    }
}

// Test pagination with filters
async function testFilteredSearch() {
    try {
        console.log('\n🧪 Testing Filtered Search API...');
        
        const response = await fetch('http://localhost:3000/items/api/items/filter/search?search=test&page=1&limit=5');
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Search API Response Success!');
            console.log(`📦 Products found: ${data.products.length}`);
            console.log(`📄 Pagination: Page ${data.pagination.currentPage} of ${data.pagination.totalPages}`);
        } else {
            console.error('❌ Search API Response Failed:', data);
        }
        
    } catch (error) {
        console.error('❌ Error testing search API:', error);
    }
}

// Run tests
if (require.main === module) {
    (async () => {
        await testFiltersAPI();
        await testFilteredSearch();
    })();
}

module.exports = { testFiltersAPI, testFilteredSearch };