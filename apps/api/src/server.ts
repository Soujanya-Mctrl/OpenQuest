import app from './app';
import { config } from './config/env';

app.listen(config.PORT, () => {
    console.log(`🚀 API running on port ${config.PORT}`);
});

// startRagWorker();
