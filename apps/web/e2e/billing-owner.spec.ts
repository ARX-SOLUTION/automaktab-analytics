import {test,expect,type Page,type Response} from '@playwright/test';
import type {Contract,Invoice,Payment,SchoolCredit} from '@automaktab/contracts';

async function committed<T>(page:Page,path:string,click:()=>Promise<void>):Promise<T>{
 const pending=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname===`/api/v1${path}`);
 await click();const response=await pending;const body=await response.json() as {data:T;error?:unknown};
 expect([200,201],JSON.stringify(body.error)).toContain(response.status());
 expect(response.request().headers()['idempotency-key']).toBeTruthy();expect(response.request().headers()['x-csrf-token']).toBeTruthy();
 await expect(page.getByRole('region',{name:'Moliyaviy amal natijasini tiklash'})).toHaveCount(0);
 return body.data;
}
async function readData<T>(response:Response|Awaited<ReturnType<Page['request']['get']>>):Promise<T>{expect(response.status()).toBe(200);return (await response.json() as {data:T}).data;}
function review(page:Page,name:string){return page.getByRole('region',{name,exact:true});}

test('owner reviews real contract, invoice, receipt, correction and full reversal with immutable original',async({page})=>{
 test.setTimeout(120000);const company='synthetic-school-1';
 await page.goto(`/contracts?from=2026-10-01&to=2026-11-01&companyId=${company}`);
 await page.getByRole('button',{name:'Sinov egasi sifatida kirish'}).click();
 await expect(page.getByRole('heading',{name:'Shartnomalar',exact:true})).toBeVisible();
 const policy=await readData<{status:string}>(await page.request.get('/api/v1/billing/policy-status'));
 if(policy.status!=='active'){
  await page.getByRole('button',{name:'Qoidalarni ko‘rib tasdiqlash'}).click();
  await committed(page,'/billing/policy-confirmations',()=>page.getByRole('button',{name:'Qoidalarni tasdiqlash',exact:true}).click());
 }
 await page.locator('#contract-company').selectOption(company);await page.locator('#contract-plan').selectOption('fixed_monthly');await page.locator('#contract-amount').fill('100000');await page.locator('#contract-from').fill('2026-10-01');
 await page.getByRole('button',{name:'Server reviewini olish',exact:true}).click();
 const contract=await committed<Contract>(page,'/billing/contracts',()=>review(page,'Kelishuv oqibatlarini tasdiqlang').getByRole('button',{name:'Tasdiqlash',exact:true}).click());
 const contractRow=page.getByRole('table',{name:'Platforma tariflari; kurs to‘lovlari alohida'}).getByRole('row').filter({hasText:company});
 await contractRow.getByRole('button',{name:'Faollashtirish'}).click();await page.getByRole('button',{name:'Server reviewini olish',exact:true}).click();
 await committed(page,`/billing/contracts/${contract.id}/confirm`,()=>review(page,'Kelishuv oqibatlarini tasdiqlang').getByRole('button',{name:'Tasdiqlash',exact:true}).click());
 await page.getByRole('link',{name:'Invoicelar',exact:true}).first().click();
 await page.locator('#invoice-contract').selectOption(contract.id);await page.locator('#invoice-start').fill('2026-10-01');await page.locator('#invoice-end').fill('2026-11-01');await page.getByRole('button',{name:'Nonposting preview olish'}).click();
 await expect(page.getByRole('table',{name:'Invoice yopilishidan oldingi to‘liq hisoblash asoslari'}).getByText('Fixed tarif',{exact:true}).first()).toBeVisible();
 const invoice=await committed<Invoice>(page,`/billing/contracts/${contract.id}/closes`,()=>page.getByRole('button',{name:'Invoice’ni yopish'}).click());expect(invoice.totalMinor).toBe('100000');
 await page.getByRole('link',{name:'Tushumlar va avans',exact:true}).first().click();
 await page.locator('#payment-company').selectOption(company);await page.locator('#payment-amount').fill('100000');await page.locator('#payment-date').fill('2026-10-01T10:00');await page.locator('#payment-reference').fill('Synthetic owner financial E2E');await page.getByRole('button',{name:'Taqsimot taklifini olish'}).click();
 await expect(review(page,'Kelgan pul, taqsimot va avansni tasdiqlang').getByText(invoice.id,{exact:true}).first()).toBeVisible();
 const payment=await committed<Payment>(page,'/billing/payments',()=>review(page,'Kelgan pul, taqsimot va avansni tasdiqlang').getByRole('button',{name:'Tushumni bir marta qayd etish'}).click());expect(payment.allocatedMinor).toBe('100000');expect(payment.unallocatedMinor).toBe('0');
 await page.getByRole('link',{name:'Invoicelar',exact:true}).first().click();
 const invoiceRow=page.getByRole('table',{name:'Original invoice o‘zgarmaydi; correction alohida qayd'}).getByRole('row').filter({hasText:invoice.id});await invoiceRow.getByRole('button',{name:'Correction',exact:true}).click();await page.locator('#correction-type').selectOption('credit');await page.locator('#correction-total').fill('80000');await page.locator('#correction-reason').fill('Synthetic reviewed credit correction');await page.getByRole('button',{name:'Correction reviewini olish'}).click();
 const corrected=await committed<Invoice>(page,`/billing/invoices/${invoice.id}/corrections`,()=>review(page,'Correction oqibatlari').getByRole('button',{name:'Tasdiqlash',exact:true}).click());expect(corrected.totalMinor).toBe('100000');expect(corrected.correctedTotalMinor).toBe('80000');expect(corrected.outstandingMinor).toBe('0');
 const credits=await readData<{items:{companyId:string;unallocatedMinor:string}[]}>(await page.request.get(`/api/v1/billing/credits?environment=synthetic&companyId=${company}`));expect(credits.items.find(item=>item.companyId===company)?.unallocatedMinor).toBe('20000');
 await page.getByRole('link',{name:'Tushumlar va avans',exact:true}).first().click();const paymentRow=page.getByRole('table',{name:'Original tushum va reversal alohida saqlanadi'}).getByRole('row').filter({hasText:payment.id});await paymentRow.getByRole('button',{name:'To‘liq reversal',exact:true}).click();await page.locator('#reversal-reason').fill('Synthetic full reversal review');await page.getByRole('button',{name:'Reversal oqibatlarini olish'}).click();
 const reversed=await committed<Payment>(page,`/billing/payments/${payment.id}/reversals`,()=>review(page,'To‘liq reversal oqibatlari').getByRole('button',{name:'To‘liq reversalni tasdiqlash'}).click());expect(reversed.reversed).toBe(true);expect(reversed.amount.minor).toBe('100000');
 const final=await readData<Invoice>(await page.request.get(`/api/v1/billing/invoices/${invoice.id}`));expect(final.totalMinor).toBe('100000');expect(final.correctedTotalMinor).toBe('80000');expect(final.outstandingMinor).toBe('80000');
 const unresolved=await readData<{items:unknown[]}>(await page.request.get('/api/v1/commands?status=unresolved'));expect(unresolved.items).toEqual([]);
});

test('owner allocates cancellation entitlement separately from cash with a fresh reviewed grant',async({page})=>{
 test.setTimeout(120000);const company='synthetic-school-2';
 await page.goto(`/contracts?from=2026-10-01&to=2026-11-01&companyId=${company}`);await page.getByRole('button',{name:'Sinov egasi sifatida kirish'}).click();
 const policy=await readData<{status:string}>(await page.request.get('/api/v1/billing/policy-status'));if(policy.status!=='active'){await page.getByRole('button',{name:'Qoidalarni ko‘rib tasdiqlash'}).click();await committed(page,'/billing/policy-confirmations',()=>page.getByRole('button',{name:'Qoidalarni tasdiqlash',exact:true}).click());}
 await page.locator('#contract-company').selectOption(company);await page.locator('#contract-plan').selectOption('fixed_monthly');await page.locator('#contract-amount').fill('100000');await page.locator('#contract-from').fill('2026-10-01');await page.getByRole('button',{name:'Server reviewini olish',exact:true}).click();
 const contract=await committed<Contract>(page,'/billing/contracts',()=>review(page,'Kelishuv oqibatlarini tasdiqlang').getByRole('button',{name:'Tasdiqlash',exact:true}).click());
 const contractRow=()=>page.getByRole('table',{name:'Platforma tariflari; kurs to‘lovlari alohida'}).getByRole('row').filter({hasText:company});await contractRow().getByRole('button',{name:'Faollashtirish'}).click();await page.getByRole('button',{name:'Server reviewini olish',exact:true}).click();await committed(page,`/billing/contracts/${contract.id}/confirm`,()=>review(page,'Kelishuv oqibatlarini tasdiqlang').getByRole('button',{name:'Tasdiqlash',exact:true}).click());
 await page.getByRole('link',{name:'Invoicelar',exact:true}).first().click();await page.locator('#invoice-contract').selectOption(contract.id);await page.locator('#invoice-start').fill('2026-10-01');await page.locator('#invoice-end').fill('2026-11-01');await page.getByRole('button',{name:'Nonposting preview olish'}).click();const invoice=await committed<Invoice>(page,`/billing/contracts/${contract.id}/closes`,()=>page.getByRole('button',{name:'Invoice’ni yopish'}).click());
 await page.getByRole('table',{name:'Original invoice o‘zgarmaydi; correction alohida qayd'}).getByRole('row').filter({hasText:invoice.id}).getByRole('button',{name:'Correction',exact:true}).click();await page.locator('#correction-type').selectOption('credit');await page.locator('#correction-total').fill('20000');await page.locator('#correction-reason').fill('Synthetic pre-cancellation reviewed correction');await page.getByRole('button',{name:'Correction reviewini olish'}).click();await committed(page,`/billing/invoices/${invoice.id}/corrections`,()=>review(page,'Correction oqibatlari').getByRole('button',{name:'Tasdiqlash',exact:true}).click());
 await page.getByRole('link',{name:'Shartnomalar',exact:true}).first().click();await contractRow().getByRole('button',{name:'Bekor qilish',exact:true}).click();await page.locator('#contract-cancel').fill('2026-10-16');await page.locator('#contract-reason').fill('Synthetic cancellation entitlement review');await page.getByRole('button',{name:'Server reviewini olish',exact:true}).click();await expect(review(page,'Kelishuv oqibatlarini tasdiqlang').getByText('Alohida qoladigan kredit',{exact:true})).toBeVisible();
 const cancelled=await committed<Contract&{schoolCreditIds:string[]}>(page,`/billing/contracts/${contract.id}/cancel`,()=>review(page,'Kelishuv oqibatlarini tasdiqlang').getByRole('button',{name:'Tasdiqlash',exact:true}).click());expect(cancelled.schoolCreditIds).toHaveLength(1);const creditId=cancelled.schoolCreditIds[0]!;
 const grant=await readData<SchoolCredit>(await page.request.get(`/api/v1/billing/school-credits/${creditId}`));expect(grant.amountMinor).toBe('31613');expect(grant.allocatedMinor).toBe('0');expect(grant.unallocatedMinor).toBe('31613');
 await page.getByRole('link',{name:'Tushumlar va avans',exact:true}).first().click();await expect(page.getByRole('table',{name:'Har bir kreditning original shartnoma va invoice asosi'}).getByText(creditId,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Qoldiq kiritish',exact:true}).click();await page.locator('#opening-company').selectOption(company);await page.locator('#opening-amount').fill('10000');await page.locator('#opening-date').fill('2026-10-01');await page.locator('#opening-due').fill('2026-10-08');await page.locator('#opening-reason').fill('Synthetic explicitly verified opening debt');await page.getByRole('button',{name:'Qoldiq reviewini olish'}).click();const target=await committed<Invoice>(page,'/billing/opening-balances',()=>review(page,'Boshlang‘ich qarzni tasdiqlang').getByRole('button',{name:'Tasdiqlash',exact:true}).click());
 await page.getByRole('table',{name:'Har bir kreditning original shartnoma va invoice asosi'}).getByRole('row').filter({hasText:creditId}).getByRole('button',{name:'Kreditni taqsimlash'}).click();await page.getByLabel(`${target.id} pulsiz kredit taqsimoti`,{exact:true}).fill('10000');await page.getByRole('button',{name:'Pulsiz kredit taqsimotini review qilish'}).click();await expect(review(page,'Pulsiz kredit taqsimoti oqibatlari').getByText('Pulsiz maktab krediti',{exact:true})).toBeVisible();
 const allocated=await committed<SchoolCredit>(page,`/billing/school-credits/${creditId}/allocations`,()=>review(page,'Pulsiz kredit taqsimoti oqibatlari').getByRole('button',{name:'Tasdiqlash',exact:true}).click());expect(allocated.amountMinor).toBe('31613');expect(allocated.allocatedMinor).toBe('10000');expect(allocated.unallocatedMinor).toBe('21613');
 const final=await readData<Invoice&{receiptAllocatedMinor:string;creditAllocatedMinor:string}>(await page.request.get(`/api/v1/billing/invoices/${target.id}`));expect(final.outstandingMinor).toBe('0');expect(final.creditAllocatedMinor).toBe('10000');expect(final.receiptAllocatedMinor).toBe('0');
 const receipts=await readData<{items:Payment[]}>(await page.request.get(`/api/v1/billing/payments?environment=synthetic&companyId=${company}`));expect(receipts.items).toEqual([]);const credits=await readData<{items:{companyId:string;receiptCreditMinor:string;nonCashCreditMinor:string}[]}>(await page.request.get(`/api/v1/billing/credits?environment=synthetic&companyId=${company}`));expect(credits.items[0]?.receiptCreditMinor).toBe('0');expect(credits.items[0]?.nonCashCreditMinor).toBe('21613');
});
