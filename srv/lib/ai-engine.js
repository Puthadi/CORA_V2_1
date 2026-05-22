'use strict';

const axios = require('axios');

// SAP AI Core integration — exposes Claude via the Anthropic Messages API format.
// Handles OAuth2 token lifecycle with automatic refresh.

class AIEngine {
  constructor() {
    this.tokenUrl       = process.env.AI_CORE_TOKEN_URL;
    this.clientId       = process.env.AI_CORE_CLIENT_ID;
    this.clientSecret   = process.env.AI_CORE_CLIENT_SECRET;
    this.baseUrl        = process.env.AI_CORE_BASE_URL;
    this.deploymentId   = process.env.AI_CORE_DEPLOYMENT_ID;
    this.resourceGroup  = process.env.AI_RESOURCE_GROUP || 'default';

    this._token       = null;
    this._tokenExpiry = 0;
  }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExpiry) return this._token;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const resp = await axios.post(this.tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: this.clientId, password: this.clientSecret },
    });

    this._token       = resp.data.access_token;
    this._tokenExpiry = Date.now() + (resp.data.expires_in - 60) * 1000;
    return this._token;
  }

  // Core method — wraps the Anthropic Messages API via SAP AI Core proxy.
  // Supports agentic tool_use loop: keeps calling until stop_reason is 'end_turn'.
  async chat({ systemPrompt, messages, tools = [], maxIterations = 10 }) {
    const token   = await this._getToken();
    const headers = {
      Authorization:       `Bearer ${token}`,
      'Content-Type':      'application/json',
      'AI-Resource-Group': this.resourceGroup,
    };
    const endpoint = `${this.baseUrl}/inference/deployments/${this.deploymentId}/messages`;

    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [...messages],
    };
    if (tools.length > 0) body.tools = tools;

    let iterations = 0;
    const toolResults = [];

    while (iterations < maxIterations) {
      if (toolResults.length > 0) {
        body.messages.push({ role: 'user', content: toolResults.splice(0) });
      }

      const resp = await axios.post(endpoint, body, { headers });
      const data = resp.data;

      if (data.stop_reason === 'end_turn') {
        const textBlock = data.content.find(c => c.type === 'text');
        return textBlock ? textBlock.text : '';
      }

      if (data.stop_reason === 'tool_use') {
        // Collect assistant turn with tool_use blocks
        body.messages.push({ role: 'assistant', content: data.content });

        // Execute each tool call and collect results
        const toolUseBlocks = data.content.filter(c => c.type === 'tool_use');
        for (const block of toolUseBlocks) {
          const result = await this._dispatchTool(block.name, block.input);
          toolResults.push({
            type:       'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify(result),
          });
        }
        iterations++;
        continue;
      }

      // Unexpected stop reason
      const textBlock = data.content.find(c => c.type === 'text');
      return textBlock ? textBlock.text : JSON.stringify(data.content);
    }

    throw new Error('AI tool loop exceeded maximum iterations');
  }

  // Simple single-shot call without tool loop (for quick classification/summarization)
  async complete({ systemPrompt, userMessage, maxTokens = 1024 }) {
    const token   = await this._getToken();
    const headers = {
      Authorization:       `Bearer ${token}`,
      'Content-Type':      'application/json',
      'AI-Resource-Group': this.resourceGroup,
    };
    const endpoint = `${this.baseUrl}/inference/deployments/${this.deploymentId}/messages`;

    const resp = await axios.post(endpoint, {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }, { headers });

    const textBlock = resp.data.content.find(c => c.type === 'text');
    return textBlock ? textBlock.text : '';
  }

  // Tool dispatch — resolved externally to avoid circular dependency.
  // Set via AIEngine.setToolHandler(name, fn) before calling chat().
  _toolHandlers = {};

  setToolHandler(name, fn) {
    this._toolHandlers[name] = fn;
  }

  async _dispatchTool(name, input) {
    const handler = this._toolHandlers[name];
    if (!handler) {
      return { error: `Tool '${name}' has no registered handler` };
    }
    try {
      return await handler(input);
    } catch (err) {
      return { error: err.message };
    }
  }
}

// Singleton — one engine instance per process
const instance = new AIEngine();
module.exports = instance;
