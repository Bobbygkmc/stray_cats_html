const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createReport,
  filterReports,
  getStatusLabel,
  SAMPLE_REPORTS,
} = require('../app.js');

test('createReport normalizes a missing-cat report with tags and coordinates', () => {
  const report = createReport({
    name: 'Miso',
    status: 'missing',
    description: 'Orange tabby with white paws',
    tags: ['urgent', 'has-collar', 'urgent'],
    lastSeen: '2026-07-14',
    locationName: 'Warrington Township',
    lat: '40.2501',
    lng: '-75.1349',
    contact: 'Call the number on the flyer',
  });

  assert.equal(report.name, 'Miso');
  assert.equal(report.status, 'missing');
  assert.deepEqual(report.tags, ['urgent', 'has-collar']);
  assert.equal(report.coordinates.lat, 40.2501);
  assert.equal(report.coordinates.lng, -75.1349);
  assert.match(report.id, /^cat-/);
});

test('createReport rejects coordinates outside map bounds', () => {
  assert.throws(
    () => createReport({ name: 'Bad pin', status: 'stray', lat: '999', lng: '-75' }),
    /valid latitude and longitude/
  );
});

test('filterReports filters by status, tag, and search text', () => {
  const results = filterReports(SAMPLE_REPORTS, {
    status: 'missing',
    tag: 'urgent',
    query: 'tabby',
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Miso');
});

test('getStatusLabel returns readable labels for public UI', () => {
  assert.equal(getStatusLabel('found'), 'Found / safe');
  assert.equal(getStatusLabel('sighted'), 'Sighted');
});
