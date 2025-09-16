import {Hono} from 'hono';
import proxyHandler from './api/proxy.js';
import getHandler from './api/get.js';
import proxyWSHandler from './api/proxy-ws-worker.js';

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

export default app;
