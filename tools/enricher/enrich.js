#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { sha256OfString } from './lib/utils.js';
import { appendAudit } from './lib/audit.js';

import * as mkb10_local from './providers/mkb10_local.js';
import * as freq_notes_local from './providers/freq_notes_local.js';
import * as notes_file from './providers/notes_file.js';

const TOOL = 'sinet-enricher';
const TOOL_VERSION = '0.1.0';

function parseArgs(argv){
  const args = { in: '', out: '', providers: '', dryRun: false };
  for (let i=2;i<argv.length;i++) {
    const a = argv[i];
    if (a === '--dry-run') { args.dryRun = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i+1] && !argv[i+1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

function loadJson(p){
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJson(p, data){
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeProviders(list){
  const registry = {
    [mkb10_local.id]: mkb10_local,
    [freq_notes_local.id]: freq_notes_local,
    [notes_file.id]: notes_file
  };

  if (!list) return Object.values(registry);
  const ids = list.split(',').map(s=>s.trim()).filter(Boolean);
  return ids.map(id => registry[id]).filter(Boolean);
}

function isSTL(obj){
  return obj && typeof obj === 'object' && Array.isArray(obj.simptomi) && obj.meta;
}

async function main(){
  const args = parseArgs(process.argv);
  const inFile = args.in || args.input || '';
  const outFile = args.out || args.output || '';

  if (!inFile || !outFile) {
    console.log(`Usage: node tools/enricher/enrich.js --in data/SINET_STL.json --out data/SINET_STL.enriched.json [--notes data/ENRICH_NOTES.json] [--providers a,b] [--dry-run]`);
    process.exit(1);
  }

  const stl = loadJson(inFile);
  if (!isSTL(stl)) {
    console.error('Input is not STL (expected {meta, simptomi[]}).');
    process.exit(2);
  }

  const providers = normalizeProviders(args.providers);
  const ctx = {
    now: new Date().toISOString(),
    inFile,
    outFile,
    notesFile: args.notes || args.notesFile || '',
    tool: TOOL,
    toolVersion: TOOL_VERSION
  };

  const rawText = fs.readFileSync(inFile, 'utf8');
  const inputHash = sha256OfString(rawText);

  let updatedSymptoms = 0;
  let touchedFields = 0;

  for (const s of stl.simptomi) {
    let changed = false;
    for (const p of providers) {
      try {
        const r = await p.enrichSymptom(s, ctx);
        if (r?.changed) {
          changed = true;
          touchedFields += 1;
        }
      } catch (e) {
        // keep going
      }
    }
    if (changed) updatedSymptoms += 1;
  }

  appendAudit(stl, {
    ts: new Date().toISOString(),
    tool: TOOL,
    toolVersion: TOOL_VERSION,
    mode: 'enrich',
    providers: providers.map(p=>p.id),
    input: inFile,
    output: outFile,
    inputHash,
    summary: {
      simptomi: stl.simptomi.length,
      updated: updatedSymptoms,
      touched: touchedFields,
      skipped: stl.simptomi.length - updatedSymptoms
    }
  });

  if (!args.dryRun) {
    saveJson(outFile, stl);
  }

  console.log(JSON.stringify({
    ok: true,
    input: inFile,
    output: outFile,
    dryRun: !!args.dryRun,
    providers: providers.map(p=>p.id),
    simptomi: stl.simptomi.length,
    updated: updatedSymptoms,
    touched: touchedFields
  }, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(99);
});
