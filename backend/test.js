import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export let options = {
  vus: 50,
  duration: '30s',
};

const BASE_URL = 'http://81.192.187.216:3001';
const EMAIL = 'test@example.com';
const PASSWORD = 'Pa$$w0rd!';

export default function () {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login succeeded': (r) => r.status === 200 });
  const token = loginRes.json('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // GET deplacements
  const res = http.get(`${BASE_URL}/api/deplacements`, { headers });
  check(res, { 'fetched deplacements': (r) => r.status === 200 });

  // POST new deplacement (simulate creating one)
  const today = new Date().toISOString().split('T')[0];

  const postRes = http.post(`${BASE_URL}/api/deplacements`, JSON.stringify({
    date: today,
    chantierId: null,
    typeDeDeplacementId: 1,
    libelleDestination: "Test Load",
    distanceKm: randomIntBetween(10, 100),
    depenses: [
      { typeDepenseId: 1, montant: 25.5 }
    ]
  }), { headers });

  check(postRes, { 'created deplacement': (r) => r.status === 201 });

  sleep(1);
}


export function handleSummary(data) {
  return {
    'summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }), // also show in terminal
  };
}
