import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  txHash: { type: String, required: true },
  timestamp: { type: Date, required: true },
  type: { type: String, enum: ['buy', 'sell', 'transfer_in', 'transfer_out', 'fee', 'reward'], required: true },
  asset: { type: String, required: true },
  amount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  feeAsset: { type: String, default: 'ETH' },
  historicalPriceUsd: { type: Number, default: 0 },
  costBasisUsd: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
