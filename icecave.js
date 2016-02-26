const Immutable = require('immutable');
const fs = require('fs');

const data = (() => {
  try {
    return require('./data/icecave.json');
  } catch(e) {
    return [];
  }
})();

let core = Immutable.fromJS(data);

const unpack = (item) => {
  return item.toJS ? item.toJS() : item;
};

const push = (val) => {
  core = core.push(Immutable.fromJS(val));
  return core.size - 1;
};
const remove = (index) => {
  core = core.delete(index);
};
const set = (index, val) => {
  core = core.set(index, Immutable.fromJS(val));
};
const get = (index) => unpack(core.get(index));
const find = (fn) => unpack(core.find((item) => fn(unpack(item))));
const filter = (fn) => unpack(core.filter((item) => fn(unpack(item))));
const first = () => unpack(core.first());
const last = () => unpack(core.last());

const write = () => {
  fs.writeFile('./data/icecave.json', JSON.stringify(core.toJS()));
};

setInterval(write, 1000);

module.exports = {
  push,
  remove,
  get: get,
  set: set,
  find,
  filter,
  first,
  last,
};

