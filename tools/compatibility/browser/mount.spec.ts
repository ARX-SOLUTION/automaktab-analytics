import {test,expect} from '@playwright/test';
test('React production mount displays synthetic label and keyboard title',async({page})=>{await page.goto('/');await expect(page.getByRole('heading',{name:'Synthetic environment'})).toBeVisible();await page.keyboard.press('Tab');await expect(page.getByRole('heading')).toBeFocused();});
