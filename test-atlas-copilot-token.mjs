#!/usr/bin/env node

import 'dotenv/config';

const serverUrl = 'http://localhost:4000';
const copilotToken = process.env.GITHUB_COPILOT_TOKEN;

async function testAtlasWithCopilotToken() {
  console.log('🧪 Тест ATLAS з токеном Copilot\n');
  
  try {
    const response = await fetch(`${serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${copilotToken}`
      },
      body: JSON.stringify({
        model: 'atlas-openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say hi from ATLAS' }],
        max_tokens: 10
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Помилка ${response.status}:`);
      console.log(error.substring(0, 300));
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ ATLAS працює!`);
    console.log(`Відповідь: ${data.choices[0].message.content}`);
    return true;
    
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}`);
    return false;
  }
}

testAtlasWithCopilotToken();
