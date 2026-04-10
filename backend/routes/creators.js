const express = require('express');
const { ethers } = require('ethers');
const { getProfileContract, getTreasuryContract } = require('../services/contracts');
const { discoverCreatorAddresses } = require('../services/creatorIndex');
const Post = require('../models/Post');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const profile = getProfileContract();
    const addresses = await discoverCreatorAddresses();
    const category = (req.query.category || '').toLowerCase();

    const creators = [];
    for (const addr of addresses) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const c = await profile.getCreator(addr);
        if (!c.active) {
          continue;
        }
        if (category && String(c.category || '').toLowerCase() !== category) {
          continue;
        }
        creators.push({
          wallet: addr,
          displayName: c.displayName,
          bio: c.bio,
          category: c.category,
          initUsername: c.initUsername
        });
      } catch {
        // skip invalid / stale addresses
      }
    }

    res.json(creators);
  } catch (err) {
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/:address/tiers', async (req, res) => {
  try {
    const profile = getProfileContract();
    const address = ethers.getAddress(req.params.address);
    const [tiers, ids] = await profile.getActiveTiers(address);
    const out = tiers.map((t, i) => ({
      index: Number(ids[i]),
      tierId: Number(ids[i]),
      name: t.name,
      description: t.description,
      price: t.price.toString(),
      active: t.active
    }));
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:address/earnings', async (req, res) => {
  try {
    const treasury = getTreasuryContract();
    const address = ethers.getAddress(req.params.address);
    const [balance, totalEarned] = await Promise.all([
      treasury.getBalance(address),
      treasury.getTotalEarned(address)
    ]);
    res.json({
      earnings: balance.toString(),
      totalEarned: totalEarned.toString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:address/analytics', async (req, res) => {
  try {
    const treasury = getTreasuryContract();
    const resolved = ethers.getAddress(req.params.address);
    const address = resolved.toLowerCase();
    const [totalEarned, postCount] = await Promise.all([
      treasury.getTotalEarned(resolved),
      Post.countDocuments({ creatorAddress: address })
    ]);
    res.json({
      creatorAddress: address,
      totalEarned: totalEarned.toString(),
      postCount,
      note: 'Demo analytics: on-chain total earned + MongoDB post count.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
