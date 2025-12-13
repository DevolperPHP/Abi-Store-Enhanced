// Additional route for deleting pending orders
// Add this to routes/localstore/sell.js before module.exports

// Delete pending order
router.delete('/delete-pending/:orderId', async (req, res) => {
    try {
        const order = await Sell.findOne({ 
            _id: req.params.orderId,
            status: 'pending',
            userId: req.user.id 
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        await Sell.deleteOne({ _id: req.params.orderId });
        
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err) {
        console.error('Error deleting order:', err);
        res.status(500).json({ success: false, error: 'Failed to delete order' });
    }
});