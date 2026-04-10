const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

dotenv.config({ path: path.join(__dirname, '.env') });

const API = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const text = (data) => ({
  content: [
    {
      type: 'text',
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    }
  ]
});

const mcp = new McpServer({
  name: 'creato3-mcp',
  version: '1.0.0'
});

mcp.registerTool(
  'list_creators',
  {
    description: 'List creators on Creato3 (from chain + CREATOR_ADDRESSES / posts index)',
    inputSchema: {
      category: z.string().optional().describe('Filter by category (optional)')
    }
  },
  async (args) => {
    const { data } = await axios.get(`${API}/api/creators`, {
      params: { category: args?.category }
    });
    return text(data);
  }
);

mcp.registerTool(
  'get_creator_tiers',
  {
    description: 'Get subscription tiers for a creator address',
    inputSchema: {
      creatorAddress: z.string().describe('Creator 0x address')
    }
  },
  async (args) => {
    const { data } = await axios.get(
      `${API}/api/creators/${args.creatorAddress}/tiers`
    );
    return text(data);
  }
);

mcp.registerTool(
  'subscribe_to_creator',
  {
    description:
      'Subscribe a fan to a creator on-chain (requires fan wallet private key — demo only)',
    inputSchema: {
      creatorAddress: z.string(),
      tierIndex: z.number(),
      fanPrivateKey: z.string().describe('Fan EVM private key (hex)')
    }
  },
  async (args) => {
    const { data } = await axios.post(`${API}/api/subscribe`, {
      creatorAddress: args.creatorAddress,
      tierIndex: args.tierIndex,
      fanPrivateKey: args.fanPrivateKey
    });
    return text(`Subscribed!\nTx: ${data.txHash}`);
  }
);

mcp.registerTool(
  'check_subscription',
  {
    description: 'Check if a fan is subscribed to a creator',
    inputSchema: {
      fanAddress: z.string(),
      creatorAddress: z.string()
    }
  },
  async (args) => {
    const { data } = await axios.get(
      `${API}/api/subscription/${args.fanAddress}/${args.creatorAddress}`
    );
    return text(
      data.active ? 'Active subscriber' : 'Not subscribed'
    );
  }
);

mcp.registerTool(
  'get_creator_earnings',
  {
    description: 'Get creator balance / earnings from treasury',
    inputSchema: {
      creatorAddress: z.string()
    }
  },
  async (args) => {
    const { data } = await axios.get(
      `${API}/api/creators/${args.creatorAddress}/earnings`
    );
    return text(data);
  }
);

mcp.registerTool(
  'create_content_post',
  {
    description: 'Create a content post for a creator (MongoDB + optional Twitter)',
    inputSchema: {
      creatorAddress: z.string(),
      title: z.string(),
      content: z.string(),
      isPremium: z.boolean().optional(),
      platforms: z.array(z.string()).optional()
    }
  },
  async (args) => {
    const { data } = await axios.post(`${API}/api/content`, args);
    return text(`Post created! ID: ${data.postId}`);
  }
);

mcp.registerTool(
  'get_creator_posts',
  {
    description: 'List posts for a creator from the API',
    inputSchema: {
      creatorAddress: z.string()
    }
  },
  async (args) => {
    const { data } = await axios.get(
      `${API}/api/content/${args.creatorAddress}`
    );
    return text(data);
  }
);

mcp.registerTool(
  'get_ai_content_plan',
  {
    description: 'AI-generated 7-day content plan (Groq or mock)',
    inputSchema: {
      creatorName: z.string(),
      category: z.string(),
      platform: z.string().optional(),
      instructions: z.string().optional()
    }
  },
  async (args) => {
    const { data } = await axios.post(`${API}/api/ai/content-plan`, args);
    return text(data);
  }
);

mcp.registerTool(
  'draft_agent_creator',
  {
    description: 'Draft a launch-ready AI creator agent profile, welcome post, and suggested tier',
    inputSchema: {
      category: z.string(),
      goal: z.string().optional()
    }
  },
  async (args) => {
    const { data } = await axios.post(`${API}/api/agents/draft`, args);
    return text(data);
  }
);

mcp.registerTool(
  'register_agent_creator',
  {
    description: 'Register an AI agent wallet as a creator on-chain',
    inputSchema: {
      privateKey: z.string(),
      displayName: z.string(),
      bio: z.string(),
      category: z.string(),
      initUsername: z.string().optional()
    }
  },
  async (args) => {
    const { data } = await axios.post(`${API}/api/agents/register`, args);
    return text(`Agent registered!\nAddress: ${data.address}\nTx: ${data.txHash}`);
  }
);

mcp.registerTool(
  'post_to_social_media',
  {
    description: 'Post text to Twitter/X (or mock if keys unset)',
    inputSchema: {
      content: z.string(),
      platforms: z.array(z.string()).optional()
    }
  },
  async (args) => {
    const { data } = await axios.post(`${API}/api/content/social-post`, args);
    return text(data);
  }
);

mcp.registerTool(
  'get_platform_analytics',
  {
    description: 'Demo analytics: posts + on-chain total earned',
    inputSchema: {
      creatorAddress: z.string()
    }
  },
  async (args) => {
    const { data } = await axios.get(
      `${API}/api/creators/${args.creatorAddress}/analytics`
    );
    return text(data);
  }
);

mcp.registerTool(
  'get_pricing_advice',
  {
    description: 'AI pricing vs Patreon comparison (Groq or mock)',
    inputSchema: {
      category: z.string(),
      followers: z.number(),
      currentPlatform: z.string().optional()
    }
  },
  async (args) => {
    const { data } = await axios.post(`${API}/api/ai/pricing-advice`, args);
    return text(data);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  console.error('Creato3 MCP server running (stdio)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
