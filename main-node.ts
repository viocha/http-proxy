import {Hono} from 'hono';
import proxyHandler from './api/proxy.js';
import getHandler from './api/get.js';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';

const app = new Hono();

app.all('/api/proxy', (c) => proxyHandler(c.req.raw));
app.all('/api/get', (c) => getHandler(c.req.raw));

app.get('/*', serveStatic({root: './public'}));

const PORT = Number(process.env.PORT) || 8000;

serve({
	fetch: app.fetch,
	port: PORT,
});

console.log(
		`🚀 Hono server running at http://localhost:${PORT}`,
);
