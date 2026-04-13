import express from 'express';
import { getWallets, addWallet, deleteWallet } from '../controllers/walletController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, getWallets).post(protect, addWallet);
router.route('/:id').delete(protect, deleteWallet);

export default router;
