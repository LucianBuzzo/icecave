const Icecave = require('./icecave');
let toggle = false;

console.log(Icecave.filter(item => true));

Icecave.push('ping');

setInterval(() => {
  Icecave.push(toggle ? 'ping' : 'pong');
  toggle = !toggle;
  console.log(Icecave.filter(item => true));
}, 2000);

const PLAYER_1 = 0;
const PLAYER_2 = 1;

Icecave.get(PLAYER_1);
