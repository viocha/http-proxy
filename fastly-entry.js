import {includeBytes} from 'fastly:experimental';
import proxyHandler from './api/proxy.ts';
const indexPage = includeBytes('./public/index.html');

addEventListener('fetch', (event)=>event.respondWith(handleRequest(event)));

async function handleRequest(event){
	const req = event.request;
	const url = new URL(req.url);
	
	if (url.pathname==='/' && req.method==='GET'){
		return new Response(indexPage, {
			status:200,
			headers:new Headers({'Content-Type':'text/html; charset=utf-8'}),
		});
	}
	
	if (url.pathname==='/api/proxy'){
		return proxyHandler(req);
	}
	
	return new Response('The page you requested could not be found', {
		status:404,
	});
}
