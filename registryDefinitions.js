/*
 * registryDefinitions.js
 *
 * A single, shared description of the shapes an EMu Registry entry can take
 * for user/group permissions (Table Access, Operations, Column Access,
 * Column Access Modifier, Tabs, Tab Order, Group membership, Name).
 *
 * Sourced from:
 *  - "EMu Training: Working with the EMu Registry" (Application Administration
 *    in EMu, v4.3 manual) - Section 3, User / Groups Permissions.
 *  - The current EMu online Help (help.emu.axiell.com), which documents
 *    Operations privileges added since the manual was written (v6.1+:
 *    daRelocate, daRecondition, daReidentify, daRevalue).
 *
 * This file is loaded as a plain <script> (no bundler), so everything is
 * attached to the global `RegistryDefs` object.
 */

(function (global) {
  'use strict';

  // ---------------------------------------------------------------------
  // Reference tables (common EMu modules). Institutions can have custom
  // modules too, so every table picker in the UI should still allow free
  // text alongside this list.
  // ---------------------------------------------------------------------
  const COMMON_TABLES = [
    { value: 'ecatalogue', label: 'Catalogue' },
    { value: 'eparties', label: 'Parties' },
    { value: 'emultimedia', label: 'Multimedia' },
    { value: 'enarratives', label: 'Narratives' },
    { value: 'eevents', label: 'Events' },
    { value: 'elocations', label: 'Locations' },
    { value: 'eluts', label: 'Lookup Lists' },
    { value: 'eregistry', label: 'Registry' },
    { value: 'einternal', label: 'Internal' },
    { value: 'eloans', label: 'Loans' },
    { value: 'einsurance', label: 'Insurance' },
    { value: 'econservation', label: 'Conservation' },
    { value: 'eaccessionlots', label: 'Accession Lots' },
    { value: 'ebibliography', label: 'Bibliography' },
    { value: 'ethesaurus', label: 'Thesaurus' },
    { value: 'esites', label: 'Sites' },
    { value: 'eadmin', label: 'Admin' },
  ];

  const TABLE_LABELS = COMMON_TABLES.reduce((acc, t) => {
    acc[t.value.toLowerCase()] = t.label;
    return acc;
  }, {});

  function tableLabel(table) {
    if (!table) return table;
    if (table === 'Default') return 'all modules (Default)';
    return TABLE_LABELS[table.toLowerCase()] || table;
  }

  // ---------------------------------------------------------------------
  // Operations privileges (Table|Operations Registry entry)
  // ---------------------------------------------------------------------
  const OPERATIONS_PRIVS = [
    {
      id: 'daQuery',
      label: 'Search',
      category: 'General',
      description: 'Search the module.',
    },
    {
      id: 'daDisplay',
      label: 'View records',
      category: 'General',
      description: 'Display records from the module.',
    },
    {
      id: 'daEdit',
      label: 'Edit records',
      category: 'General',
      description:
        'Edit records in the module. Without this, records returned by a search are read-only.',
    },
    {
      id: 'daInsert',
      label: 'Add new records',
      category: 'General',
      description: 'Add new records to the module.',
    },
    {
      id: 'daDelete',
      label: 'Delete records',
      category: 'General',
      description: 'Delete records from the module.',
    },
    {
      id: 'daDefaults',
      label: 'Manage default values',
      category: 'General',
      description:
        'Define sets of default values and switch which set is in use.',
    },
    {
      id: 'daReport',
      label: 'Generate reports',
      category: 'General',
      description: 'Generate reports.',
    },
    {
      id: 'daDesign',
      label: 'Design reports',
      category: 'General',
      description: 'Create new reports.',
    },
    {
      id: 'daEditQuery',
      label: 'Edit search criteria (Texql)',
      category: 'Advanced',
      description:
        'Edit the search criteria of the previous search in Texql format.',
    },
    {
      id: 'daEditHelp',
      label: 'Edit field help',
      category: 'Advanced',
      description: 'Edit the field level help description.',
    },
    {
      id: 'daSecurity',
      label: 'Edit Record Level Security',
      category: 'Advanced',
      description: 'Edit Record Level Security permissions on records.',
    },
    {
      id: 'daDittoAll',
      label: 'Ditto all fields',
      category: 'Advanced',
      description: 'Use Edit > Ditto > All Fields (Shift+F9).',
    },
    {
      id: 'daReplace',
      label: 'Global Replace tool',
      category: 'Tool',
      description:
        'Use the Global Replace tool. Also grants use of the Condition Update, Re-identification, Relocation and Revaluation tools without needing those privileges individually.',
    },
    {
      id: 'daImport',
      label: 'Import tool',
      category: 'Tool',
      description: 'Use the Import tool.',
    },
    {
      id: 'daExport',
      label: 'Export Schedules',
      category: 'Tool',
      description: 'Use the Export Schedules facility.',
    },
    {
      id: 'daMerge',
      label: 'Merge Records tool',
      category: 'Tool',
      description: 'Use the Merge Records tool.',
    },
    {
      id: 'daRecall',
      label: 'Record Recall',
      category: 'Tool',
      description: 'Use the Record Recall facility.',
    },
    {
      id: 'daTemplates',
      label: 'Record Templates',
      category: 'Tool',
      description: 'Create a Record Template in the module.',
    },
    {
      id: 'daRelocate',
      label: 'Relocate tool',
      category: 'Tool',
      description:
        'Use the Catalogue Relocation tool (bulk relocation of objects). Also requires Global Replace (duReplace) Column Access on the location fields it writes to.',
      requiresTable: 'ecatalogue',
      since: 'EMu 6.1',
      requiredColumnAccess: [
        'LocCurrentLocationRef',
        'LocRequestedByRef',
        'LocReleasedByRef',
        'LocAcceptedByRef',
        'LocDateMoved',
        'LocTimeMoved',
        'LocMovementNotes',
      ],
    },
    {
      id: 'daRecondition',
      label: 'Condition Update tool',
      category: 'Tool',
      description: 'Use the Catalogue Condition Update tool.',
      requiresTable: 'ecatalogue',
      since: 'EMu 6.1',
    },
    {
      id: 'daReidentify',
      label: 'Re-identification tool',
      category: 'Tool',
      description: 'Use the Catalogue Re-identification tool.',
      requiresTable: 'ecatalogue',
      since: 'EMu 6.1',
    },
    {
      id: 'daRevalue',
      label: 'Revaluation tool',
      category: 'Tool',
      description: 'Use the Catalogue Revaluation tool.',
      requiresTable: 'ecatalogue',
      since: 'EMu 6.1',
    },
  ];

  const OPERATIONS_BY_ID = OPERATIONS_PRIVS.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const OPERATIONS_PRESETS = {
    viewOnly: {
      label: 'View only',
      privs: ['daQuery', 'daDisplay'],
    },
    viewAndEdit: {
      label: 'View & edit',
      privs: ['daQuery', 'daDisplay', 'daEdit'],
    },
    fullAccess: {
      label: 'Full access (all standard privileges)',
      privs: [
        'daQuery',
        'daDisplay',
        'daEdit',
        'daInsert',
        'daDelete',
        'daReplace',
        'daDefaults',
        'daReport',
        'daDesign',
        'daEditQuery',
        'daEditHelp',
        'daSecurity',
        'daImport',
      ],
    },
  };

  // "Tool" privileges that require Key 4 to be a specific table.
  const TOOL_PRIVS = OPERATIONS_PRIVS.filter((p) => p.category === 'Tool');

  // ---------------------------------------------------------------------
  // Column Access privileges (Table|Column Access Registry entry)
  // ---------------------------------------------------------------------
  const COLUMN_ACCESS_PRIVS = [
    {
      id: 'dvDisplay',
      label: 'View while displaying',
      description: 'The column can be viewed when displaying records.',
    },
    {
      id: 'dvEdit',
      label: 'View while editing',
      description: 'The column can be viewed when editing records.',
    },
    {
      id: 'duEdit',
      label: 'Update while editing',
      description: 'The column can be updated (changed) when editing records.',
    },
    {
      id: 'dvInsert',
      label: 'View while inserting',
      description: 'The column can be viewed when inserting new records.',
    },
    {
      id: 'duInsert',
      label: 'Update while inserting',
      description: 'The column can be updated when inserting new records.',
    },
    {
      id: 'dvQuery',
      label: 'View while searching',
      description: 'The column can be viewed when entering search terms.',
    },
    {
      id: 'duQuery',
      label: 'Update while searching',
      description:
        'The column can be searched on (a term can be entered) when entering search terms.',
    },
    {
      id: 'duReplace',
      label: 'Usable in Global Replace',
      description:
        'The column may be used for a global replace / edit. Also requires the daReplace Operations privilege.',
    },
  ];

  const COLUMN_ACCESS_PRESETS = {
    viewOnly: {
      label: 'View only',
      privs: ['dvDisplay', 'dvEdit', 'dvQuery', 'duQuery'],
    },
    viewAndEdit: {
      label: 'View & edit',
      privs: [
        'dvDisplay',
        'dvEdit',
        'dvInsert',
        'dvQuery',
        'duEdit',
        'duInsert',
        'duQuery',
        'duReplace',
      ],
    },
    hidden: {
      // Per the manual: an entry with no privileges is a syntax error. The
      // documented way to fully hide a column is duQuery only.
      label: 'Hidden (not visible in any mode)',
      privs: ['duQuery'],
    },
  };

  // ---------------------------------------------------------------------
  // Entry "shapes": how to recognize / build each Registry entry type from
  // the sequence of populated keys that follow Key1 (scope) and Key2 (name).
  //
  // pattern segments starting with "*" are wildcards/captures; everything
  // else must match the segment exactly (case-insensitive).
  // ---------------------------------------------------------------------
  const ENTRY_TYPES = [
    {
      id: 'group_membership',
      label: 'Group membership',
      scopes: ['User'],
      pattern: ['Group'],
      describe(ctx) {
        const groups = splitList(ctx.value);
        return `${ctx.name} is added to group${groups.length > 1 ? 's' : ''}: ${groups.join(', ')}`;
      },
    },
    {
      id: 'name',
      label: 'Display name',
      scopes: ['User'],
      pattern: ['Name'],
      describe(ctx) {
        return `${ctx.name}'s display name is set to "${ctx.value}"`;
      },
    },
    {
      id: 'table_access',
      label: 'Table Access',
      scopes: ['User', 'Group'],
      pattern: ['Table Access'],
      describe(ctx) {
        const tables = splitList(ctx.value).map(tableLabel);
        return `${ctx.scope} ${ctx.name} can access these modules: ${tables.join(', ')}`;
      },
    },
    {
      id: 'operations',
      label: 'Operations (per-table actions)',
      scopes: ['User', 'Group'],
      pattern: ['Table', '*table', 'Operations'],
      describe(ctx) {
        const privs = splitList(ctx.value);
        const friendly = privs.map((p) =>
          OPERATIONS_BY_ID[p] ? OPERATIONS_BY_ID[p].label : p,
        );
        return `${ctx.scope} ${ctx.name} can do the following in ${tableLabel(ctx.captures.table)}: ${friendly.join(', ')}`;
      },
    },
    {
      id: 'column_access',
      label: 'Column Access',
      scopes: ['User', 'Group'],
      pattern: ['Table', '*table', 'Column Access', '*column'],
      describe(ctx) {
        const privs = splitList(ctx.value);
        const friendly = privs.map((p) =>
          p === 'Default'
            ? p
            : (COLUMN_ACCESS_PRIVS.find((c) => c.id === p) || {}).label || p,
        );
        const colLabel =
          ctx.captures.column === 'Default'
            ? 'all fields by default'
            : `field "${ctx.captures.column}"`;
        return `${ctx.scope} ${ctx.name} has these permissions on ${colLabel} in ${tableLabel(ctx.captures.table)}: ${friendly.join(', ')}`;
      },
    },
    {
      id: 'column_access_modifier',
      label: 'Column Access Modifier (conditional field permissions)',
      scopes: ['User', 'Group'],
      pattern: [
        'Table',
        '*table',
        'Column Access Modifier',
        '*column',
        '*matchValue',
      ],
      describe(ctx) {
        return `${ctx.scope} ${ctx.name}: in ${tableLabel(ctx.captures.table)}, when "${ctx.captures.column}" is ${describeMatchValue(
          ctx.captures.matchValue,
        )}, apply: ${ctx.value}`;
      },
    },
    {
      id: 'tabs_default',
      label: 'Tabs (default tab set)',
      scopes: ['User', 'Group'],
      pattern: ['Table', '*table', 'Tabs', 'Default'],
      describe(ctx) {
        return `${ctx.scope} ${ctx.name}'s default tabs in ${tableLabel(ctx.captures.table)}: ${formatListForWrap(ctx.value)}`;
      },
    },
    {
      id: 'tabs_switching',
      label: 'Tabs (dynamic switching)',
      scopes: ['User', 'Group'],
      pattern: ['Table', '*table', 'Tabs', '*column', '*matchValue'],
      describe(ctx) {
        return `${ctx.scope} ${ctx.name}: in ${tableLabel(ctx.captures.table)}, when "${ctx.captures.column}" is ${describeMatchValue(
          ctx.captures.matchValue,
        )}, show tabs: ${formatListForWrap(ctx.value)}`;
      },
    },
    {
      id: 'insert_tab_order',
      label: 'Insert Tab Order',
      scopes: ['User', 'Group'],
      pattern: ['Table', '*table', 'Insert Tab Order', '*name'],
      describe(ctx) {
        return `${ctx.scope} ${ctx.name}: tab order "${ctx.captures.name}" in ${tableLabel(ctx.captures.table)} (Display/New/Edit modes): ${formatListForWrap(ctx.value)}`;
      },
    },
    {
      id: 'query_tab_order',
      label: 'Query Tab Order',
      scopes: ['User', 'Group'],
      pattern: ['Table', '*table', 'Query Tab Order', '*name'],
      describe(ctx) {
        return `${ctx.scope} ${ctx.name}: tab order "${ctx.captures.name}" in ${tableLabel(ctx.captures.table)} (Search mode): ${formatListForWrap(ctx.value)}`;
      },
    },
  ];

  function describeMatchValue(v) {
    if (v === 'NULL') return 'empty';
    if (v === 'NOT NULL') return 'not empty';
    return `"${v}"`;
  }

  function splitList(value) {
    if (value === undefined || value === null) return [];
    return String(value)
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function formatListForWrap(value) {
    const items = splitList(value);
    if (!items.length)
      return value === undefined || value === null ? '' : String(value);
    return items.join(', ');
  }

  // ---------------------------------------------------------------------
  // Parsing: turn a CSV row (already lower-cased columns, as script.js does)
  // into { scope, name, rest: [...], value } and match it to an ENTRY_TYPE.
  // ---------------------------------------------------------------------
  function extractKeys(row) {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
      const raw = row[`key${i}`];
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        keys.push(String(raw).trim());
      }
    }
    return keys;
  }

  function matchPattern(pattern, rest) {
    if (pattern.length !== rest.length) return null;
    const captures = {};
    for (let i = 0; i < pattern.length; i++) {
      const seg = pattern[i];
      if (seg.startsWith('*')) {
        captures[seg.slice(1)] = rest[i];
      } else if (seg.toLowerCase() !== rest[i].toLowerCase()) {
        return null;
      }
    }
    return captures;
  }

  // Returns { entryType, scope, name, captures, value } or null if the row
  // doesn't match any known User/Group permission shape (e.g. it's a
  // System|Setting entry, which this tool does not currently interpret).
  function classifyRow(row) {
    const keys = extractKeys(row);
    if (keys.length < 2) return null;
    const scope = keys[0];
    if (scope !== 'User' && scope !== 'Group') return null;
    const name = keys[1];
    const rest = keys.slice(2);
    for (const entryType of ENTRY_TYPES) {
      if (!entryType.scopes.includes(scope)) continue;
      const captures = matchPattern(entryType.pattern, rest);
      if (captures) {
        return { entryType, scope, name, captures, value: row.value };
      }
    }
    return null;
  }

  function describeRow(row) {
    const match = classifyRow(row);
    if (!match) return null;
    const ctx = {
      scope: match.scope,
      name: match.name,
      captures: match.captures,
      value: match.value,
    };
    try {
      return match.entryType.describe(ctx);
    } catch (e) {
      return null;
    }
  }

  // ---------------------------------------------------------------------
  // Building: construct a Registry row (irn, levels, key1..key10, value)
  // from builder form input. `keys` is the ordered array of Key1..KeyN
  // values (as strings); levels/irn are filled in for CSV export.
  // ---------------------------------------------------------------------
  function buildRow(keys, value) {
    const row = { irn: '', levels: String(keys.length) };
    for (let i = 0; i < 10; i++) {
      row[`key${i + 1}`] = keys[i] !== undefined ? keys[i] : '';
    }
    row.value = value;
    return row;
  }

  function toPipeString(keys, value) {
    return (
      keys.filter((k) => k !== undefined && k !== '').join('|') + '|' + value
    );
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------
  global.RegistryDefs = {
    COMMON_TABLES,
    tableLabel,
    OPERATIONS_PRIVS,
    OPERATIONS_BY_ID,
    OPERATIONS_PRESETS,
    TOOL_PRIVS,
    COLUMN_ACCESS_PRIVS,
    COLUMN_ACCESS_PRESETS,
    ENTRY_TYPES,
    splitList,
    describeMatchValue,
    extractKeys,
    classifyRow,
    describeRow,
    buildRow,
    toPipeString,
  };
})(window);
