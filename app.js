(function (root) {
  'use strict';

  const STORAGE_KEY = 'strayCatsLocatorReports.v1';
  const DEFAULT_CENTER = [40.2501, -75.1349];
  const STATUS_LABELS = {
    missing: 'Missing',
    found: 'Found / safe',
    stray: 'Stray',
    sighted: 'Sighted',
  };

  const TAG_LABELS = {
    urgent: 'Urgent',
    injured: 'Injured',
    friendly: 'Friendly',
    feral: 'Feral',
    kitten: 'Kitten',
    'has-collar': 'Has collar',
    'needs-food': 'Needs food',
    'microchip-unknown': 'Microchip unknown',
  };

  const SAMPLE_REPORTS = [
    {
      id: 'cat-sample-miso',
      name: 'Miso',
      status: 'missing',
      description: 'Orange tabby with white paws. Skittish but food-motivated. Last seen near a tree line.',
      tags: ['urgent', 'has-collar'],
      lastSeen: '2026-07-10',
      locationName: 'Warrington Township, PA',
      coordinates: { lat: 40.2501, lng: -75.1349 },
      contact: 'Text/call the number on the missing cat flyer.',
      createdAt: '2026-07-10T14:00:00.000Z',
      approximate: true,
    },
    {
      id: 'cat-sample-pepper',
      name: 'Pepper',
      status: 'sighted',
      description: 'Black-and-white cat crossing behind the shops. Looked healthy and avoided people.',
      tags: ['friendly'],
      lastSeen: '2026-07-12',
      locationName: 'Chalfont, PA',
      coordinates: { lat: 40.2884, lng: -75.2091 },
      contact: 'No contact listed. Add an update if you recognize this cat.',
      createdAt: '2026-07-12T16:30:00.000Z',
      approximate: true,
    },
    {
      id: 'cat-sample-luna',
      name: 'Unknown gray kitten',
      status: 'stray',
      description: 'Small gray kitten sheltering near a porch. May need food and rescue support.',
      tags: ['kitten', 'needs-food'],
      lastSeen: '2026-07-13',
      locationName: 'Doylestown, PA',
      coordinates: { lat: 40.3101, lng: -75.1299 },
      contact: 'Coordinate with a local rescue before trapping or transport.',
      createdAt: '2026-07-13T11:20:00.000Z',
      approximate: true,
    },
  ];

  let map;
  let markerLayer;
  let reports = [];

  function uniqueTags(tags) {
    return [...new Set(
      (Array.isArray(tags) ? tags : [])
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean)
    )];
  }

  function parseCoordinate(value, name) {
    const number = typeof value === 'number' ? value : Number.parseFloat(String(value || '').trim());
    if (!Number.isFinite(number)) {
      throw new Error(`Enter a valid latitude and longitude. ${name} is missing.`);
    }
    return number;
  }

  function validateCoordinates(lat, lng) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Enter a valid latitude and longitude within map bounds.');
    }
  }

  function createReport(input) {
    const status = String(input.status || '').trim().toLowerCase();
    if (!STATUS_LABELS[status]) {
      throw new Error('Choose a valid report status.');
    }

    const lat = parseCoordinate(input.lat, 'Latitude');
    const lng = parseCoordinate(input.lng, 'Longitude');
    validateCoordinates(lat, lng);

    const description = String(input.description || '').trim();
    if (description.length < 8) {
      throw new Error('Add a short description so neighbors know what to look for.');
    }

    return {
      id: input.id || `cat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: String(input.name || 'Unknown cat').trim() || 'Unknown cat',
      status,
      description,
      tags: uniqueTags(input.tags),
      lastSeen: String(input.lastSeen || '').trim(),
      locationName: String(input.locationName || 'Approximate area').trim() || 'Approximate area',
      coordinates: { lat, lng },
      contact: String(input.contact || 'No public contact listed.').trim() || 'No public contact listed.',
      createdAt: input.createdAt || new Date().toISOString(),
      approximate: input.approximate !== false,
    };
  }

  function getStatusLabel(status) {
    return STATUS_LABELS[status] || 'Unknown';
  }

  function filterReports(sourceReports, filters) {
    const status = filters?.status || 'all';
    const tag = filters?.tag || 'all';
    const query = String(filters?.query || '').trim().toLowerCase();

    return sourceReports.filter((report) => {
      if (status !== 'all' && report.status !== status) return false;
      if (tag !== 'all' && !report.tags.includes(tag)) return false;
      if (query) {
        const haystack = [
          report.name,
          report.description,
          report.locationName,
          getStatusLabel(report.status),
          report.tags.join(' '),
        ].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  function loadReports() {
    try {
      const raw = root.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return SAMPLE_REPORTS.slice();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : SAMPLE_REPORTS.slice();
    } catch (_error) {
      return SAMPLE_REPORTS.slice();
    }
  }

  function saveReports(nextReports) {
    root.localStorage?.setItem(STORAGE_KEY, JSON.stringify(nextReports));
  }

  function formatDate(value) {
    if (!value) return 'Date unknown';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }[char]));
  }

  function getFilters() {
    return {
      status: document.querySelector('#statusFilter')?.value || 'all',
      tag: document.querySelector('#tagFilter')?.value || 'all',
      query: document.querySelector('#searchInput')?.value || '',
    };
  }

  function renderStats(visibleReports) {
    const total = document.querySelector('#totalReports');
    const missing = document.querySelector('#missingReports');
    const urgent = document.querySelector('#urgentReports');
    if (!total || !missing || !urgent) return;
    total.textContent = String(reports.length);
    missing.textContent = String(reports.filter((report) => report.status === 'missing').length);
    urgent.textContent = String(reports.filter((report) => report.tags.includes('urgent')).length);
    const counter = document.querySelector('#visibleReports');
    if (counter) counter.textContent = `${visibleReports.length} visible`;
  }

  function reportPopup(report) {
    return `
      <strong>${escapeHtml(report.name)}</strong><br>
      <span>${escapeHtml(getStatusLabel(report.status))}</span><br>
      <small>${escapeHtml(report.locationName)} · ${escapeHtml(formatDate(report.lastSeen))}</small>
    `;
  }

  function focusReport(id) {
    const report = reports.find((item) => item.id === id);
    if (!report || !map) return;
    map.setView([report.coordinates.lat, report.coordinates.lng], 14);
    markerLayer?.eachLayer((marker) => {
      if (marker.options.reportId === id) marker.openPopup();
    });
  }

  function renderMapMarkers(visibleReports) {
    if (!map || !markerLayer || typeof root.L === 'undefined') return;
    markerLayer.clearLayers();
    visibleReports.forEach((report) => {
      const marker = root.L.marker([report.coordinates.lat, report.coordinates.lng], {
        reportId: report.id,
        icon: root.L.divIcon({
          className: `cat-marker cat-marker--${report.status}`,
          html: '<span aria-hidden="true">CAT</span>',
          iconSize: [42, 42],
          iconAnchor: [21, 21],
          popupAnchor: [0, -18],
        }),
      })
        .bindPopup(reportPopup(report));
      markerLayer.addLayer(marker);
    });
  }

  function reportCard(report) {
    const tagHtml = report.tags.map((tag) => `<span class="tag">${escapeHtml(TAG_LABELS[tag] || tag)}</span>`).join('');
    return `
      <article class="report-card">
        <div class="report-card-topline">
          <span class="status-pill status-${report.status}">${escapeHtml(getStatusLabel(report.status))}</span>
          <span class="date">${escapeHtml(formatDate(report.lastSeen))}</span>
        </div>
        <h3>${escapeHtml(report.name)}</h3>
        <p>${escapeHtml(report.description)}</p>
        <div class="tag-row">${tagHtml || '<span class="tag muted">No tags</span>'}</div>
        <dl>
          <div><dt>Area</dt><dd>${escapeHtml(report.locationName)}</dd></div>
          <div><dt>Contact</dt><dd>${escapeHtml(report.contact)}</dd></div>
        </dl>
        <button class="ghost-button focus-report" type="button" data-id="${escapeHtml(report.id)}">Focus on map</button>
      </article>
    `;
  }

  function renderReports() {
    const visibleReports = filterReports(reports, getFilters());
    const list = document.querySelector('#reportList');
    if (list) {
      list.innerHTML = visibleReports.length
        ? visibleReports.map(reportCard).join('')
        : '<p class="empty-state">No reports match those filters. Try clearing a filter or adding a new sighting.</p>';
      list.querySelectorAll('.focus-report').forEach((button) => {
        button.addEventListener('click', () => focusReport(button.dataset.id));
      });
    }
    renderStats(visibleReports);
    renderMapMarkers(visibleReports);
  }

  function readForm(form) {
    const data = new root.FormData(form);
    return {
      name: data.get('name'),
      status: data.get('status'),
      description: data.get('description'),
      tags: data.getAll('tags'),
      lastSeen: data.get('lastSeen'),
      locationName: data.get('locationName'),
      lat: data.get('lat'),
      lng: data.get('lng'),
      contact: data.get('contact'),
      approximate: data.get('approximate') === 'on',
    };
  }

  function setMessage(text, type) {
    const message = document.querySelector('#formMessage');
    if (!message) return;
    message.textContent = text;
    message.className = `form-message ${type || ''}`.trim();
  }

  function handleSubmit(event) {
    event.preventDefault();
    try {
      const report = createReport(readForm(event.currentTarget));
      reports = [report, ...reports];
      saveReports(reports);
      event.currentTarget.reset();
      const approx = document.querySelector('#approximate');
      if (approx) approx.checked = true;
      setMessage('Report added locally. It is saved in this browser for the MVP prototype.', 'success');
      renderReports();
      focusReport(report.id);
    } catch (error) {
      setMessage(error.message, 'error');
    }
  }

  function useMapClickForCoordinates() {
    if (!map) return;
    map.on('click', (event) => {
      const lat = document.querySelector('#lat');
      const lng = document.querySelector('#lng');
      if (lat && lng) {
        lat.value = event.latlng.lat.toFixed(5);
        lng.value = event.latlng.lng.toFixed(5);
        setMessage('Map pin copied into the report form. Use approximate locations for private homes.', 'info');
      }
    });
  }

  function initMap() {
    if (typeof root.L === 'undefined') return;
    map = root.L.map('map').setView(DEFAULT_CENTER, 11);
    root.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    markerLayer = root.L.layerGroup().addTo(map);
    useMapClickForCoordinates();
    root.setTimeout(() => map.invalidateSize(), 100);
  }

  function initApp() {
    reports = loadReports();
    initMap();
    document.querySelector('#reportForm')?.addEventListener('submit', handleSubmit);
    ['#statusFilter', '#tagFilter', '#searchInput'].forEach((selector) => {
      document.querySelector(selector)?.addEventListener('input', renderReports);
    });
    document.querySelector('#resetDemo')?.addEventListener('click', () => {
      reports = SAMPLE_REPORTS.slice();
      saveReports(reports);
      setMessage('Demo reports restored.', 'info');
      renderReports();
    });
    renderReports();
  }

  const api = {
    SAMPLE_REPORTS,
    createReport,
    filterReports,
    getStatusLabel,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.StrayCatsApp = api;
    document.addEventListener('DOMContentLoaded', initApp);
  }
})(typeof window !== 'undefined' ? window : globalThis);
