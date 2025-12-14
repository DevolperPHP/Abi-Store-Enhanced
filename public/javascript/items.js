/**
 * Items Page - Infinite Scroll Implementation
 * Apple-inspired design with performance optimization
 */

class ItemsManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.isLoading = false;
        this.hasMore = true;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.currentSort = 'newest';
        this.allProducts = [];
        this.filteredProducts = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Items Manager with Infinite Scroll');
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup intersection observer for infinite scroll
        this.setupInfiniteScroll();
        
        console.log('✅ Items Manager initialized successfully');
    }

    async loadInitialData() {
        try {
            this.showLoadingState();
            
            // Load items and filter options in parallel
            const [itemsResponse, filtersResponse] = await Promise.all([
                fetch(`/items/api/items?page=1&limit=${this.itemsPerPage}&sort=${this.currentSort}`),
                fetch('/items/api/categories-brands')
            ]);
            
            const [itemsData, filtersData] = await Promise.all([
                itemsResponse.json(),
                filtersResponse.json()
            ]);
            
            if (itemsData.success && filtersData.success) {
                this.allProducts = itemsData.products;
                this.hasMore = itemsData.pagination.hasMore;
                this.currentPage = 1;
                
                // Populate filter dropdowns with ALL categories and brands
                this.populateFilters(filtersData);
                
                // Render items
                this.renderItems(this.allProducts);
                this.hideLoadingState();
                
                console.log(`✅ Loaded ${this.allProducts.length} items (Page 1)`);
                console.log(`🎯 Filter options: ${filtersData.categories.length} categories, ${filtersData.brands.length} brands`);
            } else {
                throw new Error(itemsData.message || filtersData.message || 'Failed to load data');
            }
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showErrorState('Failed to load items. Please try again.');
        }
    }

    populateFilters(filtersData) {
        const categoryFilter = document.getElementById('categoryFilter');
        const brandFilter = document.getElementById('brandFilter');
        
        if (!categoryFilter || !brandFilter) return;

        // Clear existing options (except first default option)
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        brandFilter.innerHTML = '<option value="">All Brands</option>';

        // Add ALL categories from entire database
        if (filtersData.categories && Array.isArray(filtersData.categories)) {
            filtersData.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }

        // Add ALL brands from entire database
        if (filtersData.brands && Array.isArray(filtersData.brands)) {
            filtersData.brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                brandFilter.appendChild(option);
            });
        }

        console.log(`📊 Populated filters: ${filtersData.categories?.length || 0} categories, ${filtersData.brands?.length || 0} brands`);
    }

    setupEventListeners() {
        // Search input with debouncing
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }

        // Filter changes
        const categoryFilter = document.getElementById('categoryFilter');
        const brandFilter = document.getElementById('brandFilter');
        const sortFilter = document.getElementById('sortFilter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (brandFilter) {
            brandFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (sortFilter) {
            sortFilter.addEventListener('change', () => this.applyFilters());
        }

        // Clear search button
        const clearBtn = document.querySelector('.search-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSearch());
        }

        console.log('✅ Event listeners setup complete');
    }

    setupInfiniteScroll() {
        const scrollTrigger = document.getElementById('scrollTrigger');
        if (!scrollTrigger) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && this.hasMore && !this.isLoading) {
                        console.log('📜 Scroll trigger hit, loading more items...');
                        this.loadMoreItems();
                    }
                });
            },
            {
                rootMargin: '100px' // Load when 100px away from bottom
            }
        );

        observer.observe(scrollTrigger);
        console.log('✅ Infinite scroll observer setup complete');
    }

    async loadMoreItems() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        this.showLoadingMore();

        try {
            const nextPage = this.currentPage + 1;
            const response = await fetch(`/items/api/items?page=${nextPage}&limit=${this.itemsPerPage}&sort=${this.currentSort}`);
            const data = await response.json();

            if (data.success && data.products.length > 0) {
                this.allProducts = [...this.allProducts, ...data.products];
                this.currentPage = nextPage;
                this.hasMore = data.pagination.hasMore;

                // Apply current filters to new data
                this.applyCurrentFilters();
                
                console.log(`✅ Loaded ${data.products.length} more items (Page ${nextPage})`);
                
                if (!this.hasMore) {
                    this.showEndOfResults();
                }
            } else {
                this.hasMore = false;
                this.showEndOfResults();
            }
        } catch (error) {
            console.error('❌ Error loading more items:', error);
            this.showErrorState('Failed to load more items. Please scroll again.');
        } finally {
            this.isLoading = false;
            this.hideLoadingMore();
        }
    }

    async handleSearch(query) {
        this.currentSearch = query.trim();
        
        if (this.currentSearch === '') {
            this.clearSearch();
            return;
        }

        // Show search clear button
        const clearBtn = document.querySelector('.search-clear');
        if (clearBtn) {
            clearBtn.style.display = 'block';
        }

        console.log(`🔍 Searching for: "${this.currentSearch}"`);
        await this.searchItems(this.currentSearch);
    }

    async searchItems(query) {
        try {
            this.showLoadingState();
            
            const response = await fetch(`/items/api/items/filter/search?search=${encodeURIComponent(query)}&page=1&limit=${this.itemsPerPage}`);
            const data = await response.json();
            
            if (data.success) {
                this.filteredProducts = data.products;
                this.hasMore = data.pagination.hasMore;
                this.currentPage = 1;
                
                // Show search results
                this.renderItems(this.filteredProducts);
                this.hideLoadingState();
                
                console.log(`✅ Search found ${this.filteredProducts.length} items`);
            } else {
                throw new Error(data.message || 'Search failed');
            }
        } catch (error) {
            console.error('❌ Search error:', error);
            this.showErrorState('Search failed. Please try again.');
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.querySelector('.search-clear');
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }

        this.currentSearch = '';
        this.filteredProducts = [];
        
        // Reset to show all products
        this.renderItems(this.allProducts);
        console.log('🧹 Search cleared');
    }

    async applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const brandFilter = document.getElementById('brandFilter');
        const sortFilter = document.getElementById('sortFilter');

        const category = categoryFilter ? categoryFilter.value : '';
        const brand = brandFilter ? brandFilter.value : '';
        const sort = sortFilter ? sortFilter.value : 'newest';

        this.currentFilter = { category, brand, sort };

        console.log('🔄 Applying filters:', this.currentFilter);

        try {
            this.showLoadingState();
            
            let url = `/items/api/items/filter/${this.currentFilter.sort || 'all'}?page=1&limit=${this.itemsPerPage}`;
            
            if (this.currentSearch) {
                url += `&search=${encodeURIComponent(this.currentSearch)}`;
            }
            
            if (this.currentFilter.category) {
                url += `&category=${encodeURIComponent(this.currentFilter.category)}`;
            }
            
            if (this.currentFilter.brand) {
                url += `&brand=${encodeURIComponent(this.currentFilter.brand)}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                this.filteredProducts = data.products;
                this.hasMore = data.pagination.hasMore;
                this.currentPage = 1;
                
                this.renderItems(this.filteredProducts);
                this.hideLoadingState();
                
                console.log(`✅ Filtered results: ${this.filteredProducts.length} items`);
            } else {
                throw new Error(data.message || 'Filter failed');
            }
        } catch (error) {
            console.error('❌ Filter error:', error);
            this.showErrorState('Filter failed. Please try again.');
        }
    }

    applyCurrentFilters() {
        // Re-apply current filters to all products
        if (this.currentSearch) {
            this.renderItems(this.filteredProducts);
        } else {
            this.renderItems(this.allProducts);
        }
    }

    renderItems(products) {
        const itemsList = document.getElementById('itemsList');
        const emptyState = document.getElementById('emptyState');
        
        if (!itemsList) return;

        if (products.length === 0) {
            itemsList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Hide empty state and show items
        if (emptyState) emptyState.style.display = 'none';
        itemsList.style.display = 'block';

        // Create items HTML
        const itemsHTML = products.map(product => this.createItemHTML(product)).join('');
        itemsList.innerHTML = itemsHTML;

        // Trigger animation for items
        this.animateItems();

        console.log(`🎨 Rendered ${products.length} items`);
    }

    animateItems() {
        const itemRows = document.querySelectorAll('.item-row');
        
        // Add animation class to trigger slide-in animation
        itemRows.forEach((row, index) => {
            // Remove any existing animation classes
            row.classList.remove('animate', 'finished');
            
            // Add animation class
            setTimeout(() => {
                row.classList.add('animate');
                
                // Remove animation class after animation completes and ensure visibility
                setTimeout(() => {
                    row.classList.add('finished');
                    row.classList.remove('animate');
                }, 600 + (index * 100)); // Animation duration + staggered delay
            }, index * 50); // Stagger the start of each animation
        });

        // Safety fallback: ensure all items are visible after 2 seconds
        setTimeout(() => {
            itemRows.forEach(row => {
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
                row.classList.add('finished');
                row.classList.remove('animate');
            });
        }, 2000);
    }

    createItemHTML(product) {
        const imagePath = product.image && product.image !== 'none' && product.image.trim() !== '' 
            ? (product.image.startsWith('/upload/images/') ? product.image : `/upload/images/${product.image}`)
            : null;

        return `
            <div class="item-row" data-product-id="${product._id}">
                <!-- Item Image -->
                <div class="item-image">
                    ${imagePath ? `
                        <img src="${imagePath}" alt="${product.name}" class="item-image-src" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                        <div class="no-image-placeholder" style="display: none;">
                            <ion-icon name="image-outline"></ion-icon>
                        </div>
                    ` : `
                        <div class="no-image-placeholder">
                            <ion-icon name="image-outline"></ion-icon>
                        </div>
                    `}
                </div>
                
                <!-- Item Details -->
                <div class="item-details">
                    <div class="item-name">${product.name}</div>
                    <div class="item-meta">
                        ${product.category ? `<span class="meta-item">${product.category}</span>` : ''}
                        ${product.brand ? `<span class="meta-item">${product.brand}</span>` : ''}
                        ${product.size ? `<span class="meta-item">Size: ${product.size}</span>` : ''}
                        ${(product.colorName || product.color) ? `<span class="meta-item">Color: ${product.colorName || product.color}</span>` : ''}
                    </div>
                </div>
                
                <!-- Item Pricing -->
                <div class="item-pricing">
                    <div class="price-selling">IQD ${(product.sell_price || 0).toLocaleString()}</div>
                    ${product.price ? `<div class="price-cost">Cost: IQD ${(product.price || 0).toLocaleString()}</div>` : ''}
                </div>
                
                <!-- Item Actions -->
                <div class="item-actions">
                    <button class="action-btn-icon" onclick="viewProduct('${product._id}')" title="View">
                        <ion-icon name="eye-outline"></ion-icon>
                    </button>
                    <button class="action-btn-icon analysis-btn" onclick="analyzeProduct('${product._id}')" title="Analysis">
                        <ion-icon name="analytics-outline"></ion-icon>
                    </button>
                    <button class="action-btn-icon" onclick="editProduct('${product._id}')" title="Edit">
                        <ion-icon name="create-outline"></ion-icon>
                    </button>
                    <button class="action-btn-icon" onclick="deleteProduct('${product._id}')" title="Delete">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;
    }

    // UI State Management
    showLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const itemsList = document.getElementById('itemsList');
        const emptyState = document.getElementById('emptyState');
        
        if (loadingState) loadingState.style.display = 'flex';
        if (itemsList) itemsList.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
    }

    hideLoadingState() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.style.display = 'none';
    }

    showLoadingMore() {
        const loadingMore = document.getElementById('loadingMore');
        if (loadingMore) loadingMore.style.display = 'flex';
    }

    hideLoadingMore() {
        const loadingMore = document.getElementById('loadingMore');
        if (loadingMore) loadingMore.style.display = 'none';
    }

    showEndOfResults() {
        const endOfResults = document.getElementById('endOfResults');
        if (endOfResults) endOfResults.style.display = 'flex';
    }

    showErrorState(message) {
        this.hideLoadingState();
        this.hideLoadingMore();
        
        const itemsList = document.getElementById('itemsList');
        const emptyState = document.getElementById('emptyState');
        
        if (itemsList) itemsList.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
            const emptyTitle = emptyState.querySelector('.empty-title');
            const emptyDescription = emptyState.querySelector('.empty-description');
            
            if (emptyTitle) emptyTitle.textContent = 'Error Loading Items';
            if (emptyDescription) emptyDescription.textContent = message;
        }
    }
}

// Global Functions (for backward compatibility)
function handleSearch(query) {
    if (window.itemsManager) {
        window.itemsManager.handleSearch(query);
    }
}

function clearSearch() {
    if (window.itemsManager) {
        window.itemsManager.clearSearch();
    }
}

function applyFilters() {
    if (window.itemsManager) {
        window.itemsManager.applyFilters();
    }
}

function viewProduct(id) {
    window.location.href = `/items/get/${id}`;
}

function editProduct(id) {
    window.location.href = `/items/edit/${id}`;
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            const response = await fetch(`/items/delete/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Refresh the current view
                if (window.itemsManager) {
                    await window.itemsManager.loadInitialData();
                }
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete item');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Items page loaded, initializing infinite scroll...');
    window.itemsManager = new ItemsManager();
});

// Fallback initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.itemsManager) {
            window.itemsManager = new ItemsManager();
        }
    });
} else {
    if (!window.itemsManager) {
        window.itemsManager = new ItemsManager();
    }
}// Analyze Product - Show transaction analysis
async function analyzeProduct(productId) {
    try {
        // Show loading state
        Swal.fire({
            title: 'Loading Analysis...',
            html: '<div class="loading-spinner"><div class="spinner"></div></div>',
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading()
            }
        });

        // Fetch analysis data
        const response = await fetch(`/items/analysis/${productId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load analysis');
        }

        // Close loading
        Swal.close();

        // Create and show modal with analysis
        showAnalysisModal(data);

    } catch (error) {
        console.error('Analysis error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to load analysis',
            confirmButtonColor: 'var(--primary-color)'
        });
    }
}

// Show Analysis Modal
function showAnalysisModal(data) {
    const { product, summary, trends, recentTransactions } = data;

    // Format numbers
    const formatNumber = (num) => num.toLocaleString();
    const formatCurrency = (num) => 'IQD ' + formatNumber(num);

    // Create modal HTML
    const modalHTML = `
        <div class="analysis-modal" id="analysisModal">
            <div class="analysis-modal-overlay" onclick="closeAnalysisModal()"></div>
            <div class="analysis-modal-content">
                <div class="analysis-modal-header">
                    <div class="analysis-header-info">
                        <h2 class="analysis-title">
                            <ion-icon name="analytics-outline"></ion-icon>
                            Item Analysis
                        </h2>
                        <p class="analysis-subtitle">${product.name} - ${product.size} ${product.colorName ? '(' + product.colorName + ')' : ''}</p>
                    </div>
                    <button class="analysis-close-btn" onclick="closeAnalysisModal()">
                        <ion-icon name="close-outline"></ion-icon>
                    </button>
                </div>

                <div class="analysis-modal-body">
                    <!-- Summary Cards -->
                    <div class="analysis-summary-grid">
                        <div class="summary-card">
                            <div class="summary-icon sales">
                                <ion-icon name="trending-up-outline"></ion-icon>
                            </div>
                            <div class="summary-content">
                                <div class="summary-label">Total Sold</div>
                                <div class="summary-value">${formatNumber(summary.totalSoldQty)} units</div>
                                <div class="summary-subtext">${formatCurrency(summary.totalSoldRevenue)} revenue</div>
                            </div>
                        </div>

                        <div class="summary-card">
                            <div class="summary-icon purchase">
                                <ion-icon name="bag-add-outline"></ion-icon>
                            </div>
                            <div class="summary-content">
                                <div class="summary-label">Total Purchased</div>
                                <div class="summary-value">${formatNumber(summary.totalPurchasedQty)} units</div>
                                <div class="summary-subtext">${formatCurrency(summary.totalPurchasedCost)} cost</div>
                            </div>
                        </div>

                        <div class="summary-card">
                            <div class="summary-icon stock">
                                <ion-icon name="cube-outline"></ion-icon>
                            </div>
                            <div class="summary-content">
                                <div class="summary-label">Current Stock</div>
                                <div class="summary-value">${formatNumber(product.qty || 0)} Main + ${formatNumber(product.stock || 0)} Store</div>
                                <div class="summary-subtext">${formatCurrency(summary.inventoryValue)} value</div>
                            </div>
                        </div>

                        <div class="summary-card">
                            <div class="summary-icon profit">
                                <ion-icon name="pricetags-outline"></ion-icon>
                            </div>
                            <div class="summary-content">
                                <div class="summary-label">Profit Margin</div>
                                <div class="summary-value">${summary.profitMargin}%</div>
                                <div class="summary-subtext">${formatCurrency(summary.avgSalePrice)} avg price</div>
                            </div>
                        </div>
                    </div>

                    <!-- Metrics Grid -->
                    <div class="analysis-metrics">
                        <div class="metric-item">
                            <div class="metric-label">Average Cost</div>
                            <div class="metric-value">${formatCurrency(summary.avgCost)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Average Sale Price</div>
                            <div class="metric-value">${formatCurrency(summary.avgSalePrice)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Inventory Value</div>
                            <div class="metric-value">${formatCurrency(summary.inventoryValue)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Potential Revenue</div>
                            <div class="metric-value">${formatCurrency(summary.potentialRevenue)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Total Transactions</div>
                            <div class="metric-value">${formatNumber(summary.totalSalesTransactions + summary.totalPurchaseTransactions)}</div>
                        </div>
                    </div>

                    <!-- Recent Transactions -->
                    <div class="analysis-transactions">
                        <div class="transactions-section">
                            <h3 class="section-title">
                                <ion-icon name="receipt-outline"></ion-icon>
                                Recent Sales (${recentTransactions.sales.length})
                            </h3>
                            <div class="transactions-list">
                                ${recentTransactions.sales.length > 0 ? recentTransactions.sales.map(sale => `
                                    <div class="transaction-item">
                                        <div class="transaction-info">
                                            <div class="transaction-date">${sale.date}</div>
                                            <div class="transaction-details">Order #${sale.bid} - ${sale.customer}</div>
                                        </div>
                                        <div class="transaction-qty">${formatNumber(sale.qty)} units</div>
                                        <div class="transaction-total">${formatCurrency(sale.total)}</div>
                                    </div>
                                `).join('') : '<div class="no-transactions">No sales transactions found</div>'}
                            </div>
                        </div>

                        <div class="transactions-section">
                            <h3 class="section-title">
                                <ion-icon name="bag-outline"></ion-icon>
                                Recent Purchases (${recentTransactions.purchases.length})
                            </h3>
                            <div class="transactions-list">
                                ${recentTransactions.purchases.length > 0 ? recentTransactions.purchases.map(purchase => `
                                    <div class="transaction-item">
                                        <div class="transaction-info">
                                            <div class="transaction-date">${purchase.date}</div>
                                            <div class="transaction-details">${purchase.trader}</div>
                                        </div>
                                        <div class="transaction-qty">${formatNumber(purchase.qty)} units</div>
                                        <div class="transaction-total">${formatCurrency(purchase.cost)}</div>
                                    </div>
                                `).join('') : '<div class="no-transactions">No purchase transactions found</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close Analysis Modal
function closeAnalysisModal() {
    const modal = document.getElementById('analysisModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAnalysisModal();
    }
});
