// index.js
const mqtt = require('mqtt');
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. DUMMY WEB SERVER (This is just to satisfy Render and UptimeRobot)
app.get('/', (req, res) => {
  res.send('KneuraSense Worker is running 24/7!');
});

app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// 2. MQTT BACKGROUND LISTENER
const MQTT_HOST = 'd74c9cedfa0e44efa6fbbc6a42bef453.s1.eu.hivemq.cloud';
const MQTT_PORT = 8883; // Use 8883 for Node.js (mqtts) instead of 8884 (wss)
const MQTT_USER = 'KneuraSense-esp32';
const MQTT_PASS = 'Kneurasense123';

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: 'server_worker_' + Math.random().toString(16).substring(2, 8),
  username: MQTT_USER,
  password: MQTT_PASS,
  clean: true,
  reconnectPeriod: 2000,
});

client.on('connect', () => {
  console.log('Worker connected to HiveMQ!');
  // Subscribe to ALL ESP32 devices
  client.subscribe('esp32/+/data', (err) => {
    if (err) console.error('Subscription error:', err);
    else console.log('Listening for ESP32 data...');
  });
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    
    // Extract MAC Address from the topic string (e.g., "esp32/A1B2C3D4E5F6/data")
    const macAddress = topic.split('/')[1]; 

    console.log(`Received data from ${macAddress}. Forwarding to Next.js API...`);

    // 3. SEND TO YOUR EXISTING NEXT.JS API
    // Replace this URL with your actual deployed Vercel Next.js URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kneura-sense.vercel.app/';

    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceMac: macAddress, 
        ...payload
      })
    });

  } catch (err) {
    console.error('Failed to process message:', err);
  }
});