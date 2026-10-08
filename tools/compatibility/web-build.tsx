import { createRoot } from 'react-dom/client';
const target=document.getElementById('root');
if (!target) throw new Error('Missing mount');
createRoot(target).render(<main><h1 tabIndex={0}>Synthetic environment</h1><p>Internal compatibility fixture</p></main>);
