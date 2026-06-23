'use strict';
/* Populate the database with sample garage data. Run: npm run seed */
const repo = require('./db');
repo.init();

const today = new Date().toISOString().slice(0, 10);

// Wipe existing rows so the seed is idempotent.
repo.db.exec('DELETE FROM job_lines; DELETE FROM jobs; DELETE FROM vehicles; DELETE FROM customers; DELETE FROM techs;');

repo.updateSettings({ rate: 95, currency: '$', tax: 8 });
['Sam Rivera', 'Dana Cole', 'Mike Tran'].forEach(repo.addTech);

const alice = repo.createCustomer({ name: 'Alice Johnson', phone: '+1 555 0101', email: 'alice@example.com', notes: 'Prefers SMS reminders.' });
const bob = repo.createCustomer({ name: 'Bob Martinez', phone: '+1 555 0142', email: 'bob.m@example.com' });
const fleet = repo.createCustomer({ name: 'Fleet Co. (Account)', phone: '+1 555 0199', email: 'ops@fleetco.com', notes: 'Net-30 billing.' });

const corolla = repo.createVehicle({ customerId: alice.id, year: '2019', make: 'Toyota', model: 'Corolla', plate: 'JKL-204', colour: 'Silver', vin: 'JTDBR32E930012345' });
const ford = repo.createVehicle({ customerId: bob.id, year: '2016', make: 'Ford', model: 'F-150', plate: 'TRK-880', colour: 'Blue', vin: '1FTFW1EF6GFA12345' });
const sprinter = repo.createVehicle({ customerId: fleet.id, year: '2021', make: 'Mercedes', model: 'Sprinter', plate: 'FLT-012', colour: 'White', vin: 'WD3PE8CD5K1234567' });

repo.createJob({
  customerId: alice.id, vehicleId: corolla.id, title: 'Brake noise + 60k service', status: 'progress',
  tech: 'Sam Rivera', priority: 'high', odo: 61200, dateIn: today, dueDate: today, notes: 'Front pads worn to 2mm. Rotors within spec.',
  parts: [{ desc: 'Front brake pad set', qty: 1, price: 78 }, { desc: 'Oil filter', qty: 1, price: 12 }, { desc: 'Engine oil 5W-30', qty: 5, price: 9 }],
  labour: [{ desc: 'Brake pad replacement', qty: 1.5, price: 95 }, { desc: 'Major service', qty: 1, price: 95 }],
});
repo.createJob({
  customerId: bob.id, vehicleId: ford.id, title: 'Check engine light — misfire', status: 'parts',
  tech: 'Dana Cole', priority: 'urgent', odo: 98450, dateIn: today, notes: 'Cyl 3 misfire. Coil pack on order.',
  parts: [{ desc: 'Ignition coil', qty: 1, price: 64 }, { desc: 'Spark plug set', qty: 1, price: 42 }],
  labour: [{ desc: 'Diagnostics', qty: 1, price: 95 }],
});
repo.createJob({
  customerId: fleet.id, vehicleId: sprinter.id, title: 'Fleet inspection + tyre rotation', status: 'booked',
  priority: 'normal', odo: 34500, dateIn: today,
  labour: [{ desc: 'Safety inspection', qty: 1, price: 95 }, { desc: 'Tyre rotation', qty: 0.5, price: 95 }],
});
repo.createJob({
  customerId: alice.id, vehicleId: corolla.id, title: 'AC not cooling', status: 'ready',
  tech: 'Mike Tran', priority: 'normal', odo: 60900, dateIn: today, dueDate: today, notes: 'Recharged refrigerant, leak test passed.',
  parts: [{ desc: 'R-134a refrigerant', qty: 1, price: 35 }],
  labour: [{ desc: 'AC service', qty: 1, price: 95 }],
});

const s = repo.getState();
console.log(`🌱 Seeded ${s.customers.length} customers, ${s.vehicles.length} vehicles, ${s.jobs.length} jobs.`);
