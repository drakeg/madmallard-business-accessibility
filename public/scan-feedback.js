/**
 * Derive fresh terminal outcomes from observed audit transitions.
 * Only previously-running jobs produce notifications: old history should not
 * show a success alert every time the user signs in or refreshes the page.
 */
export function observeScanOutcomes(watched, audits) {
 const next=new Map();
 const outcomes=[];
 for(const audit of audits){
  const previous=watched.get(audit.id);
  if(previous==='running' && ['complete','failed'].includes(audit.state)){
   outcomes.push({id:audit.id,state:audit.state,url:audit.url,error:audit.state==='failed'?audit.error||'The scan did not finish. Review its record for details.':null});
  }
  if(audit.state==='running')next.set(audit.id,'running');
 }
 return {watched:next,outcomes};
}

export function outcomeMessage(outcome){
 const label=outcome.url||'the requested page';
 return outcome.state==='complete'
  ?`Audit completed: ${label}. Open Review to inspect findings and download the report.`
  :`Audit failed: ${label}. ${outcome.error} Review the failed audit, then start a new scan to retry.`;
}
