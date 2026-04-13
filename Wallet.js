import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: { type: String, required: true },
  label: { type: String, default: 'My Wallet' },
  blockchain: { type: String, default: 'Ethereum' }
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);
