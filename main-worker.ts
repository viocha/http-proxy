import {Hono} from 'hono';
import proxyHandler from './api/proxy.js';
import getHandler from './api/get.js';
import proxyWSHandler from './api/proxy-ws-worker.js';

const app = new Hono();

app.all('/api/proxy', (c) => proxyHandler(c.req.raw));
app.all('/api/get', (c) => getHandler(c.req.raw));
app.all('/api/proxy-ws', (c) => proxyWSHandler(c.req.raw));

export default app;
