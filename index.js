#!/usr/bin/env node

const LandsProcessor = require('./src/lands-processor');

if (require.main === module) {
  const htmlFilePath = process.argv[2] || 'dist/index.html';
  const processor = new LandsProcessor(htmlFilePath);
  processor.process().catch((err) => console.error(err));
}
