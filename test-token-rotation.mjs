#!/usr/bin/env node

/**
 * Тестовий скрипт для перевірки системи автоматичної ротації токенів
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:4000';

async function testTokenRotation() {
  console.log('🔄 Тестування системи ротації токенів\n');
  
  try {
    // 1. Перевірка статистики токенів
    console.log('1️⃣  Перевірка статистики токенів...');
    const statsResponse = await axios.get(`${BASE_URL}/v1/tokens/stats`);
    console.log('✅ Поточна статистика токенів:');
    console.log(JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    // 2. Тест запиту до API (може викликати 429)
    console.log('2️⃣  Виконання тестового запиту...');
    try {
      const chatResponse = await axios.post(`${BASE_URL}/v1/chat/completions`, {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say hello in 5 words' }
        ],
        max_tokens: 50
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Запит успішний:', chatResponse.data.choices[0].message.content);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('⚠️  Отримано 429 помилку (очікувано)');
        console.log('⏳ Чекаємо автоматичну ротацію токена...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('❌ Помилка:', error.response?.data || error.message);
      }
    }
    console.log('');

    // 3. Перевірка статистики після запиту
    console.log('3️⃣  Перевірка статистики після запиту...');
    const statsAfter = await axios.get(`${BASE_URL}/v1/tokens/stats`);
    console.log('📊 Оновлена статистика:');
    console.log(JSON.stringify(statsAfter.data, null, 2));
    console.log('');

    // 4. Тест ручної ротації
    console.log('4️⃣  Тестування ручної ротації...');
    const rotateResponse = await axios.post(`${BASE_URL}/v1/tokens/rotate`);
    console.log('✅ Результат ручної ротації:', rotateResponse.data);
    console.log('');

    // 5. Перевірка нового токена
    console.log('5️⃣  Перевірка нового активного токена...');
    const finalStats = await axios.get(`${BASE_URL}/v1/tokens/stats`);
    console.log('🔑 Активний токен:', finalStats.data.current_token);
    console.log('');

    // 6. Тест скидання статистики
    console.log('6️⃣  Скидання статистики токенів...');
    const resetResponse = await axios.post(`${BASE_URL}/v1/tokens/reset-stats`);
    console.log('✅ Результат:', resetResponse.data);
    console.log('');

    console.log('✅ Всі тести пройдено успішно!');
    
  } catch (error) {
    console.error('❌ Помилка тестування:', error.message);
    if (error.response) {
      console.error('Відповідь сервера:', error.response.data);
    }
    process.exit(1);
  }
}

// Запуск тестів
testTokenRotation();
