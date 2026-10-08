import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {Review,type Preview} from '../src/app/billing.js';

it('shows every released allocation before the owner confirms a correction',()=>{
 const preview:Preview={previewId:'review',previewHash:'hash',ledgerRevision:'3',expiresAt:'2026-10-08T12:00:00Z',canCommit:true,blockers:[],input:{},consequences:{releasedAllocations:Array.from({length:101},(_,index)=>({paymentId:`receipt-${index+1}`,amountMinor:'10'})),creditIncreaseMinor:'1010'}};
 const html=renderToStaticMarkup(createElement(Review,{preview,title:'Correction oqibatlari',onConfirm:()=>undefined,onCancel:()=>undefined,busy:false,blocked:false}));
 expect(html).toContain('receipt-101');
 expect((html.match(/receipt-\d+/g)??[])).toHaveLength(101);
});

it('shows cancellation entitlement and released non-cash allocations separately from receipts',()=>{
 const preview:Preview={previewId:'credit-review',previewHash:'hash',ledgerRevision:'4',expiresAt:'2026-10-08T12:00:00Z',canCommit:true,blockers:[],input:{creditId:'grant-original'},consequences:{credit:{id:'grant-original',invoiceId:'origin-invoice',amountMinor:'40000',allocatedMinor:'10000',unallocatedMinor:'30000'},releasedCreditAllocations:[{creditId:'released-grant',invoiceId:'target-invoice',amountMinor:'2000'}],appliedCreditMinor:'10000',excessCreditMinor:'30000'}};
 const html=renderToStaticMarkup(createElement(Review,{preview,title:'Kredit taqsimoti',onConfirm:()=>undefined,onCancel:()=>undefined,busy:false,blocked:false}));
 expect(html).toContain('grant-original');expect(html).toContain('origin-invoice');expect(html).toContain('released-grant');expect(html).toContain('target-invoice');
 expect(html).toContain('Pulsiz maktab krediti');expect(html).toContain('Chiqariladigan kredit taqsimotlari');
});
