import { ensureArray } from './utils.js';

export function appendAudit(stl, entry){
  if (!stl.meta) stl.meta = {};
  const arr = ensureArray(stl.meta, 'audit');
  arr.push(entry);
}
