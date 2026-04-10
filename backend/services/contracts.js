const { ethers } = require('ethers');
const CreatorProfileABI = require('../abis/CreatorProfile.json');
const SubscriptionManagerABI = require('../abis/SubscriptionManager.json');
const CreatorTreasuryABI = require('../abis/CreatorTreasury.json');

const getProvider = () => {
  const rpc = process.env.EVM_RPC;
  if (!rpc) {
    throw new Error('EVM_RPC is not set');
  }
  return new ethers.JsonRpcProvider(rpc);
};

const requireAddress = (name) => {
  const v = process.env[name];
  if (!v || !ethers.isAddress(v)) {
    throw new Error(`${name} is missing or not a valid address`);
  }
  return v;
};

const getProfileContract = () => {
  const provider = getProvider();
  const address = requireAddress('PROFILE_ADDRESS');
  return new ethers.Contract(address, CreatorProfileABI, provider);
};

const getSubscriptionContract = () => {
  const provider = getProvider();
  const address = requireAddress('SUBSCRIPTION_ADDRESS');
  return new ethers.Contract(address, SubscriptionManagerABI, provider);
};

const getTreasuryContract = () => {
  const provider = getProvider();
  const address = requireAddress('TREASURY_ADDRESS');
  return new ethers.Contract(address, CreatorTreasuryABI, provider);
};

module.exports = {
  getProvider,
  getProfileContract,
  getSubscriptionContract,
  getTreasuryContract,
  requireAddress
};
