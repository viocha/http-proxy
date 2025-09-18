import {Hono} from 'hono';
import proxyHandler from './api/proxy.js';
import getHandler from './api/get.js';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';
import fs from 'fs';

const app = new Hono();

app.all('/api/proxy', (c) => proxyHandler(c.req.raw));
app.all('/api/get', (c) => getHandler(c.req.raw));

app.get('/*', serveStatic({root: './public'}));

const PORT = Number(process.env.PORT) || 8000;
const SSL = process.env.SSL === 'true';

const certPath = './ssl/cert.pem';
const keyPath = './ssl/key.pem';
const cert = fs.existsSync(certPath) ? fs.readFileSync(certPath) : undefined;
const key = fs.existsSync(keyPath) ? fs.readFileSync(keyPath) : undefined;

serve({
	fetch: app.fetch,
	port: PORT,
	serverOptions: SSL ? {cert, key} : {},
});

console.log(
		`🚀 Hono server running at http${SSL ? 's' : ''}://localhost:${PORT}`,
);
