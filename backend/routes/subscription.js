const express = require('express');
const { ethers } = require('ethers');
const { getSubscriptionContract } = require('../services/contracts');

const router = express.Router();

router.get('/:fan/:creator', async (req, res) => {
  try {
    const fan = ethers.getAddress(req.params.fan);
    const creator = ethers.getAddress(req.params.creator);
    const sub = getSubscriptionContract();
    const record = await sub.getSubscription(fan, creator);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const active =
      Boolean(record.active) && record.expiry > now;
    res.json({
      active,
      tierId: Number(record.tierId),
      expiry: record.expiry.toString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
