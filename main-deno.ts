// @ts-nocheck
import {Hono} from 'hono';
import proxyHandler from './api/proxy.ts';
import getHandler from './api/get.ts';
import proxyWSHandler from './api/proxy-ws-deno.ts';
import {serveStatic} from '@hono/node-server/serve-static';


const app = new Hono();

app.post('/api/proxy', (c)=>{
	return proxyHandler(c.req.raw);
});
app.get('/api/get', (c)=>{
	return getHandler(c.req.raw);
});
app.get('/api/proxy-ws', (c)=>{
	return proxyWSHandler(c.req.raw);
});

app.get('/*', serveStatic({root: './public'}));

// @ts-ignore
Deno.serve(app.fetch);
