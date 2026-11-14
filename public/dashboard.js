export function summarizeAudits(audits,now=new Date()){
 const complete=audits.filter(a=>a.state==='complete');const latest=new Map();const time=a=>Number.isFinite(Date.parse(a.createdAt))?Date.parse(a.createdAt):0;
 for(const a of complete)if(!latest.has(a.url)||time(a)>time(latest.get(a.url)))latest.set(a.url,a);
 const severity={critical:0,serious:0,moderate:0,minor:0,review:0};let seoReview=0,seoPages=0;
 for(const a of latest.values()){for(const f of a.findings||[])if(!['fixed','dismissed'].includes(f.status)){const impact=Object.hasOwn(severity,f.impact)?f.impact:'review';severity[impact]++;}if(a.seo){seoPages++;seoReview+=(a.seo.checks||[]).filter(c=>['review','fail'].includes(c.status)).length;}}
 const key=d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
 const days=Array.from({length:7},(_,i)=>{const date=new Date(now);date.setHours(0,0,0,0);date.setDate(date.getDate()-6+i);return {key:key(date),label:new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(date),complete:0,failed:0,running:0};});
 for(const a of audits){const date=new Date(a.createdAt);if(!Number.isFinite(date.getTime()))continue;const day=days.find(d=>d.key===key(date));if(day&&Object.hasOwn(day,a.state))day[a.state]++;}
 return {total:audits.length,completed:complete.length,failed:audits.filter(a=>a.state==='failed').length,pages:latest.size,findings:Object.values(severity).reduce((a,b)=>a+b,0),severity,days,seoReview,seoPages};
}
