import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const dateOnly=(d:Date)=>d.toISOString().slice(0,10);
Deno.serve(async (req) => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  const url=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db=createClient(url,key);
  const bearer=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!bearer) return Response.json({error:'Authentication required.'},{status:401,headers:cors});
  let authorized=bearer===key;
  if(!authorized){const anon=Deno.env.get('SUPABASE_ANON_KEY');if(!anon)return Response.json({error:'Supabase anon key is not configured.'},{status:503,headers:cors});const auth=createClient(url,anon);const {data:{user}}=await auth.auth.getUser(bearer);if(!user)return Response.json({error:'Invalid session.'},{status:401,headers:cors});const {data:owner}=await db.from('settings').select('owner_user_id').eq('id',true).single();authorized=owner?.owner_user_id===user.id;}
  if(!authorized)return Response.json({error:'Owner access required.'},{status:403,headers:cors});
  const today=new Date(); today.setUTCHours(0,0,0,0); const todayStr=dateOnly(today);
  const {data:settings}=await db.from('settings').select('emi_pre_remind_days,owner_user_id').eq('id',true).single();
  if(!settings?.owner_user_id) return Response.json({error:'Set the dealership owner in settings first.'},{status:409,headers:cors});
  const {data:templates}=await db.from('message_templates').select('id,type,name,tone').eq('active',true);
  const templateFor=(type:string,name:string)=>templates?.find(t=>t.type===type&&t.name.toLowerCase()===name.toLowerCase())?.id||templates?.find(t=>t.type===type)?.id||null;
  const {data:customers,error:ce}=await db.from('customers').select('id,name,delivery_date'); if(ce) return Response.json({error:ce.message},{status:500,headers:cors});
  const customersById=new Map((customers||[]).map(c=>[c.id,c])); let created=0;
  const add=async (rows:any[])=>{if(!rows.length)return;const {data,error}=await db.from('reminders').upsert(rows,{onConflict:'customer_id,type,occurrence_key',ignoreDuplicates:true}).select('id');if(error)throw error;created+=(data||[]).length;};
  try {
    // Keep the installment ledger ahead of today so each monthly reminder is attached to a real payment row.
    const {data:loans,error:le}=await db.from('loans').select('*').eq('status','active'); if(le)throw le;
    for(const loan of loans||[]){const start=new Date(`${loan.start_date}T00:00:00Z`);const schedule=[];
      for(let n=0;n<loan.tenure_months;n++){const d=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+n,Math.min(loan.emi_day_of_month,new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+n+1,0)).getUTCDate())));const due=dateOnly(d);schedule.push({loan_id:loan.id,due_date:due,amount_due:loan.emi_amount,amount_paid:0,status:due<todayStr?'overdue':'upcoming'});}
      if(schedule.length){const {error}=await db.from('emi_payments').upsert(schedule,{onConflict:'loan_id,due_date',ignoreDuplicates:true});if(error)throw error;}
    }
    const {data:payments,error:pe}=await db.from('emi_payments').select('id,loan_id,due_date,amount_due,status,loans(customer_id,status)').neq('status','paid').neq('status','waived').lte('due_date',dateOnly(new Date(today.getTime()+45*86400000)));if(pe)throw pe;
    const emiRows:any[]=[];
    for(const p of payments||[]){const loan=(p as any).loans;if(!loan||loan.status!=='active')continue;const due=new Date(`${p.due_date}T00:00:00Z`);const delta=Math.round((due.getTime()-today.getTime())/86400000);
      const candidates=[{offset:Number(settings.emi_pre_remind_days),key:'gentle',day:-Number(settings.emi_pre_remind_days)},{offset:0,key:'final',day:0},{offset:-1,key:'overdue-1',day:1},{offset:-3,key:'overdue-3',day:3},{offset:-7,key:'overdue-7',day:7}];
      for(const c of candidates){if(delta!==c.offset)continue;const d=new Date(due);d.setUTCDate(d.getUTCDate()+c.day);const templateName=c.key==='gentle'?'EMI · Gentle':c.key==='final'?'EMI · Due today':`EMI · Overdue ${c.day}`;emiRows.push({type:'emi_due',customer_id:loan.customer_id,due_date:dateOnly(d),status:'pending',related_id:p.id,template_id:templateFor('emi_due',templateName),occurrence_key:`emi-${p.id}-${c.key}`});}
      if(delta<0 && p.status==='upcoming'){await db.from('emi_payments').update({status:'overdue'}).eq('id',p.id)}
    } await add(emiRows);
    const {data:services,error:se}=await db.from('services').select('*').eq('status','upcoming');if(se)throw se;const serviceRows:any[]=[];
    for(const s of services||[]){if(s.type==='paid')continue;const odometer=Number(s.km_last_known||0)>=Number(s.km_trigger||Infinity);const calendar=!!s.due_date&&s.due_date<=todayStr;if(odometer||calendar){const n=Number(s.type.slice(-1));serviceRows.push({type:'service_due',customer_id:s.customer_id,due_date:todayStr,status:'pending',related_id:s.id,template_id:templateFor('service_due',`Free service ${n}`),occurrence_key:`service-${s.id}`});}}await add(serviceRows);
    const eventRows:any[]=[];
    for(const c of customers||[]){const delivery=new Date(`${c.delivery_date}T00:00:00Z`);const review=new Date(delivery);review.setUTCDate(review.getUTCDate()+5);if(dateOnly(review)===todayStr)eventRows.push({type:'review_ask',customer_id:c.id,due_date:todayStr,status:'pending',template_id:templateFor('review_ask','Google review'),occurrence_key:'delivery-review'});
      const feedback=new Date(delivery);feedback.setUTCDate(feedback.getUTCDate()+15);if(dateOnly(feedback)===todayStr)eventRows.push({type:'feedback_call',customer_id:c.id,due_date:todayStr,status:'pending',template_id:templateFor('feedback_call','Feedback call'),occurrence_key:'delivery-feedback'});
      const anniversary=new Date(delivery);anniversary.setUTCFullYear(today.getUTCFullYear());if(dateOnly(anniversary)===todayStr&&today.getUTCFullYear()>delivery.getUTCFullYear())eventRows.push({type:'delivery_anniversary',customer_id:c.id,due_date:todayStr,status:'pending',template_id:templateFor('delivery_anniversary','Anniversary wish'),occurrence_key:`anniversary-${today.getUTCFullYear()}`});
    }await add(eventRows);
    const {data:done,error:de}=await db.from('services').select('id,customer_id,done_date').eq('status','done').not('done_date','is',null);if(de)throw de;const reviewRows:any[]=[];
    for(const s of done||[]){const d=new Date(`${s.done_date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+2);if(dateOnly(d)===todayStr)reviewRows.push({type:'review_ask',customer_id:s.customer_id,due_date:todayStr,status:'pending',related_id:s.id,template_id:templateFor('review_ask','Google review'),occurrence_key:`service-review-${s.id}`});}await add(reviewRows);
    const {data:lastServices}=await db.from('services').select('customer_id,done_date').eq('status','done').not('done_date','is',null).order('done_date',{ascending:false});const latest=new Map<string,string>();for(const s of lastServices||[])if(!latest.has(s.customer_id))latest.set(s.customer_id,s.done_date);
    const nudge:any[]=[];for(const [customerId,doneDate] of latest){const first=new Date(`${doneDate}T00:00:00Z`);first.setUTCMonth(first.getUTCMonth()+6);for(let d=new Date(first);dateOnly(d)<=todayStr;d.setUTCMonth(d.getUTCMonth()+6)){const occurrence=dateOnly(d);nudge.push({type:'paid_service_nudge',customer_id:customerId,due_date:occurrence,status:'pending',template_id:templateFor('paid_service_nudge','Paid service reminder'),occurrence_key:`paid-service-${occurrence}`});}}await add(nudge);
    return Response.json({ok:true,generated:created,checked:customersById.size,asOf:todayStr},{headers:cors});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'Reminder generation failed'},{status:500,headers:cors});}
});
