import express from 'express';
import { calculateTaxes } from '../controllers/taxController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/calculate').get(protect, calculateTaxes);

export default router;
