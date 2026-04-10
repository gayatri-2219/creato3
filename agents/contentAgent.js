const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Groq = require('groq-sdk');

const API = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

async function runContentAgent(creatorAddress, creatorName, category) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('Set GROQ_API_KEY in agents/.env or backend/.env');
  }

  const groq = new Groq({ apiKey: key });

  const chat = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content:
          `You are a content agent for ${creatorName}, a ${category} creator. ` +
          'Generate ONE short article (about 200 words). ' +
          'Return ONLY valid JSON: {"title","content","summary","hashtags":[]}'
      }
    ]
  });

  const text = chat.choices[0].message.content;
  const post = JSON.parse(
    String(text)
      .replace(/```json|```/g, '')
      .trim()
  );

  const { data } = await axios.post(`${API}/api/content`, {
    creatorAddress,
    title: post.title,
    content: post.content,
    isPremium: true,
    platforms: ['creato3', 'twitter']
  });

  const socialText = `${post.summary}\n\n${(post.hashtags || []).join(' ')}`;
  await axios.post(`${API}/api/content/social-post`, {
    content: socialText,
    platforms: ['twitter']
  });

  return { post, api: data };
}

const [, , creatorAddress, creatorName, category] = process.argv;

if (!creatorAddress || !creatorName || !category) {
  console.error(
    'Usage: node contentAgent.js <creatorAddress> "<creatorName>" <category>'
  );
  process.exit(1);
}

runContentAgent(creatorAddress, creatorName, category)
  .then((r) => {
    console.log('Done:', r.post.title);
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
