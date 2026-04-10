const express = require('express');
const { ethers } = require('ethers');
const SubscriptionManagerABI = require('../abis/SubscriptionManager.json');
const CreatorProfileABI = require('../abis/CreatorProfile.json');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { creatorAddress, tierIndex, fanPrivateKey } = req.body;
    if (!creatorAddress || fanPrivateKey == null || tierIndex == null) {
      return res
        .status(400)
        .json({ error: 'creatorAddress, tierIndex, and fanPrivateKey are required' });
    }

    const rpc = process.env.EVM_RPC;
    const subAddr = process.env.SUBSCRIPTION_ADDRESS;
    const profileAddr = process.env.PROFILE_ADDRESS;
    if (!rpc || !subAddr || !profileAddr) {
      return res.status(503).json({ error: 'EVM_RPC, SUBSCRIPTION_ADDRESS, PROFILE_ADDRESS required' });
    }

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(fanPrivateKey, provider);
    const profile = new ethers.Contract(profileAddr, CreatorProfileABI, provider);
    const sub = new ethers.Contract(subAddr, SubscriptionManagerABI, wallet);

    const creator = ethers.getAddress(creatorAddress);
    const tierId = Number(tierIndex);
    const tier = await profile.getTier(creator, tierId);
    if (!tier.active) {
      return res.status(400).json({ error: 'Tier is not active' });
    }

    const tx = await sub.subscribe(creator, tierId, { value: tier.price });
    const receipt = await tx.wait();

    res.json({ txHash: receipt.hash, tierId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
