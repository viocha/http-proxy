import {Hono} from 'hono';
import proxyHandler from './routes/proxy.js';
import getHandler from './routes/get.js';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';

const app = new Hono();

app.post('/api/proxy', (c)=>{
	return proxyHandler(c.req.raw);
});
app.get('/api/get', (c)=>{
	return getHandler(c.req.raw);
});

app.get('/*', serveStatic({root: './public'}));

serve({
	fetch: app.fetch,
	port:8000,
})
