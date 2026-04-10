const { ethers } = require('ethers');
const Post = require('../models/Post');

/**
 * On-chain Creato3 profiles do not expose getAllCreators in the shipped ABI.
 * We discover addresses from CREATOR_ADDRESSES (comma-separated) plus distinct
 * creatorAddress values stored in MongoDB posts.
 */
async function discoverCreatorAddresses() {
  const fromEnv = (process.env.CREATOR_ADDRESSES || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);

  let fromDb = [];
  try {
    fromDb = await Post.distinct('creatorAddress');
  } catch {
    fromDb = [];
  }

  const merged = [...fromEnv, ...fromDb];
  const set = new Set();
  for (const a of merged) {
    if (typeof a === 'string' && ethers.isAddress(a)) {
      set.add(ethers.getAddress(a));
    }
  }
  return [...set];
}

module.exports = { discoverCreatorAddresses };
