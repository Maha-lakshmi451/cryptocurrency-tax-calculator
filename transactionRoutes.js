import express from 'express';
import { syncTransactions, getTransactions, updateTransaction } from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, getTransactions);
router.route('/:id').put(protect, updateTransaction);
router.route('/sync/:walletId').post(protect, syncTransactions);

export default router;
