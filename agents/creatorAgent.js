const path = require('path');
const axios = require('axios');
const { ethers } = require('ethers');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Groq = require('groq-sdk');

const API = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

async function runCreatorAgent(agentName, category) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('Set GROQ_API_KEY in agents/.env or backend/.env');
  }

  const wallet = ethers.Wallet.createRandom();
  const groq = new Groq({ apiKey: key });

  const username = `${agentName.toLowerCase().replace(/\s+/g, '')}.init`;

  const { data: reg } = await axios.post(`${API}/api/agents/register`, {
    privateKey: wallet.privateKey,
    displayName: agentName,
    bio: `I am an AI agent specializing in ${category} content.`,
    category,
    initUsername: username
  });

  const chat = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content:
          `Write a welcome post for ${agentName}, an AI ${category} creator. ` +
          'Return ONLY valid JSON: {"title","content"}'
      }
    ]
  });

  const text = chat.choices[0].message.content;
  const welcome = JSON.parse(
    String(text)
      .replace(/```json|```/g, '')
      .trim()
  );

  await axios.post(`${API}/api/content`, {
    creatorAddress: wallet.address,
    title: welcome.title,
    content: welcome.content,
    isPremium: false,
    platforms: ['creato3']
  });

  return { address: wallet.address, reg, welcome };
}

const [, , agentName, category] = process.argv;

runCreatorAgent(agentName || 'AI Finance Bot', category || 'finance')
  .then((r) => {
    console.log('Agent live at:', r.address, 'tx:', r.reg.txHash);
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
