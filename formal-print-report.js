// Formal Print Report Function - Professional Business Template
function createPrintReportHTML(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Analysis Report - ${data.analysisType}</title>
    <style>
        /* Professional Print Styles */
        @page {
            size: A4;
            margin: 0.75in;
            @top-center {
                content: "Business Analysis Report";
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 10px;
                color: #8e8e93;
                border-bottom: 1px solid #e5e5e7;
                padding-bottom: 8px;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 10px;
                color: #8e8e93;
            }
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1d1d1f;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }
        
        /* Company Header */
        .company-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #007AFF;
        }
        
        .company-info {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .company-logo {
            width: 48px;
            height: 48px;
            background: #007AFF;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
        }
        
        .company-details {
            display: flex;
            flex-direction: column;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #1d1d1f;
            margin: 0;
            letter-spacing: -0.5px;
        }
        
        .company-tagline {
            font-size: 14px;
            color: #8e8e93;
            margin: 0;
        }
        
        .report-date {
            text-align: right;
            font-size: 14px;
            color: #8e8e93;
        }
        
        .report-date strong {
            color: #1d1d1f;
        }
        
        /* Report Title */
        .report-title-section {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .report-main-title {
            font-size: 32px;
            font-weight: 700;
            color: #1d1d1f;
            margin: 0 0 12px 0;
            letter-spacing: -0.5px;
        }
        
        .report-subtitle {
            font-size: 18px;
            color: #8e8e93;
            margin: 0 0 16px 0;
            font-weight: 400;
        }
        
        .report-period {
            font-size: 16px;
            color: #1d1d1f;
            font-weight: 500;
            background: #f8f9fa;
            padding: 8px 16px;
            border-radius: 6px;
            display: inline-block;
        }
        
        /* Executive Summary Cards */
        .executive-summary {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .summary-title {
            font-size: 24px;
            font-weight: 600;
            color: #1d1d1f;
            margin: 0 0 20px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e5e7;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .summary-card {
            border: 1px solid #e5e5e7;
            border-radius: 8px;
            padding: 24px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .summary-card.sales { border-left: 4px solid #34C759; }
        .summary-card.purchases { border-left: 4px solid #FF9500; }
        .summary-card.daily { border-left: 4px solid #007AFF; }
        .summary-card.profit { border-left: 4px solid #5856D6; }
        
        .summary-label {
            font-size: 14px;
            color: #8e8e93;
            margin-bottom: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary-value {
            font-size: 32px;
            font-weight: 700;
            color: #1d1d1f;
            margin-bottom: 8px;
            line-height: 1.2;
        }
        
        .summary-change {
            font-size: 13px;
            color: #8e8e93;
            font-style: italic;
        }
        
        /* Sections */
        .report-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #1d1d1f;
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e5e7;
        }
        
        /* Tables */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 13px;
            border: 1px solid #e5e5e7;
        }
        
        .data-table th {
            background: #f8f9fa;
            color: #1d1d1f;
            font-weight: 600;
            padding: 12px 8px;
            text-align: left;
            border-bottom: 1px solid #e5e5e7;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .data-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #f5f5f7;
            vertical-align: top;
        }
        
        .data-table tbody tr:nth-child(even) {
            background: #fafafa;
        }
        
        .data-table tbody tr:hover {
            background: #f0f9ff;
        }
        
        .amount {
            font-weight: 600;
            color: #007AFF;
        }
        
        .store-type {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            border: 1px solid;
        }
        
        .store-local {
            background: rgba(0, 122, 255, 0.1);
            color: #007AFF;
            border-color: #007AFF;
        }
        
        .store-main {
            background: rgba(52, 199, 89, 0.1);
            color: #34C759;
            border-color: #34C759;
        }
        
        /* Key Metrics */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 20px;
        }
        
        .metric-item {
            text-align: center;
            padding: 20px;
            background: #ffffff;
            border: 1px solid #e5e5e7;
            border-radius: 8px;
        }
        
        .metric-value {
            font-size: 28px;
            font-weight: 700;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        
        .metric-label {
            font-size: 13px;
            color: #8e8e93;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Footer */
        .report-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e5e7;
            text-align: center;
            color: #8e8e93;
            font-size: 12px;
        }
        
        .confidential-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 12px;
            margin-top: 16px;
            text-align: center;
            color: #856404;
            font-weight: 500;
        }
        
        /* Print Optimizations */
        @media print {
            .company-header {
                margin-bottom: 24px;
            }
            
            .summary-grid {
                gap: 16px;
            }
            
            .summary-card {
                padding: 20px;
            }
            
            .data-table {
                font-size: 12px;
            }
            
            .data-table th,
            .data-table td {
                padding: 8px 6px;
            }
        }
    </style>
</head>
<body>
    <!-- Company Header -->
    <div class="company-header">
        <div class="company-info">
            <div class="company-logo">BA</div>
            <div class="company-details">
                <h1 class="company-name">Business Analytics System</h1>
                <p class="company-tagline">Comprehensive Business Intelligence & Reporting</p>
            </div>
        </div>
        <div class="report-date">
            <div><strong>Report Generated:</strong></div>
            <div>${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
            })}</div>
            <div>${new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            })}</div>
        </div>
    </div>

    <!-- Report Title -->
    <div class="report-title-section">
        <h1 class="report-main-title">Business Analysis Report</h1>
        <p class="report-subtitle">${data.analysisType} Performance Analysis</p>
        <div class="report-period">Analysis Period: ${data.startDate} - ${data.endDate}</div>
    </div>

    <!-- Executive Summary -->
    <div class="executive-summary">
        <h2 class="summary-title">Executive Summary</h2>
        <div class="summary-grid">
            <div class="summary-card sales">
                <div class="summary-label">Total Sales Revenue</div>
                <div class="summary-value">${data.sellTotal.toLocaleString()} IQD</div>
                <div class="summary-change">Revenue generated from all sales transactions</div>
            </div>
            <div class="summary-card purchases">
                <div class="summary-label">Total Purchase Costs</div>
                <div class="summary-value">${data.purchaseTotal.toLocaleString()} IQD</div>
                <div class="summary-change">Inventory and operational procurement costs</div>
            </div>
            <div class="summary-card daily">
                <div class="summary-label">Daily Operating Expenses</div>
                <div class="summary-value">${data.dailyMoneyTotal.toLocaleString()} IQD</div>
                <div class="summary-change">Daily operational and administrative expenses</div>
            </div>
            <div class="summary-card profit">
                <div class="summary-label">Net Profit</div>
                <div class="summary-value">${data.netProfit.toLocaleString()} IQD</div>
                <div class="summary-change">Net profit calculation: Sales - Purchases - Daily Expenses</div>
            </div>
        </div>
    </div>

    <!-- Key Performance Indicators -->
    <div class="report-section">
        <h2 class="section-title">Key Performance Indicators</h2>
        <div class="metrics-grid">
            <div class="metric-item">
                <div class="metric-value">${data.totalTransactions}</div>
                <div class="metric-label">Total Transactions</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${data.metrics?.profitMargin?.toFixed(1) || 0}%</div>
                <div class="metric-label">Profit Margin</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${data.sellTotal > 0 ? Math.round(data.sellTotal / (data.salesData?.length || 1)).toLocaleString() : 0}</div>
                <div class="metric-label">Average Transaction Value</div>
            </div>
        </div>
    </div>

    <!-- Sales Analysis -->
    ${data.salesData && data.salesData.length > 0 ? `
    <div class="report-section">
        <h2 class="section-title">Sales Transactions Analysis (${data.salesData.length} records)</h2>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Transaction Date</th>
                    <th>Customer Name</th>
                    <th>Transaction Amount</th>
                    <th>Store Location</th>
                </tr>
            </thead>
            <tbody>
                ${data.salesData.slice(0, 20).map(sale => `
                    <tr>
                        <td>${sale.Date || 'N/A'}</td>
                        <td>${sale.name || 'Walk-in Customer'}</td>
                        <td class="amount">${(sale.total || 0).toLocaleString()} IQD</td>
                        <td><span class="store-type ${sale.isCashier ? 'store-local' : 'store-main'}">${sale.isCashier ? 'Local Store' : 'Main Storage'}</span></td>
                    </tr>
                `).join('')}
                ${data.salesData.length > 20 ? `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #8e8e93; font-style: italic; padding: 16px;">
                            Additional ${data.salesData.length - 20} sales transactions not displayed for brevity
                        </td>
                    </tr>
                ` : ''}
            </tbody>
        </table>
    </div>
    ` : ''}

    <!-- Purchase Analysis -->
    ${data.purchasesData && data.purchasesData.length > 0 ? `
    <div class="report-section">
        <h2 class="section-title">Purchase Transactions Analysis (${data.purchasesData.length} records)</h2>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Purchase Date</th>
                    <th>Supplier/Trader</th>
                    <th>Total Purchase Amount</th>
                    <th>Storage Location</th>
                    <th>Items Quantity</th>
                </tr>
            </thead>
            <tbody>
                ${data.purchasesData.slice(0, 20).map(purchase => {
                    const purchaseTotal = (purchase.purchase || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0) + (parseFloat(purchase.cost) || 0);
                    return `
                    <tr>
                        <td>${purchase.Date || 'N/A'}</td>
                        <td>${purchase.trader || 'Unknown Trader'}</td>
                        <td class="amount">${purchaseTotal.toLocaleString()} IQD</td>
                        <td><span class="store-type ${purchase.store ? 'store-main' : 'store-local'}">${purchase.store ? 'Main Storage' : 'Local Store'}</span></td>
                        <td>${(purchase.purchase || []).length} items</td>
                    </tr>
                    `;
                }).join('')}
                ${data.purchasesData.length > 20 ? `
                    <tr>
                        <td colspan="5" style="text-align: center; color: #8e8e93; font-style: italic; padding: 16px;">
                            Additional ${data.purchasesData.length - 20} purchase transactions not displayed for brevity
                        </td>
                    </tr>
                ` : ''}
            </tbody>
        </table>
    </div>
    ` : ''}

    <!-- Daily Money Analysis -->
    ${data.dailyMoneyData && data.dailyMoneyData.length > 0 ? `
    <div class="report-section">
        <h2 class="section-title">Daily Operating Expenses Analysis (${data.dailyMoneyData.length} entries)</h2>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Expense Date</th>
                    <th>Total Daily Amount</th>
                    <th>Number of Transactions</th>
                </tr>
            </thead>
            <tbody>
                ${(() => {
                    const grouped = data.dailyMoneyData.reduce((acc, day) => {
                        const date = day.Date;
                        if (!acc[date]) acc[date] = { date, total: 0, count: 0 };
                        acc[date].total += parseFloat(day.total) || 0;
                        acc[date].count += 1;
                        return acc;
                    }, {});
                    
                    return Object.entries(grouped).slice(0, 20).map(([date, info]) => `
                        <tr>
                            <td>${date}</td>
                            <td class="amount">${info.total.toLocaleString()} IQD</td>
                            <td>${info.count}</td>
                        </tr>
                    `).join('');
                })()}
                ${Object.keys(data.dailyMoneyData.reduce((acc, day) => {
                    const date = day.Date;
                    if (!acc[date]) acc[date] = true;
                    return acc;
                }, {})).length > 20 ? `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #8e8e93; font-style: italic; padding: 16px;">
                            Additional daily expense entries not displayed for brevity
                        </td>
                    </tr>
                ` : ''}
            </tbody>
        </table>
    </div>
    ` : ''}

    <!-- Report Footer -->
    <div class="report-footer">
        <p><strong>Business Analytics System</strong> • Professional Business Intelligence & Reporting Platform</p>
        <p>This report contains confidential business information and proprietary data.</p>
        <div class="confidential-notice">
            CONFIDENTIAL BUSINESS DOCUMENT - Handle according to company data protection policies
        </div>
    </div>
</body>
</html>
    `;
}