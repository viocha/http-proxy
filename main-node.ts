import {Hono} from 'hono';
import proxyHandler from './api/proxy.js';
import getHandler from './api/get.js';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';

const app = new Hono();

app.all('/api/proxy', (c) => proxyHandler(c.req.raw));
app.all('/api/get', (c) => getHandler(c.req.raw));

app.get('/*', serveStatic({root: './public'}));

serve({
	fetch: app.fetch,
	port:8000,
})
