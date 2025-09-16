// @ts-nocheck
import {Hono} from 'hono';
import proxyHandler from './routes/proxy.ts';
import getHandler from './routes/get.ts';
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
