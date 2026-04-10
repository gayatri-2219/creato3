let TwitterApi = null;
try {
  // eslint-disable-next-line global-require
  TwitterApi = require('twitter-api-v2').TwitterApi;
} catch {
  TwitterApi = null;
}

const hasTwitterCreds = () =>
  Boolean(
    process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      process.env.TWITTER_ACCESS_SECRET
  );

const getTwitterClient = () => {
  if (!TwitterApi || !hasTwitterCreds()) {
    return null;
  }
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET
  });
};

async function postToTwitter(content) {
  const client = getTwitterClient();
  const tweet =
    content.length > 280 ? `${content.substring(0, 277)}...` : content;

  if (client) {
    try {
      const { data } = await client.v2.tweet(tweet);
      return {
        platform: 'twitter',
        tweetId: data.id,
        url: `https://twitter.com/i/web/status/${data.id}`
      };
    } catch (err) {
      const detail = err?.data?.detail || err?.data?.title;
      const errors = err?.data?.errors || err?.errors;
      const body =
        errors != null
          ? JSON.stringify(errors)
          : err?.data && typeof err.data === 'object'
            ? JSON.stringify(err.data)
            : '';
      const msg = [detail, body, err?.message].filter(Boolean).join(' — ');
      throw new Error(msg || 'Twitter post failed');
    }
  }

  const mockId = `mock_${Date.now()}`;
  return {
    platform: 'twitter',
    tweetId: mockId,
    url: `https://twitter.com/i/web/status/${mockId}`,
    mock: true
  };
}

async function postToAllPlatforms(content, platforms = ['twitter']) {
  const results = [];
  for (const platform of platforms) {
    if (platform === 'twitter') {
      // eslint-disable-next-line no-await-in-loop
      results.push(await postToTwitter(content));
    }
  }
  return results;
}

module.exports = { postToTwitter, postToAllPlatforms, hasTwitterCreds };
