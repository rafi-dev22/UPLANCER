require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');

const app = express();
app.use(cors());
app.use(express.json());

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureApiKey = process.env.AZURE_OPENAI_KEY;
const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;

if (!endpoint || !azureApiKey || !deploymentId) {
  console.warn('WARNING: Azure OpenAI credentials missing. Make sure to create a .env file with AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, and AZURE_OPENAI_DEPLOYMENT_ID.');
}

const client = (endpoint && azureApiKey) 
  ? new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey)) 
  : null;

// Helper to interact with AI
async function getAIResponse(prompt) {
  if (!client) throw new Error("Azure OpenAI client not configured.");
  const response = await client.getCompletions(deploymentId, [prompt], {
    maxTokens: 1000,
    temperature: 0.2
  });
  
  const rawText = response.choices[0].text.replace(/```json|```/g, '').trim();
  return JSON.parse(rawText);
}

// Secure API Endpoint for Freelancer Evaluation
app.post('/api/evaluate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    
    const resultJson = await getAIResponse(prompt);
    res.json(resultJson);
  } catch (error) {
    console.error('AI Error (/api/evaluate):', error.message);
    res.status(500).json({ error: 'Failed to process AI evaluation request' });
  }
});

// Secure API Endpoint for Job Matching
app.post('/api/match', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    
    const resultJson = await getAIResponse(prompt);
    res.json(resultJson);
  } catch (error) {
    console.error('AI Error (/api/match):', error.message);
    res.status(500).json({ error: 'Failed to process AI job match request' });
  }
});

// Secure API Endpoint for Pricing
app.post('/api/pricing', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    
    const resultJson = await getAIResponse(prompt);
    res.json(resultJson);
  } catch (error) {
    console.error('AI Error (/api/pricing):', error.message);
    res.status(500).json({ error: 'Failed to process AI pricing request' });
  }
});

// Secure Proxy Endpoint for GitHub API
app.get('/api/github/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const githubToken = process.env.GITHUB_TOKEN; // Optional: Add this to your .env
    
    const headers = { 'User-Agent': 'UPLANCER-AI' };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const [uRes, rRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=12&sort=updated`, { headers })
    ]);

    if (!uRes.ok) return res.status(uRes.status).json({ error: 'GitHub user not found or rate limited' });
    
    const user = await uRes.json();
    const repos = rRes.ok ? await rRes.json() : [];
    
    res.json({ user, repos });
  } catch (error) {
    console.error('GitHub Proxy Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch GitHub data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Secure backend proxy running on http://localhost:${PORT}`);
});
