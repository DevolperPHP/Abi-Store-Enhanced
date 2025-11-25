// Modern Apple-style Active Navigation Handler
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    
    // Get all navigation items
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    
    // Remove active class from all items
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current page
    if (currentPath === '/') {
        const dashboardItem = document.querySelector('.nav-item[data-page="dashboard"]');
        if (dashboardItem) dashboardItem.classList.add('active');
    }
    
    if (currentPath.includes('/permissions')) {
        const permissionsItem = document.querySelector('.nav-item[data-page="permissions"]');
        if (permissionsItem) permissionsItem.classList.add('active');
    }
    
    if (currentPath.includes('/items')) {
        const itemsItem = document.querySelector('.nav-item[data-page="items"]');
        if (itemsItem) itemsItem.classList.add('active');
    }
    
    if (currentPath.includes('/purchase')) {
        const purchaseItem = document.querySelector('.nav-item[data-page="purchase"]');
        if (purchaseItem) purchaseItem.classList.add('active');
    }
    
    if (currentPath.includes('/size')) {
        const sizeItem = document.querySelector('.nav-item[data-page="size"]');
        if (sizeItem) sizeItem.classList.add('active');
    }
    
    if (currentPath.includes('/sell')) {
        const sellItem = document.querySelector('.nav-item[data-page="sell"]');
        if (sellItem) sellItem.classList.add('active');
    }
    
    if (currentPath.includes('/storage')) {
        const storageItem = document.querySelector('.nav-item[data-page="storage"]');
        if (storageItem) storageItem.classList.add('active');
    }
    
    if (currentPath.includes('/analysis')) {
        const analysisItem = document.querySelector('.nav-item[data-page="analysis"]');
        if (analysisItem) analysisItem.classList.add('active');
    }
    
    if (currentPath.includes('/dailymoney')) {
        const dailyMoneyItem = document.querySelector('.nav-item[data-page="dailyMoney"]');
        if (dailyMoneyItem) dailyMoneyItem.classList.add('active');
    }
    
    if (currentPath.includes('/category')) {
        const categoryItem = document.querySelector('.nav-item[data-page="category"]');
        if (categoryItem) categoryItem.classList.add('active');
    }
    
    if (currentPath.includes('/brand')) {
        const brandItem = document.querySelector('.nav-item[data-page="brand"]');
        if (brandItem) brandItem.classList.add('active');
    }
    
    if (currentPath.includes('/transfer')) {
        const transferItem = document.querySelector('.nav-item[data-page="transfer"]');
        if (transferItem) transferItem.classList.add('active');
    }
    
    if (currentPath.includes('/colors')) {
        const colorsItem = document.querySelector('.nav-item[data-page="colors"]');
        if (colorsItem) colorsItem.classList.add('active');
    }
    
    // Add hover effects for better UX
    navItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.backgroundColor = 'transparent';
            }
        });
    });
});

