import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./browser',workers:1,use:{baseURL:'http://127.0.0.1:4173',headless:true},webServer:{command:'pnpm exec vite preview --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:false}});
