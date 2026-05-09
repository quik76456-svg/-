import { startWorkers } from "../src/server/queue/worker";

startWorkers();

setInterval(() => {}, 1 << 30);

