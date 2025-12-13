const express = require('express');
const User = require('../../models/User');
const DailyMoney = require('../../models/DailyMoney');
const router = express.Router();
const moment = require('moment');
const ExcelJS = require('exceljs');

router.get('/', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const dailyMoney = await DailyMoney.find({}).sort({ sortDate: -1 })

        if (user) {
            if (user.isAdmin == true) {
                res.render('dailyMoney/dashboard', {
                    user: user,
                    dailyMoney: dailyMoney,
                    err: req.flash('daily-error'),
                })
            } else {
                req.flash('permission-error', 'error')
                res.redirect('/')
            }
        } else {
            res.redirect('/passport/sign-up')
        }
    } catch (err) {
        console.log(err);
    }
})

router.post('/new', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const currentDate = moment().locale("ar-kw").format("l")
            const filter = await DailyMoney.findOne({ Date: currentDate })
            if (filter) {
                req.flash('daily-error', 'error')
                res.redirect("back")
            } else {
                const newDailyMoney = new DailyMoney({
                    Date: currentDate,
                })

                await newDailyMoney.save()

                // Redirect to the new transaction's detail page
                res.redirect(`/dailymoney/get/${newDailyMoney._id}`)
            }
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/get/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await DailyMoney.findOne({ _id: req.params.id })
        const totalArray = data.purchase.map(x => Number(x.cost))
        if (totalArray.length > 0) {
            const total = totalArray.reduce((a, b) => a + b)
            if (user.isAdmin == true) {
                res.render("dailyMoney/get-data", {
                    user: user,
                    data: data,
                    total: total
                })
            } else {
                res.redirect("/")
            }
        } else {
            if (user.isAdmin == true) {
                res.render("dailyMoney/get-data", {
                    user: user,
                    data: data,
                    total: 0
                })
            } else {
                res.redirect("/")
            }
        }
    } catch (err) {
        console.log(err);
    }
})

// Export single transaction to Excel
router.get('/export/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const data = await DailyMoney.findOne({ _id: req.params.id })
            
            if (!data) {
                return res.status(404).send('Transaction not found')
            }

            // Create workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Daily Transaction');

            // Set worksheet properties
            worksheet.properties.defaultRowHeight = 20;
            worksheet.views = [{ showGridLines: true }];

            // Define columns
            worksheet.columns = [
                { header: '#', key: 'number', width: 5 },
                { header: 'Transaction Title', key: 'title', width: 30 },
                { header: 'Amount (IQD)', key: 'amount', width: 15 },
                { header: 'Percentage (%)', key: 'percentage', width: 15 }
            ];

            // Style the header row
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '007AFF' }
            };
            worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

            // Calculate total for percentage calculation
            const total = data.purchase.reduce((sum, item) => sum + Number(item.cost), 0);

            // Add data rows
            data.purchase.forEach((item, index) => {
                const percentage = total > 0 ? ((Number(item.cost) / total) * 100).toFixed(1) : 0;
                
                worksheet.addRow({
                    number: index + 1,
                    title: item.title,
                    amount: Number(item.cost).toLocaleString(),
                    percentage: percentage + '%'
                });
            });

            // Add empty row and summary
            worksheet.addRow({});
            
            // Summary row
            const summaryRow = worksheet.addRow({
                number: '',
                title: 'TOTAL',
                amount: total.toLocaleString(),
                percentage: '100%'
            });
            
            // Style summary row
            summaryRow.font = { bold: true };
            summaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'F0F0F0' }
            };

            // Add transaction info at the top
            worksheet.insertRow(1, []);
            worksheet.insertRow(1, []);
            worksheet.insertRow(1, ['Daily Transaction Report']);
            worksheet.insertRow(1, [`Date: ${data.Date}`]);
            worksheet.insertRow(1, [`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`]);
            worksheet.insertRow(1, [`Total Transactions: ${data.purchase.length}`]);
            worksheet.insertRow(1, []);

            // Style the title
            worksheet.getRow(2).font = { bold: true, size: 16, color: { argb: '1D1D1F' } };
            worksheet.mergeCells('A2:D2');

            // Style the info rows
            for (let i = 3; i <= 6; i++) {
                worksheet.getRow(i).font = { size: 12, color: { argb: '8E8E93' } };
                worksheet.mergeCells(`A${i}:D${i}`);
            }

            // Set filename
            const fileName = `Daily_Transaction_${data.Date.replace(/\//g, '-')}_${moment().format('YYYY-MM-DD')}.xlsx`;

            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Write to response
            await workbook.xlsx.write(res);
            res.end();

        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('Error generating Excel file');
    }
})

// Export all transactions to Excel (Dashboard)
router.get('/export-all', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const allTransactions = await DailyMoney.find({}).sort({ sortDate: -1 })
            
            // Create workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('All Daily Transactions');

            // Set worksheet properties
            worksheet.properties.defaultRowHeight = 20;
            worksheet.views = [{ showGridLines: true }];

            // Define columns
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 12 },
                { header: 'Transaction #', key: 'transactionNum', width: 12 },
                { header: 'Item Title', key: 'title', width: 30 },
                { header: 'Amount (IQD)', key: 'amount', width: 15 },
                { header: 'Transaction Total (IQD)', key: 'total', width: 18 }
            ];

            // Style the header row
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '007AFF' }
            };
            worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

            // Add data rows for each transaction
            allTransactions.forEach((transaction, transactionIndex) => {
                const transactionTotal = transaction.purchase.reduce((sum, item) => sum + Number(item.cost), 0);
                
                transaction.purchase.forEach((item, itemIndex) => {
                    worksheet.addRow({
                        date: transaction.Date,
                        transactionNum: transactionIndex + 1,
                        title: item.title,
                        amount: Number(item.cost).toLocaleString(),
                        total: transactionTotal.toLocaleString()
                    });
                });

                // Add a summary row for each transaction
                if (transaction.purchase.length > 0) {
                    worksheet.addRow({
                        date: '',
                        transactionNum: '',
                        title: `Subtotal for ${transaction.Date}`,
                        amount: transactionTotal.toLocaleString(),
                        total: ''
                    });
                    
                    // Style the subtotal row
                    const subtotalRow = worksheet.lastRow;
                    subtotalRow.font = { bold: true };
                    subtotalRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F0F0F0' }
                    };
                    
                    // Add empty row after each transaction
                    worksheet.addRow({});
                }
            });

            // Add grand total
            const grandTotal = allTransactions.reduce((sum, transaction) => {
                return sum + transaction.purchase.reduce((itemSum, item) => itemSum + Number(item.cost), 0);
            }, 0);

            worksheet.addRow({});
            const grandTotalRow = worksheet.addRow({
                date: '',
                transactionNum: '',
                title: 'GRAND TOTAL',
                amount: grandTotal.toLocaleString(),
                total: ''
            });
            
            // Style grand total row
            grandTotalRow.font = { bold: true, size: 14 };
            grandTotalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '007AFF' }
            };
            grandTotalRow.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

            // Add report info at the top
            worksheet.insertRow(1, []);
            worksheet.insertRow(1, []);
            worksheet.insertRow(1, ['All Daily Transactions Report']);
            worksheet.insertRow(1, [`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`]);
            worksheet.insertRow(1, [`Total Records: ${allTransactions.length}`]);
            worksheet.insertRow(1, [`Grand Total: ${grandTotal.toLocaleString()} IQD`]);
            worksheet.insertRow(1, []);

            // Style the title
            worksheet.getRow(2).font = { bold: true, size: 16, color: { argb: '1D1D1F' } };
            worksheet.mergeCells('A2:E2');

            // Style the info rows
            for (let i = 3; i <= 6; i++) {
                worksheet.getRow(i).font = { size: 12, color: { argb: '8E8E93' } };
                worksheet.mergeCells(`A${i}:E${i}`);
            }

            // Set filename
            const fileName = `All_Daily_Transactions_${moment().format('YYYY-MM-DD')}.xlsx`;

            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Write to response
            await workbook.xlsx.write(res);
            res.end();

        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('Error generating Excel file');
    }
})

router.put('/add/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const { title, cost } = req.body
            const data = await DailyMoney.findOne({ _id: req.params.id })
            await DailyMoney.updateOne({ _id: req.params.id }, {
                $push: {
                    purchase: {
                        title: title,
                        cost: cost,
                    }
                },

                $set: {
                    total: Number(data.total) + Number(cost)
                }
            })

            res.redirect("back")
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

// Edit transaction item
router.put('/edit/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const { oldTitle, oldCost, newTitle, newCost } = req.body
            const data = await DailyMoney.findOne({ _id: req.params.id })
            
            // Calculate the difference
            const oldCostNum = Number(oldCost)
            const newCostNum = Number(newCost)
            const costDifference = newCostNum - oldCostNum
            
            // Update the specific item
            await DailyMoney.updateOne(
                { 
                    _id: req.params.id,
                    'purchase.title': oldTitle,
                    'purchase.cost': oldCost
                },
                {
                    $set: {
                        'purchase.$.title': newTitle,
                        'purchase.$.cost': newCost,
                        'total': Number(data.total) + costDifference
                    }
                }
            )

            res.redirect("back")
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('Error updating transaction');
    }
})

router.put('/remove/:Eid/:title/:cost', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const { Eid, title, cost } = req.params
            const data = await DailyMoney.findOne({ _id: Eid })

            await DailyMoney.updateOne({ _id: Eid }, {
                $pull: {
                    purchase: {
                        title: title,
                        cost: cost,
                    }
                },

                $set: {
                    total: Number(data.total) - Number(cost)
                }
            })

            res.redirect("back")
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

module.exports = router