import {createRoot} from 'react-dom/client';
import {App} from './app/App.js';
const root=document.getElementById('root');if(!root)throw new Error('ROOT_MISSING');createRoot(root).render(<App/>);
