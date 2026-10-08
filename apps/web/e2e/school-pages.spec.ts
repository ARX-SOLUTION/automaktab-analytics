import {test,expect} from '@playwright/test';

test('owner reaches later branches and opaque subjects without counting a subset as the whole school',async({page})=>{
 const company='synthetic-school-2',meta={requestId:'synthetic-school-pages',apiVersion:1,status:'fresh'};
 const branches=Array.from({length:52},(_,index)=>({id:`branch-${index+1}`,name:`Filial ${index+1}`,status:'active'}));
 const subjects=Array.from({length:52},(_,index)=>({id:`opaque-${index+1}`,branchId:branches[index]?.id,status:'active',eligibleFrom:'2026-10-01'}));
 const reply=(data:unknown)=>({status:200,contentType:'application/json',body:JSON.stringify({data,meta})});
 await page.route(`**/api/v1/schools/${company}?*`,route=>route.fulfill(reply({id:company,name:'Sintetik sahifalangan maktab',status:'active',branches:branches.slice(0,50),branchesCount:52,activeStudents:52,outstandingMinor:null,dataThrough:'2026-10-08T00:00:00Z'})));
 await page.route(`**/api/v1/schools/${company}/branches?*`,route=>{const cursor=new URL(route.request().url()).searchParams.get('cursor');return route.fulfill(reply({items:cursor?branches.slice(50):branches.slice(0,50),nextCursor:cursor?null:'branch-50'}));});
 await page.route(`**/api/v1/schools/${company}/billing-subjects?*`,route=>{const cursor=new URL(route.request().url()).searchParams.get('cursor');return route.fulfill(reply({items:cursor?subjects.slice(50):subjects.slice(0,50),nextCursor:cursor?null:'opaque-50'}));});
 await page.goto(`/schools/${company}?from=2026-10-01&to=2026-11-01`);await page.getByRole('button',{name:'Sinov egasi sifatida kirish'}).click();
 const branchPanel=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Filiallar',exact:true})});const subjectPanel=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Billing hisoblash subyektlari',exact:true})});
 await expect(branchPanel.getByText('Filial 50',{exact:true})).toBeVisible();await branchPanel.getByRole('button',{name:'Keyingi sahifa'}).click();await expect(branchPanel.getByText('Filial 51',{exact:true})).toBeVisible();await expect(branchPanel.getByText('Filial 1',{exact:true})).toHaveCount(0);await expect(branchPanel.getByRole('button',{name:'Keyingi sahifa'})).toBeDisabled();
 await subjectPanel.getByRole('button',{name:'Keyingi sahifa'}).click();await expect(subjectPanel.getByText('opaque-52',{exact:true})).toBeVisible();await subjectPanel.getByRole('button',{name:'Oldingi sahifa'}).click();await expect(subjectPanel.getByText('opaque-1',{exact:true})).toBeVisible();
 await branchPanel.getByRole('row').filter({hasText:'Filial 51'}).getByRole('button',{name:'Filial foydalanishi'}).click();await expect(page).toHaveURL(/\/usage\?.*companyId=synthetic-school-2.*branchId=branch-51/);await expect(page.getByLabel('Filial',{exact:true})).toHaveValue('branch-51');
});
