#!/usr/bin/env node

import 'dotenv/config';

const serverUrl = 'http://localhost:4000';

async function testCopilotModel() {
  console.log('🧪 Тест GitHub Copilot провайдера\n');
  
  try {
    const response = await fetch(`${serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'copilot-gpt-4o',
        messages: [{ role: 'user', content: 'Say hi' }],
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
    console.log(`✅ GitHub Copilot працює!`);
    console.log(`Відповідь: ${data.choices[0].message.content}`);
    return true;
    
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}`);
    return false;
  }
}

testCopilotModel();
