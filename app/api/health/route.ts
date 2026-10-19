import {env} from 'cloudflare:workers';
import {ensureCatalog} from '../../../lib/inventory.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{if(!env.DB)throw new Error('DB unavailable');await ensureCatalog(env.DB);const row=await env.DB.prepare('SELECT COUNT(*) AS count FROM chess_skins').first();return Response.json({database:'connected',collections:row?.count},{headers:{'Cache-Control':'no-store'}})}catch(error){console.error('database.health',error);return Response.json({database:'unavailable'},{status:503})}}
