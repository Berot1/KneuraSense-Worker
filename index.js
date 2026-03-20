// index.js
const mqtt = require('mqtt');
const express = require('express');
const axios = require('axios'); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. DUMMY WEB SERVER
app.get('/', (req, res) => {
  res.send('KneuraSense Worker is running 24/7!');
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// 2. MQTT BACKGROUND LISTENER
const mqttHost = process.env.MQTT_HOST;
const mqttPort = process.env.MQTT_PORT;
const mqttUser = process.env.MQTT_USER;
const mqttPassword = process.env.MQTT_PASS;

const client = mqtt.connect(`mqtts://${mqttHost}:${mqttPort}`, {
  clientId: 'server_worker_' + Math.random().toString(16).substring(2, 8),
  username: mqttUser,
  password: mqttPassword,
  clean: true,
  reconnectPeriod: 2000,
});

client.on('connect', () => {
  console.log('Worker connected to HiveMQ!');
  client.subscribe('esp32/+/data', (err) => {
    if (err) console.error('Subscription error:', err);
    else console.log('Listening for ESP32 data...');
  });
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const macAddress = topic.split('/')[1]; 

    console.log(`Received data from ${macAddress}. Forwarding to Next.js API...`);

    // EXACT URL POINTING TO THE API ROUTE
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kneura-sense-koa.vercel.app/api/save-log-worker';

    // 3. SEND TO YOUR NEXT.JS API USING AXIOS (NOW SECURED)
    const response = await axios.post(API_URL, {
      deviceMac: macAddress, 
      ...payload
    }, {
      // SECURITY HEADER ADDED HERE
      headers: {
        'x-api-key': process.env.WORKER_SECRET_KEY
      }
    });

    console.log(`Successfully forwarded! API responded with:`, response.data);

  } catch (err) {
    console.error('Failed to process message:', err.response ? err.response.data : err.message);
  }
});