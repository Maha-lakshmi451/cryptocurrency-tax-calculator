import Transaction from '../models/Transaction.js';

export const calculateTaxes = async (req, res) => {
    const { method = 'FIFO', year } = req.query;

    try {
        const query = { userId: req.user._id };
        const allTransactions = await Transaction.find(query).sort({ timestamp: 1 });

        const taxReport = {
            totalGains: 0,
            totalLosses: 0,
            net: 0,
            disposals: []
        };

        const assets = [...new Set(allTransactions.map(tx => tx.asset))];

        for (let asset of assets) {
            let buyPool = [];
            let totalAmountAvg = 0;
            let totalBasisAvg = 0;

            const txs = allTransactions.filter(tx => tx.asset === asset);

            for (let tx of txs) {
                if (tx.type === 'buy' || tx.type === 'transfer_in') {
                    // Treating transfer_in as a buy for simple demo. 
                    // In reality, this requires mapping across wallets or setting cost basis manually
                    buyPool.push({ amount: tx.amount, price: tx.historicalPriceUsd, date: tx.timestamp });
                    totalAmountAvg += tx.amount;
                    totalBasisAvg += (tx.amount * tx.historicalPriceUsd);
                } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
                    // Treating transfer_out as a sell for demo (since it's leaving user's known tracked portfolio possibly)
                    let amountToSell = tx.amount;
                    let sellPrice = tx.historicalPriceUsd;
                    let costBasis = 0;
                    let proceeds = amountToSell * sellPrice;

                    if (method === 'AVG') {
                        const avgCostPrice = totalAmountAvg > 0 ? (totalBasisAvg / totalAmountAvg) : 0;
                        costBasis = avgCostPrice * amountToSell;
                        
                        totalAmountAvg = Math.max(0, totalAmountAvg - amountToSell);
                        totalBasisAvg = Math.max(0, totalBasisAvg - costBasis);

                    } else { // FIFO or LIFO
                        while (amountToSell > 0 && buyPool.length > 0) {
                            let poolIndex = method === 'FIFO' ? 0 : buyPool.length - 1;
                            let lot = buyPool[poolIndex];

                            if (lot.amount <= amountToSell) {
                                costBasis += (lot.amount * lot.price);
                                amountToSell -= lot.amount;
                                buyPool.splice(poolIndex, 1);
                            } else {
                                costBasis += (amountToSell * lot.price);
                                lot.amount -= amountToSell;
                                amountToSell = 0;
                            }
                        }
                    }

                    const gainLoss = proceeds - costBasis;
                    
                    const isRelevantYear = !year || new Date(tx.timestamp).getFullYear().toString() === year;

                    if(isRelevantYear) {
                        if (gainLoss > 0) taxReport.totalGains += gainLoss;
                        else taxReport.totalLosses += Math.abs(gainLoss);
                        
                        taxReport.net += gainLoss;

                        taxReport.disposals.push({
                            asset,
                            txHash: tx.txHash,
                            dateSold: tx.timestamp,
                            amount: tx.amount,
                            proceeds,
                            costBasis,
                            gainLoss,
                            method
                        });
                    }
                }
            }
        }

        res.json(taxReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
