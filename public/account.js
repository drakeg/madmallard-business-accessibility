const $=id=>document.getElementById(id);let csrf=null;let me=null;let needsSetup=false;
function message(text,type='info'){
 const el=$('account-message');el.textContent=text;el.dataset.state=type;el.setAttribute('role',type==='error'?'alert':'status');
}
const errorText=error=>error?.name==='TimeoutError'?'The server took too long to respond. Please retry.':error?.message||'Unexpected error. Please retry.';

async function api(path,options={}){
 let r;
 try{r=await fetch(path,{signal:AbortSignal.timeout(20000),credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{}),...options.headers}});}
 catch(error){throw new Error(error?.name==='TimeoutError'?'The request timed out. Check the Vercel function logs and try again.':'Could not contact the server. Check your connection and the Vercel deployment.');}
 const type=r.headers.get('content-type')||'';
 if(!type.includes('application/json'))throw new Error(`The server returned a non-JSON response (HTTP ${r.status}). Verify the deployment and Vercel access.`);
 const value=await r.json().catch(()=>{throw new Error(`The server returned an unreadable response (HTTP ${r.status}).`);});
 if(!r.ok)throw new Error(value.error||`Request failed (HTTP ${r.status})`);
 return value;
}

async function customers(){const data=await api('/api/customers');$('customers-list').replaceChildren();for(const user of data.customers){const p=document.createElement('p');p.textContent=`${user.name} · ${user.username} · ${user.role}`;$('customers-list').append(p);}}
async function profile(){const result=await api('/api/me');me=result.user;csrf=result.csrf;$('login-panel').hidden=true;$('profile-panel').hidden=false;$('page-title').textContent='Profile & settings';$('account-identity').textContent=`${me.username} · ${me.role}`;$('profile-name').value=me.name;$('token-state').textContent=me.hasToken?'An API token is configured.':'No API token configured; website sign-in works without one.';if(me.role==='admin'){$('customers-panel').hidden=false;await customers();}}
$('login-form').onsubmit=async e=>{
 e.preventDefault();const button=$('submit-login');button.disabled=true;
 const original=button.textContent;button.textContent=needsSetup?'Creating account…':'Signing in…';
 message(needsSetup?'Creating administrator account and saving it to the database…':'Checking your username and password…');
 try{
  const result=await api(needsSetup?'/api/auth/setup':'/api/auth/login',{method:'POST',body:JSON.stringify({username:$('username').value,password:$('password').value,name:$('setup-name').value,bootstrapToken:$('bootstrap-token').value})});
  csrf=result.csrf;
  message(needsSetup?'Administrator account created successfully. Opening dashboard…':'Signed in successfully. Opening dashboard…','success');
  // Keep the confirmation visible long enough for a person to know the operation succeeded.
  await new Promise(resolve=>setTimeout(resolve,900));location.assign('/');
 }catch(error){message(errorText(error),'error');}
 finally{button.disabled=false;button.textContent=original;}
};
$('profile-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/profile',{method:'PATCH',body:JSON.stringify({name:$('profile-name').value})});message('Profile saved.');}catch(error){message(error.message);}};
async function token(generate){try{if(generate&&!confirm('Generate a new token? The previous token will stop working immediately.'))return;const result=await api('/api/profile/token',{method:'POST',body:JSON.stringify({password:$('token-password').value,generate,token:$('profile-token').value})});$('profile-token').value=result.token;$('token-password').value='';$('token-state').textContent='An API token is configured.';message('Token saved to your account. Your previous token is now invalid. Website sign-in uses your account automatically.');}catch(error){message(error.message);}}
$('token-form').onsubmit=e=>{e.preventDefault();token(false);};$('generate-token').onclick=()=>token(true);$('show-token').onchange=()=>{$('profile-token').type=$('show-token').checked?'text':'password';};$('copy-token').onclick=async()=>{try{if(!$('profile-token').value)throw new Error('Generate or enter a token first');await navigator.clipboard.writeText($('profile-token').value);message('Token copied.');}catch(error){message(error.message);}};
$('password-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/profile/password',{method:'POST',body:JSON.stringify({currentPassword:$('current-password').value,password:$('new-password').value})});location.assign('/login');}catch(error){message(error.message);}};
$('account-logout').onclick=async()=>{try{await api('/api/auth/logout',{method:'POST'});location.assign('/login');}catch(error){message(error.message);}};
$('customer-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/customers',{method:'POST',body:JSON.stringify({name:$('customer-name').value,username:$('customer-username').value,password:$('customer-password').value})});$('customer-form').reset();await customers();message('Customer created. Assign scans from the workbench.');}catch(error){message(error.message);}};
(async()=>{
 for(const name of ['localStorage','sessionStorage'])try{window[name].removeItem('madmallard.accessibility.operator');}catch{}
 if(location.pathname==='/profile'){
  message('Loading your profile…');
  try{await profile();message('Profile loaded.','success');}
  catch(error){message('Could not load your profile: '+errorText(error),'error');$('login-panel').hidden=false;$('profile-panel').hidden=true;}
  return;
 }
 message('Connecting to the server and checking account setup…');
 try{
  const status=await api('/api/auth/status');needsSetup=status.needsSetup;
  if(needsSetup){
   $('setup-fields').hidden=false;
   $('page-title').textContent='Create administrator account';
   $('submit-login').textContent='Create administrator';
   $('password').minLength=12;$('password').maxLength=128;$('password').autocomplete='new-password';
   $('bootstrap-token').required=true;
   if(status.setupAvailable===false){$('submit-login').disabled=true;message('Administrator setup is not configured for this deployment. Set ADMIN_SETUP_TOKEN (32+ characters) for Preview and redeploy.','error');}
   else message('Database connected. Enter your account details and the one-time administrator setup secret.','success');
  }else{
   message('Database connected. Enter your username and password to sign in.','success');
   try{await api('/api/me');message('Already signed in. Opening dashboard…','success');location.assign('/');}catch{}
  }
 }catch(error){message('Cannot check account setup: '+errorText(error),'error');$('submit-login').disabled=true;}
})();
