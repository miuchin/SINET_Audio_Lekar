import crypto from 'node:crypto';

export function isEmpty(v){
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

export function sha256OfString(s){
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

export function safeSet(obj, path, value){
  // path: 'mkb10.sifra'
  const parts = String(path).split('.').filter(Boolean);
  if (!parts.length) return false;

  let cur = obj;
  for (let i=0;i<parts.length-1;i++){
    const k = parts[i];
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  const last = parts[parts.length-1];
  if (!isEmpty(cur[last])) return false;
  cur[last] = value;
  return true;
}

export function ensureArray(obj, key){
  if (!obj[key]) obj[key] = [];
  if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
  return obj[key];
}
