import Wallet from '../models/Wallet.js';

export const getWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find({ userId: req.user._id });
    res.json(wallets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addWallet = async (req, res) => {
  const { address, label, blockchain } = req.body;

  try {
    const existingWallet = await Wallet.findOne({ address, userId: req.user._id });
    if (existingWallet) {
      return res.status(400).json({ message: 'Wallet already added' });
    }

    // Basic Ethereum address validation
    if (blockchain === 'Ethereum' && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ message: 'Invalid Ethereum address' });
    }

    const wallet = new Wallet({
      userId: req.user._id,
      address,
      label,
      blockchain
    });

    const createdWallet = await wallet.save();
    res.status(201).json(createdWallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.id);

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    if (wallet.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await wallet.deleteOne();
    res.json({ message: 'Wallet removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
