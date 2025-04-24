import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const url = req.query.url as string;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const response = await axios.get(url);
        return res.status(200).json({
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
        });
    } catch (error: any) {
        return res.status(500).json({
            error: error.message,
            response: error.response?.data || null,
        });
    }
}
