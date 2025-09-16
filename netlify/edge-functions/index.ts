import {Hono} from 'hono';
import proxyHandler from '../../routes/proxy.js';
import getHandler from '../../routes/get.js';

const app = new Hono();

app.post('/api/proxy', (c)=>{
	return proxyHandler(c.req.raw);
});
app.get('/api/get', (c)=>{
	return getHandler(c.req.raw);
});

export default app.fetch;
