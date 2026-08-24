#!/usr/bin/env node
/**
 * setup-env.js
 * Root me chalao: node scripts/setup-env.js
 *
 * Kaam:
 *  - root .env.example -> .env (agar .env nahi hai)
 *  - har services/*-service/.env.example -> .env (agar .env nahi hai)
 *  - MySQL host "mysql" -> "127.0.0.1"   (kyunki MySQL XAMPP me chal raha hai, docker me nahi)
 *  - Redis host "redis"  -> "127.0.0.1"   (docker redis container, port 6379 host pe expose)
 *  - RabbitMQ host "rabbitmq" -> "127.0.0.1" (docker rabbitmq container, port 5672 host pe expose)
 *
 * Safe: agar .env pehle se maujood hai to skip karega (overwrite nahi karega).
 * Force overwrite karna ho to: node scripts/setup-env.js --force
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FORCE = process.argv.includes('--force');

function patchHosts(content) {
  return content
    .replace(/@mysql:3306/g, '@127.0.0.1:3306')
    .replace(/REDIS_HOST=redis/g, 'REDIS_HOST=127.0.0.1')
    .replace(/@rabbitmq:5672/g, '@127.0.0.1:5672');
}

function writeEnv(exampleFile, envFile, label) {
  if (!fs.existsSync(exampleFile)) {
    console.log(`  [skip] ${label} -> .env.example missing`);
    return;
  }
  if (fs.existsSync(envFile) && !FORCE) {
    console.log(`  [skip] ${label} -> .env already exists (use --force to overwrite)`);
    return;
  }
  const raw = fs.readFileSync(exampleFile, 'utf8');
  const patched = patchHosts(raw);
  fs.writeFileSync(envFile, patched);
  console.log(`  [ok]   ${label} -> .env written`);
}

console.log('== Root .env ==');
writeEnv(path.join(ROOT, '.env.example'), path.join(ROOT, '.env'), 'root');

console.log('\n== Services .env ==');
const servicesDir = path.join(ROOT, 'services');
const services = fs
  .readdirSync(servicesDir)
  .filter((d) => fs.statSync(path.join(servicesDir, d)).isDirectory());

for (const svc of services) {
  const dir = path.join(servicesDir, svc);
  writeEnv(path.join(dir, '.env.example'), path.join(dir, '.env'), svc);
}

console.log('\nDone. Ab MySQL_USER/PASSWORD check kar lena (erp / erp_password) — XAMPP me wahi user banana hoga.');