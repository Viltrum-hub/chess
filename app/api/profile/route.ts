import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {loadProfile,saveProfile} from '../../../lib/inventory.mjs';
export const dynamic='force-dynamic';
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}})}
function failure(error:unknown){const e=error as Error & {status?:number};return json({error:e.status?e.message:'No se pudo acceder a tu colección. Inténtalo nuevamente.'},e.status||503)}
export async function GET(){
  try{const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión para sincronizar tu colección.'},401);if(!env.DB)return json({error:'La colección no está disponible temporalmente.'},503);return json(await loadProfile(env.DB,user,(env as any).CHESS_OWNER_EMAIL));}catch(e){console.error('profile.get',e);return failure(e)}
}
export async function POST(request:Request){
  try{const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión para guardar tu colección.'},401);const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Solicitud no permitida.'},403);const text=await request.text();if(text.length>40000)return json({error:'La partida es demasiado grande.'},413);let payload;try{payload=JSON.parse(text)}catch{return json({error:'Solicitud no válida.'},400)}if(!env.DB)return json({error:'La colección no está disponible temporalmente.'},503);return json(await saveProfile(env.DB,user,(env as any).CHESS_OWNER_EMAIL,payload));}catch(e){console.error('profile.save',e);return failure(e)}
}
