import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  console.log(`MatSlot API listening on http://localhost:${config.port}`);
});

// Log instead of crashing on stray async errors
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
