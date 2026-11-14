import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
export function publicAddress(address) {
 try {let ip=ipaddr.parse(address);if(ip.kind()==='ipv6' && ip.isIPv4MappedAddress()) ip=ip.toIPv4Address();return ip.range()==='unicast';}catch{return false;}
}
export function parseTarget(input, origins, {localTesting=false}={}) {
 const u=new URL(input);
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash) throw new Error('Use HTTP(S) without credentials or fragments');
 if(origins.length && !origins.includes(u.origin)) throw new Error('Target origin is not approved by the operator');
 if(!localTesting && u.port && !['80','443'].includes(u.port)) throw new Error('Only standard web ports are allowed');
 return u;
}
export async function validateTarget(input,origins,lookup=dns.lookup,options={}){
 const u=parseTarget(input,origins,options);const host=u.hostname.replace(/^\[|\]$/g,'');
 const addresses=ipaddr.isValid(host)?[{address:host}]:await lookup(host,{all:true});
 const allowed=address=>{if(publicAddress(address))return true;if(!options.localTesting)return false;let ip=ipaddr.parse(address);if(ip.kind()==='ipv6'&&ip.isIPv4MappedAddress())ip=ip.toIPv4Address();if(ip.toString()==='fd00:ec2::254')return false;return ['private','loopback','uniqueLocal'].includes(ip.range());};
 if(!addresses.length||addresses.some(x=>!allowed(x.address))) throw new Error('Private, reserved, or local network targets are blocked');
 return u;
}
export function compare(before,after) {
 if(before.url!==after.url) throw new Error('Compare the same page URL');
 const key=x=>`${x.id}:${JSON.stringify(x.target)}`;
 const a=new Map(before.findings.map(x=>[key(x),x]));const b=new Map(after.findings.map(x=>[key(x),x]));
 return {resolved:[...a].filter(([k])=>!b.has(k)).map(([,x])=>x),remaining:[...b].filter(([k])=>a.has(k)).map(([,x])=>x),introduced:[...b].filter(([k])=>!a.has(k)).map(([,x])=>x),notice:'Automated comparison only. Changed markup can change finding identity; manually verify every claimed resolution.'};
}
