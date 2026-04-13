import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import axios from 'axios';

const fetchHistoricalPrice = async (dateStr, asset) => {
    // Basic Coingecko fetch. Rate limits apply. 
    // asset here is likely just 'ethereum' ideally, mapping 'ETH' -> 'ethereum'
    if(asset !== 'ETH') return 0;
    try {
        const dateParts = dateStr.split('T')[0].split('-');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD-MM-YYYY
        const url = `${process.env.COINGECKO_API_URL}/coins/ethereum/history?date=${formattedDate}`;
        const { data } = await axios.get(url);
        return data.market_data ? data.market_data.current_price.usd : 0;
    } catch(err) {
        console.error("Coingecko rate limit or error", err.message);
        return 0; // fallback to 0 or 2000...
    }
}

export const syncTransactions = async (req, res) => {
  const { walletId } = req.params;

  try {
    const wallet = await Wallet.findOne({ _id: walletId, userId: req.user._id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    if (wallet.blockchain !== 'Ethereum') {
        return res.status(400).json({ message: 'Only Ethereum supported for auto-sync.' });
    }

    const etherscanUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${wallet.address}&startblock=0&endblock=99999999&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY || ''}`;
    
    const response = await axios.get(etherscanUrl);
    if (!response.data.result || !Array.isArray(response.data.result)) {
        return res.status(400).json({ message: 'Failed to fetch transactions or no transactions found. Check API key.' });
    }

    const txs = response.data.result;
    const savedTxs = [];
    
    for (let tx of txs) {
      if(tx.isError !== '0') continue;
        
      const existing = await Transaction.findOne({ txHash: tx.hash, walletId });
      if (!existing) {
         const amountEther = parseFloat(tx.value) / 1e18;
         if (amountEther === 0) continue; // Skip zero-value txs for simplicity
         
         let type = 'sell'; // defaults out
         if (tx.to.toLowerCase() === wallet.address.toLowerCase()) {
            type = 'buy'; // simple logic: receive = buy, send = sell
         }
         
         const timestamp = new Date(parseInt(tx.timeStamp) * 1000);
         // Uncomment below if you have a pro API key, otherwise it delays the loop and causes 429 errors easily.
         // const price = await fetchHistoricalPrice(timestamp.toISOString(), 'ETH');
         const price = type === 'buy' ? 2000 : 2500; // Mocked historical price due to public API limits
         
         const newTx = new Transaction({
            userId: req.user._id,
            walletId,
            txHash: tx.hash,
            timestamp,
            type,
            asset: 'ETH',
            amount: amountEther,
            fee: (parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)) / 1e18,
            historicalPriceUsd: price,
            costBasisUsd: price * amountEther
         });
         await newTx.save();
         savedTxs.push(newTx);
      }
    }

    res.json({ message: `Synced ${savedTxs.length} new transactions`, count: savedTxs.length });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransactions = async (req, res) => {
    try {
        const query = { userId: req.user._id };
        if (req.query.walletId) query.walletId = req.query.walletId;
        const transactions = await Transaction.find(query).sort({ timestamp: -1 });
        res.json(transactions);
    } catch(error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateTransaction = async (req, res) => {
    try {
        const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
        if(!tx) return res.status(404).json({ message: 'Transaction not found' });
        
        tx.type = req.body.type || tx.type;
        tx.historicalPriceUsd = req.body.historicalPriceUsd || tx.historicalPriceUsd;
        tx.costBasisUsd = tx.historicalPriceUsd * tx.amount;
        
        await tx.save();
        res.json(tx);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
}
