import { parentPort,workerData } from 'node:worker_threads';
import { openDb } from '../../src/db.js';
import { purchase } from '../../src/purchases.js';
const db=openDb(workerData.path);
try {purchase(db,workerData.eventId,{buyerEmail:'race@example.com',cardNumber:'4000000000000001'});parentPort.postMessage(202);}
catch(error){parentPort.postMessage(error.status || error.message);}
finally{db.close();}
