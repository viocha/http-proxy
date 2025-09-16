import {Hono} from 'hono';
import proxyHandler from './api/proxy.js';
import getHandler from './api/get.js';
import {serveStatic} from '@hono/node-server/serve-static';

const app = new Hono();

app.post('/api/proxy', (c)=>{
	return proxyHandler(c.req.raw);
});
app.get('/api/get', (c)=>{
	return getHandler(c.req.raw);
});

app.get('/*', serveStatic({root: './public'}));

// @ts-ignore
Deno.serve(app.fetch);
