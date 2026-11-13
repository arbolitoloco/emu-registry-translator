/*
 * builder.js
 *
 * Drives the "Build a Registry Entry" tool: a form where an admin picks a
 * scope (User/Group), a name, a permission type, and fills in type-specific
 * fields (table, column, privileges, etc.) via dropdowns/checkboxes. The
 * form is entirely generated from registryDefinitions.js, so adding a new
 * entry type there automatically gets a form + preview + export here too.
 */

(function () {
  'use strict';

  const els = {
    scope: document.getElementById('builderScope'),
    name: document.getElementById('builderName'),
    nameList: document.getElementById('builderNameList'),
    entryType: document.getElementById('builderEntryType'),
    dynamicFields: document.getElementById('builderDynamicFields'),
    preview: document.getElementById('builderPreview'),
    addBtn: document.getElementById('builderAddBtn'),
    list: document.getElementById('builderList'),
    exportBtn: document.getElementById('builderExportBtn'),
    clearBtn: document.getElementById('builderClearBtn'),
    warning: document.getElementById('builderWarning'),
  };

  // { id, keys: [...], value, pipe, description }
  let builderEntries = [];
  let entryCounter = 0;

  // ---------------------------------------------------------------------
  // Populate the "what do you want to configure" dropdown from the shared
  // entry type definitions.
  // ---------------------------------------------------------------------
  function populateEntryTypeSelect() {
    els.entryType.innerHTML = '';
    RegistryDefs.ENTRY_TYPES.forEach((type) => {
      const opt = document.createElement('option');
      opt.value = type.id;
      opt.textContent = type.label;
      els.entryType.appendChild(opt);
    });
  }

  function populateScopeOptions() {
    updateScopeAvailability();
  }

  function updateScopeAvailability() {
    const type = currentEntryType();
    const scopeOptions = els.scope.querySelectorAll('option');
    scopeOptions.forEach((opt) => {
      opt.disabled = !type.scopes.includes(opt.value);
    });
    if (!type.scopes.includes(els.scope.value)) {
      els.scope.value = type.scopes[0];
    }
  }

  function currentEntryType() {
    return RegistryDefs.ENTRY_TYPES.find((t) => t.id === els.entryType.value);
  }

  // ---------------------------------------------------------------------
  // Small field-building helpers
  // ---------------------------------------------------------------------
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  }

  function tableSelectField(id, labelText, includeDefault) {
    const wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', { for: id, text: labelText }));
    const select = el('select', { id, class: 'table-select' });
    if (includeDefault) {
      select.appendChild(el('option', { value: 'Default', text: 'All modules (Default)' }));
    }
    RegistryDefs.COMMON_TABLES.forEach((t) => {
      select.appendChild(el('option', { value: t.value, text: `${t.label} (${t.value})` }));
    });
    select.appendChild(el('option', { value: '__other__', text: 'Other (type below)…' }));
    wrap.appendChild(select);

    const otherInput = el('input', {
      type: 'text',
      id: `${id}Other`,
      placeholder: 'back-end table name, e.g. ecatalogue',
      style: 'display:none;margin-top:4px;',
    });
    wrap.appendChild(otherInput);

    select.addEventListener('change', () => {
      otherInput.style.display = select.value === '__other__' ? 'block' : 'none';
      renderPreview();
    });
    otherInput.addEventListener('input', renderPreview);

    wrap.getValue = () => (select.value === '__other__' ? otherInput.value.trim() : select.value);
    return wrap;
  }

  function textField(id, labelText, placeholder) {
    const wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', { for: id, text: labelText }));
    const input = el('input', { type: 'text', id, placeholder: placeholder || '' });
    input.addEventListener('input', renderPreview);
    wrap.appendChild(input);
    wrap.getValue = () => input.value.trim();
    return wrap;
  }

  function textAreaField(id, labelText, placeholder, hint) {
    const wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', { for: id, text: labelText }));
    const textarea = el('textarea', { id, placeholder: placeholder || '', rows: '2' });
    textarea.addEventListener('input', renderPreview);
    wrap.appendChild(textarea);
    if (hint) wrap.appendChild(el('p', { class: 'field-hint', text: hint }));
    wrap.getValue = () => textarea.value.trim();
    return wrap;
  }

  function matchValueField(id, labelText) {
    const wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', { for: id, text: labelText }));
    const input = el('input', { type: 'text', id, placeholder: 'a value, or NULL / NOT NULL' });
    input.addEventListener('input', renderPreview);
    const quick = el('div', { class: 'quick-buttons' });
    ['NULL', 'NOT NULL'].forEach((v) => {
      const btn = el('button', { type: 'button', class: 'chip', text: v });
      btn.addEventListener('click', () => {
        input.value = v;
        renderPreview();
      });
      quick.appendChild(btn);
    });
    wrap.appendChild(input);
    wrap.appendChild(quick);
    wrap.getValue = () => input.value.trim();
    return wrap;
  }

  // Privilege checkbox picker, with an optional preset dropdown and
  // category grouping. Returns wrap.getValue() -> array of selected ids.
  function privilegePickerField(id, labelText, privs, presets, opts) {
    opts = opts || {};
    const wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', { text: labelText }));

    let presetSelect = null;
    if (presets) {
      presetSelect = el('select', { id: `${id}Preset` });
      presetSelect.appendChild(el('option', { value: '', text: 'Custom selection…' }));
      Object.entries(presets).forEach(([key, preset]) => {
        presetSelect.appendChild(el('option', { value: key, text: preset.label }));
      });
      wrap.appendChild(presetSelect);
    }

    const categories = {};
    privs.forEach((p) => {
      const cat = p.category || 'General';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p);
    });

    const checkboxRefs = {};
    const checksContainer = el('div', { class: 'priv-checks' });
    Object.entries(categories).forEach(([cat, list]) => {
      checksContainer.appendChild(el('div', { class: 'priv-category-label', text: cat }));
      list.forEach((p) => {
        const cbId = `${id}_${p.id}`;
        const row = el('label', { class: 'priv-row', for: cbId, title: p.description });
        const cb = el('input', { type: 'checkbox', id: cbId, value: p.id });
        cb.addEventListener('change', () => {
          if (presetSelect) presetSelect.value = '';
          renderPreview();
        });
        checkboxRefs[p.id] = cb;
        row.appendChild(cb);
        row.appendChild(document.createTextNode(' ' + p.label));
        if (p.requiresTable) {
          row.appendChild(el('span', { class: 'note', text: ` (requires Table = ${p.requiresTable})` }));
        }
        checksContainer.appendChild(row);
      });
    });
    wrap.appendChild(checksContainer);

    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        const chosen = presets[presetSelect.value];
        Object.values(checkboxRefs).forEach((cb) => (cb.checked = false));
        if (chosen) {
          chosen.privs.forEach((id2) => {
            if (checkboxRefs[id2]) checkboxRefs[id2].checked = true;
          });
        }
        renderPreview();
      });
    }

    wrap.getValue = () =>
      Object.entries(checkboxRefs)
        .filter(([, cb]) => cb.checked)
        .map(([id2]) => id2);
    return wrap;
  }

  // ---------------------------------------------------------------------
  // Build the dynamic field set for the currently selected entry type.
  // Each field wrapper exposes getValue(); we store references on
  // `currentFields` so renderPreview()/addEntry() can read them.
  // ---------------------------------------------------------------------
  let currentFields = {};

  function renderDynamicFields() {
    els.dynamicFields.innerHTML = '';
    currentFields = {};
    const type = currentEntryType();

    function add(key, node) {
      currentFields[key] = node;
      els.dynamicFields.appendChild(node);
    }

    switch (type.id) {
      case 'group_membership':
        add('groups', textField('f_groups', 'Group name(s)', 'e.g. Managers;Documentation'));
        break;
      case 'name':
        add('displayName', textField('f_displayName', "Person's display name", 'e.g. Jim Stokes'));
        break;
      case 'table_access': {
        const wrap = el('div', { class: 'field' });
        wrap.appendChild(el('label', { text: 'Modules to grant access to' }));
        const container = el('div', { class: 'priv-checks' });
        const boxes = {};
        RegistryDefs.COMMON_TABLES.forEach((t) => {
          const cbId = `ta_${t.value}`;
          const row = el('label', { class: 'priv-row', for: cbId });
          const cb = el('input', { type: 'checkbox', id: cbId, value: t.value });
          cb.addEventListener('change', renderPreview);
          boxes[t.value] = cb;
          row.appendChild(cb);
          row.appendChild(document.createTextNode(` ${t.label} (${t.value})`));
          container.appendChild(row);
        });
        wrap.appendChild(container);
        const otherInput = el('input', { type: 'text', placeholder: 'Add another table name and press Enter' });
        const extraTables = [];
        otherInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && otherInput.value.trim()) {
            e.preventDefault();
            extraTables.push(otherInput.value.trim());
            otherInput.value = '';
            renderPreview();
          }
        });
        wrap.appendChild(otherInput);
        wrap.getValue = () => [...Object.entries(boxes).filter(([, cb]) => cb.checked).map(([v]) => v), ...extraTables];
        add('tables', wrap);
        break;
      }
      case 'operations':
        add('table', tableSelectField('f_table', 'Module (Key 4)', true));
        add(
          'privs',
          privilegePickerField('f_privs', 'Actions / tools to grant', RegistryDefs.OPERATIONS_PRIVS, RegistryDefs.OPERATIONS_PRESETS)
        );
        break;
      case 'column_access':
        add('table', tableSelectField('f_table', 'Module (Key 4)', false));
        add('column', textField('f_column', 'Column / field name (Key 6)', "e.g. BioBirthPlace, or 'Default' for all fields"));
        add(
          'privs',
          privilegePickerField('f_privs', 'Field permissions', RegistryDefs.COLUMN_ACCESS_PRIVS, RegistryDefs.COLUMN_ACCESS_PRESETS)
        );
        break;
      case 'column_access_modifier':
        add('table', tableSelectField('f_table', 'Module (Key 4)', false));
        add('column', textField('f_column', 'Column to watch (Key 6)', 'e.g. TitObjectStatus'));
        add('matchValue', matchValueField('f_matchValue', 'Value to match (Key 7)'));
        add(
          'settings',
          textAreaField(
            'f_settings',
            'Settings to apply (Value)',
            'e.g. LocCurrentLocation=-duEdit',
            'Format: column=[+/-]perm:[+/-]perm;column2=... A leading + adds a permission, - removes it, no sign replaces the full set.'
          )
        );
        break;
      case 'tabs_default':
        add('table', tableSelectField('f_table', 'Module (Key 4)', false));
        add(
          'tabs',
          textAreaField(
            'f_tabs',
            'Tabs to show/hide (Value)',
            'e.g. AllPerTab;AllOrgTab or All;-AllBioTab',
            "Semicolon separated back-end tab names. Prefix with - to hide, + to force-show, or use 'All' for every tab."
          )
        );
        break;
      case 'tabs_switching':
        add('table', tableSelectField('f_table', 'Module (Key 4)', false));
        add('column', textField('f_column', 'Tab-switching column (Key 6)', 'e.g. NamPartyType'));
        add('matchValue', matchValueField('f_matchValue', 'Value to match (Key 7)'));
        add('tabs', textField('f_tabs', 'Tabs to show (Value)', 'e.g. AllPerTab;AllAddTab'));
        break;
      case 'insert_tab_order':
      case 'query_tab_order':
        add('table', tableSelectField('f_table', 'Module (Key 4)', false));
        add('name', textField('f_name', 'Order name (Key 6)', 'e.g. Managers'));
        add('tabs', textField('f_tabs', 'Tab order (Value)', 'e.g. AllPerTab;AllOrgTab;AllAddTab'));
        break;
      default:
        break;
    }

    renderPreview();
  }

  // ---------------------------------------------------------------------
  // Turn current form state into { keys, value } following each entry
  // type's pattern, then preview it.
  // ---------------------------------------------------------------------
  function currentKeysAndValue() {
    const type = currentEntryType();
    const scope = els.scope.value;
    const name = els.name.value.trim();
    if (!name) return null;

    const base = [scope, name];

    switch (type.id) {
      case 'group_membership': {
        const groups = currentFields.groups.getValue();
        if (!groups) return null;
        return { keys: [...base, 'Group'], value: groups };
      }
      case 'name': {
        const val = currentFields.displayName.getValue();
        if (!val) return null;
        return { keys: [...base, 'Name'], value: val };
      }
      case 'table_access': {
        const tables = currentFields.tables.getValue();
        if (!tables.length) return null;
        return { keys: [...base, 'Table Access'], value: tables.join(';') };
      }
      case 'operations': {
        const table = currentFields.table.getValue();
        const privs = currentFields.privs.getValue();
        if (!table || !privs.length) return null;
        return { keys: [...base, 'Table', table, 'Operations'], value: privs.join(';') };
      }
      case 'column_access': {
        const table = currentFields.table.getValue();
        const column = currentFields.column.getValue();
        const privs = currentFields.privs.getValue();
        if (!table || !column || !privs.length) return null;
        return { keys: [...base, 'Table', table, 'Column Access', column], value: privs.join(';') };
      }
      case 'column_access_modifier': {
        const table = currentFields.table.getValue();
        const column = currentFields.column.getValue();
        const matchValue = currentFields.matchValue.getValue();
        const settings = currentFields.settings.getValue();
        if (!table || !column || !matchValue || !settings) return null;
        return { keys: [...base, 'Table', table, 'Column Access Modifier', column, matchValue], value: settings };
      }
      case 'tabs_default': {
        const table = currentFields.table.getValue();
        const tabs = currentFields.tabs.getValue();
        if (!table || !tabs) return null;
        return { keys: [...base, 'Table', table, 'Tabs', 'Default'], value: tabs };
      }
      case 'tabs_switching': {
        const table = currentFields.table.getValue();
        const column = currentFields.column.getValue();
        const matchValue = currentFields.matchValue.getValue();
        const tabs = currentFields.tabs.getValue();
        if (!table || !column || !matchValue || !tabs) return null;
        return { keys: [...base, 'Table', table, 'Tabs', column, matchValue], value: tabs };
      }
      case 'insert_tab_order':
      case 'query_tab_order': {
        const table = currentFields.table.getValue();
        const orderName = currentFields.name.getValue();
        const tabs = currentFields.tabs.getValue();
        if (!table || !orderName || !tabs) return null;
        const key5 = type.id === 'insert_tab_order' ? 'Insert Tab Order' : 'Query Tab Order';
        return { keys: [...base, 'Table', table, key5, orderName], value: tabs };
      }
      default:
        return null;
    }
  }

  function validationWarning(built) {
    const type = currentEntryType();
    if (type.id !== 'operations' || !built) return null;
    const table = built.keys[3];
    const privs = RegistryDefs.splitList(built.value);
    const problems = privs
      .map((p) => RegistryDefs.OPERATIONS_BY_ID[p])
      .filter((p) => p && p.requiresTable && p.requiresTable !== table);
    if (problems.length) {
      return `${problems.map((p) => p.label).join(', ')} require${problems.length === 1 ? 's' : ''} Module = ${problems[0].requiresTable}, but this entry has Module = ${table || '(not set)'}.`;
    }
    return null;
  }

  // Some Operations privileges (e.g. the Relocate tool) only work if the
  // group/user also has Global Replace Column Access on specific fields.
  // Given a built { keys, value } for an Operations entry, returns the
  // { keys, value, pipe, description } entries that should be auto-added
  // alongside it (skipping any already present in builderEntries).
  function computeAutoColumnAccessEntries(built) {
    const type = currentEntryType();
    if (type.id !== 'operations' || !built) return [];

    const [scope, name, , table] = built.keys;
    const privs = RegistryDefs.splitList(built.value);
    const result = [];

    privs.forEach((privId) => {
      const priv = RegistryDefs.OPERATIONS_BY_ID[privId];
      if (!priv || !priv.requiredColumnAccess) return;

      priv.requiredColumnAccess.forEach((column) => {
        const keys = [scope, name, 'Table', table, 'Column Access', column];
        const keyPath = keys.join('|').toLowerCase();
        const alreadyPresent =
          builderEntries.some((e) => e.keys.join('|').toLowerCase() === keyPath) ||
          result.some((e) => e.keys.join('|').toLowerCase() === keyPath);
        if (alreadyPresent) return;

        const value = 'duReplace';
        const pipe = RegistryDefs.toPipeString(keys, value);
        const rowObj = {};
        keys.forEach((k, i) => (rowObj[`key${i + 1}`] = k));
        rowObj.value = value;
        const description =
          RegistryDefs.describeRow(rowObj) ||
          `${scope} ${name} has these permissions on field "${column}" in ${table}: Usable in Global Replace`;

        result.push({ keys, value, pipe, description });
      });
    });

    return result;
  }

  function renderPreview() {
    const built = currentKeysAndValue();
    els.warning.textContent = '';
    els.addBtn.disabled = true;

    if (!built) {
      els.preview.innerHTML = '<p class="hint">Fill in the fields above to preview the Registry entry.</p>';
      return;
    }

    const pipe = RegistryDefs.toPipeString(built.keys, built.value);
    const rowObj = {};
    built.keys.forEach((k, i) => (rowObj[`key${i + 1}`] = k));
    rowObj.value = built.value;
    const description = RegistryDefs.describeRow(rowObj) || '(preview unavailable for this combination)';

    els.preview.innerHTML = '';
    els.preview.appendChild(el('p', { class: 'builder-description', text: description }));
    els.preview.appendChild(el('pre', { class: 'builder-pipe', text: pipe }));

    const autoEntries = computeAutoColumnAccessEntries(built);
    if (autoEntries.length) {
      els.preview.appendChild(
        el('p', {
          class: 'builder-description',
          text: `Also adds ${autoEntries.length} required Column Access ${autoEntries.length === 1 ? 'entry' : 'entries'}:`,
        })
      );
      autoEntries.forEach((entry) => {
        els.preview.appendChild(el('p', { class: 'builder-description', text: entry.description }));
        els.preview.appendChild(el('pre', { class: 'builder-pipe', text: entry.pipe }));
      });
    }

    const warning = validationWarning(built);
    if (warning) {
      els.warning.textContent = `⚠ ${warning}`;
    }

    els.addBtn.disabled = false;
    els.addBtn._pending = { keys: built.keys, value: built.value, pipe, description };
  }

  function renderList() {
    els.list.innerHTML = '';
    if (builderEntries.length === 0) {
      els.list.appendChild(el('p', { class: 'hint', text: 'No entries added yet.' }));
      els.exportBtn.disabled = true;
      return;
    }
    els.exportBtn.disabled = false;

    const table = el('table');
    table.appendChild(
      el('tr', {}, [el('th', { text: 'Entry' }), el('th', { text: 'Description' }), el('th', { text: '' })])
    );
    builderEntries.forEach((entry) => {
      const removeBtn = el('button', { type: 'button', class: 'chip remove', text: 'Remove' });
      removeBtn.addEventListener('click', () => {
        builderEntries = builderEntries.filter((e) => e.id !== entry.id);
        renderList();
      });
      table.appendChild(
        el('tr', {}, [
          el('td', {}, [el('code', { text: entry.pipe })]),
          el('td', { text: entry.description }),
          el('td', {}, [removeBtn]),
        ])
      );
    });
    els.list.appendChild(table);
  }

  function csvEscape(value) {
    const str = String(value === undefined || value === null ? '' : value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportCSV() {
    const header = ['irn', 'Levels', ...Array.from({ length: 10 }, (_, i) => `Key${i + 1}`), 'Value'];
    const lines = [header.join(',')];
    builderEntries.forEach((entry) => {
      const row = RegistryDefs.buildRow(entry.keys, entry.value);
      const line = [row.irn, row.levels, ...Array.from({ length: 10 }, (_, i) => row[`key${i + 1}`]), row.value].map(csvEscape);
      lines.push(line.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registry-entries.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------------
  // Wire up static event listeners
  // ---------------------------------------------------------------------
  els.entryType.addEventListener('change', () => {
    updateScopeAvailability();
    renderDynamicFields();
  });
  els.scope.addEventListener('change', renderPreview);
  els.name.addEventListener('input', renderPreview);

  els.addBtn.addEventListener('click', () => {
    const pending = els.addBtn._pending;
    if (!pending) return;

    const autoEntries = computeAutoColumnAccessEntries(pending);

    entryCounter += 1;
    builderEntries.push({ id: entryCounter, ...pending });

    autoEntries.forEach((entry) => {
      entryCounter += 1;
      builderEntries.push({ id: entryCounter, ...entry });
    });

    renderList();
  });

  els.clearBtn.addEventListener('click', () => {
    if (builderEntries.length && !confirm('Clear all entries in the list?')) return;
    builderEntries = [];
    renderList();
  });

  els.exportBtn.addEventListener('click', exportCSV);

  document.addEventListener('registry:groupsLoaded', (e) => {
    els.nameList.innerHTML = '';
    (e.detail.groups || []).forEach((g) => {
      els.nameList.appendChild(el('option', { value: g }));
    });
  });

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  populateEntryTypeSelect();
  populateScopeOptions();
  renderDynamicFields();
  renderList();
})();
