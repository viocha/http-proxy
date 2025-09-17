// @ts-nocheck
import {Hono} from 'hono';
import proxyHandler from './api/proxy.ts';
import getHandler from './api/get.ts';
import proxyWSHandler from './api/proxy-ws-deno.ts';
import {serveStatic} from '@hono/node-server/serve-static';


const app = new Hono();

app.all('/api/proxy', (c) => proxyHandler(c.req.raw));
app.all('/api/get', (c) => getHandler(c.req.raw));
app.all('/api/proxy-ws', (c) => proxyWSHandler(c.req.raw));

app.get('/*', serveStatic({root: './public'}));

// @ts-ignore
Deno.serve(app.fetch);
