import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {existsSync} from 'node:fs';
const executablePath=process.env.CHROMIUM_PATH;
test('real browser detects an unlabeled input and confirms its repair', {skip:!executablePath&&!existsSync(chromium.executablePath())?'No installed Chromium; set CHROMIUM_PATH':false},async()=>{
 const browser=await chromium.launch({executablePath,headless:true});
 try{
 const page=await browser.newPage();
 await page.route('https://fixture.example/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Audit fixture</title></head><body><main><h1>Contact</h1><input id="email" type="email"></main></body></html>'}));
 await page.goto('https://fixture.example/');const before=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();assert.ok(before.violations.some(x=>x.id==='label'));
 await page.locator('#email').evaluate(el=>el.setAttribute('aria-label','Email address'));
 const after=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();assert.ok(!after.violations.some(x=>x.id==='label'));
 }finally{await browser.close();}
});
