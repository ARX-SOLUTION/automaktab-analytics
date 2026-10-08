import {test,expect} from '@playwright/test';

test('owner reads source lines beyond 100 before closing an invoice',async({page})=>{
 const meta={requestId:'synthetic-ui-lines',apiVersion:1,status:'fresh'};
 const contract={id:'11111111-1111-4111-8111-111111111111',companyId:'22222222-2222-4222-8222-222222222222',planType:'active_student',amountMinor:'3100',currency:'UZS',businessTimezone:'Asia/Tashkent',effectiveFrom:'2026-09-01',effectiveTo:null,revision:1,status:'active',policyRevisionId:'synthetic-policy'};
 const previewId='33333333-3333-4333-8333-333333333333';
 const lines=Array.from({length:101},(_,index)=>({subjectId:`subject-${index+1}`,branchId:'synthetic-branch',days:30,amountMinor:'3000',basis:'Faol kunlar'}));
 const preview={previewId,previewHash:'synthetic-hash',ledgerRevision:'1',expiresAt:'2099-01-01T00:00:00Z',canCommit:true,input:{periodStart:'2026-09-01',periodEnd:'2026-10-01'},consequences:{},contractId:contract.id,companyId:contract.companyId,periodStart:'2026-09-01',periodEnd:'2026-10-01',currency:'UZS',totalMinor:'303000',lines:lines.slice(0,100),lineCount:101,linesTruncated:true,contractRevision:1,policyRevisionId:'synthetic-policy',sourceCheckpoint:'synthetic-checkpoint',canClose:true,blockers:[]};
 const reply=(data:unknown)=>({status:200,contentType:'application/json',body:JSON.stringify({data,meta})});
 await page.route('**/api/v1/billing/contracts?*',route=>route.fulfill(reply({items:[contract]})));
 await page.route('**/api/v1/billing/invoices?*',route=>route.fulfill(reply({items:[]})));
 await page.route(`**/api/v1/billing/contracts/${contract.id}/previews`,route=>route.fulfill(reply(preview)));
 await page.route(`**/api/v1/billing/invoice-previews/${previewId}/lines?*`,route=>{
  const cursor=Number(new URL(route.request().url()).searchParams.get('cursor')??'0');
  return route.fulfill(reply({items:lines.slice(cursor,cursor+100),total:101,nextCursor:cursor===0?'100':null}));
 });
 await page.goto('/invoices');
 await page.getByRole('button',{name:'Sinov egasi sifatida kirish'}).click();
 await page.getByLabel('Shartnoma',{exact:true}).selectOption(contract.id);
 await page.getByLabel('Davr boshlanishi',{exact:true}).fill('2026-09-01');
 await page.getByLabel('Davr tugashi',{exact:true}).fill('2026-10-01');
 await page.getByRole('button',{name:'Nonposting preview olish'}).click();
 await expect(page.getByText('subject-100',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Keyingi satrlar'}).click();
 await expect(page.getByText('subject-101',{exact:true})).toBeVisible();
 await expect(page.getByText('subject-1',{exact:true})).toHaveCount(0);
 await expect(page.getByText('101–101 / 101',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Keyingi satrlar'})).toBeDisabled();
 await page.getByRole('button',{name:'Oldingi satrlar'}).click();
 await expect(page.getByText('subject-1',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Invoice’ni yopish'})).toBeEnabled();
});
