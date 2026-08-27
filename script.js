const minCols = [
  'irn',
  'levels',
  'key1',
  'key2',
  'key3',
  'key4',
  'key5',
  'key6',
  'key7',
  'key8',
  'key9',
  'key10',
  'value',
].map((col) => col.toLowerCase());
const fileInfo = document.getElementById('fileInfo');
const groupsList = document.getElementById('groupsList');
const groupPermTable = document.getElementById('groupPermTable');
const groupSection = document.getElementById('groupSection');
const toolAccessSection = document.getElementById('toolAccessSection');
const unmatchedSection = document.getElementById('unmatchedSection');

// Entries that describe "tool" access on the Catalogue module: the four
// tool-specific privileges added in EMu 6.1, plus daReplace which grants
// access to all of them (see the Operations Registry entry documentation).
const CATALOGUE_TOOL_PRIVS = [
  'daReplace',
  'daRelocate',
  'daRecondition',
  'daReidentify',
  'daRevalue',
];

// Show loading spinner
function showLoadingSpinner(divName) {
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.innerHTML = 'Loading data...';
  document.getElementById(divName).appendChild(spinner);
}

function getDuplicates(dataframe) {
  let colsToCheck = dataframe.columns.filter((col) => col !== 'irn');
  let grouped = dataframe.groupby(colsToCheck).count();
  let countCol = grouped.columns[grouped.columns.length - 1];
  let duplicateRows = grouped.query(grouped[countCol].gt(1));
  if (duplicateRows.shape[0] === 0) return null; // Return null if no duplicates

  let dupKeys = duplicateRows[colsToCheck].values;
  let mask = dataframe[colsToCheck].apply((row) =>
    dupKeys.some((keyArr) => keyArr.every((val, idx) => val === row[idx])),
  );
  return dataframe.loc({ rows: mask });
}

function getGroupsList(df) {
  /*
          Purpose:
          Extracts unique user groups from the DataFrame where Key1 is "Group" and Key2 is the group name.

          Parameters:
          - df: DataFrame containing the data with columns 'Key1', 'Key2'.

          Output:
          - Updates the HTML list with unique group names (with "Default" group appearing first) and displays the total count of user groups.
        */
  let groupRows = df.query(df['Key1'].eq('Group'));
  let uniqueGroups = groupRows['Key2'].unique().values;

  uniqueGroups.sort(); // Sort groups alphabetically
  // Ensure "Default" group appears first if it exists
  if (uniqueGroups.includes('Default')) {
    uniqueGroups = [
      'Default',
      ...uniqueGroups.filter((group) => group !== 'Default'),
    ];
  }
  groupsList.innerHTML = ''; // Clear previous list
  uniqueGroups.forEach((groupName) => {
    let listItem = document.createElement('li');
    let itemLink = document.createElement('a');
    itemLink.textContent = groupName;
    itemLink.href = `#${groupName.replace(/\s+/g, '-')}`; // Create a link with an anchor
    listItem.appendChild(itemLink);
    groupsList.appendChild(listItem);
  });
  let groupCount = document.createElement('p');
  groupCount.textContent = `Total User Groups: ${uniqueGroups.length}`;

  groupsList.appendChild(groupCount);

  // Make the group list available to the entry-builder tool (for the name
  // datalist) and other consumers.
  window.currentUniqueGroups = uniqueGroups;
  document.dispatchEvent(
    new CustomEvent('registry:groupsLoaded', {
      detail: { groups: uniqueGroups },
    }),
  );

  return uniqueGroups;
}

function createGroupPermissionTable(df, uniqueGroups) {
  /*
          Purpose:
          Generates a permissions HTML table displaying the presence of access settings for each module("table") per user group.

          Parameters:
        - df: DataFrame containing the data with columns 'Key1', 'Key2', 'Key3', and 'Key4'.
          - uniqueGroups: Array of unique user group names extracted from the DataFrame.

          Table Structure:
        - Rows: Unique table names extracted from the 'Key4' field, filtered where 'Key3' is "Table" and 'Key1' is "Group".
          - Columns: Unique user groups listed in 'uniqueGroups'.

          Cell Logic:
        - For each cell, filters the DataFrame where:
        - 'Key1' equals "Group"
          - 'Key2' equals the current group name
            - 'Key3' equals "Table"
              - Checks if the table name('Key4') exists for the current group.
            - Marks cell as "Yes" (explicit setting present, colored green) or "No"(explicit setting absent, colored red).

          Usage:
          Use this function to visually represent which user groups have permissions for specific modules / tables.
        */

  const disclaimer = document.createElement('p');
  disclaimer.textContent =
    "This table shows which user groups have access to specific modules (tables). A 'Yes' indicates the presence of explicit settings in the Registry, while a 'No' indicates no explicit permissions found.";
  const table = document.createElement('table');
  const headerRow = document.createElement('tr');

  headerRow.innerHTML =
    '<th>Has Access to Module</th>' +
    uniqueGroups.map((group) => `<th>${group}</th>`).join('');
  table.appendChild(headerRow);

  let uniqueTables = df.query(df['Key3'].eq('Table'))['Key4'].unique().values;

  uniqueTables.forEach((tableName) => {
    const row = document.createElement('tr');
    const tableCell = document.createElement('td');
    tableCell.textContent = `${RegistryDefs.tableLabel(tableName)} (${tableName})`;
    row.appendChild(tableCell);

    uniqueGroups.forEach((groupName) => {
      const cell = document.createElement('td');
      let hasPermission =
        df.query(
          df['Key1']
            .eq('Group')
            .and(df['Key2'].eq(groupName))
            .and(df['Key3'].eq('Table'))
            .and(df['Key4'].eq(tableName)),
        ).shape[0] > 0;

      cell.textContent = hasPermission ? 'Yes' : 'No';
      cell.style.backgroundColor = hasPermission ? 'lightgreen' : 'lightcoral';
      row.appendChild(cell);
    });

    table.appendChild(row);
  });
  // Append the disclaimer above the table groupPermTable div
  groupPermTable.insertAdjacentElement('beforebegin', disclaimer);
  groupPermTable.innerHTML = ''; // Clear previous table
  groupPermTable.appendChild(table);
}

/*
  Follows the precedence chain documented in "The order in which Registry
  entries are assigned" (EMu Registry manual, p.16-20): for Table/Column
  settings, EMu looks for the most specific entry first and stops at the
  first match - entries are NOT combined/merged.

  This checks, in order:
    Group|group|Table|table|Operations
    Group|group|Table|Default|Operations
    Group|Default|Table|table|Operations
    Group|Default|Table|Default|Operations
*/
function resolveOperations(df, group, table) {
  const candidates = [
    [group, table],
    [group, 'Default'],
    ['Default', table],
    ['Default', 'Default'],
  ];
  for (const [name, tbl] of candidates) {
    const rows = df.query(
      df['Key1']
        .eq('Group')
        .and(df['Key2'].eq(name))
        .and(df['Key3'].eq('Table'))
        .and(df['Key4'].eq(tbl))
        .and(df['Key5'].eq('Operations')),
    );
    if (rows.shape[0] > 0) {
      const values = rows['Value'].values.join(';');
      return {
        source: `Group|${name}|Table|${tbl}|Operations`,
        privs: RegistryDefs.splitList(values),
      };
    }
  }
  return null;
}

function createToolAccessSummary(df, uniqueGroups) {
  /*
    Purpose:
    Directly answers "which groups can use tool X" questions (e.g. the
    Relocate Tool) by resolving Operations privileges per group for the
    Catalogue module, following the same precedence EMu itself uses, and
    accounting for daReplace implicitly granting the other catalogue tools.
  */
  toolAccessSection.innerHTML = '';

  const intro = document.createElement('p');
  intro.textContent =
    "These tool privileges apply to the Catalogue module. A group has a tool if it has the specific privilege, or has Global Replace (which grants all of them). Resolution follows EMu's own precedence: group+table, then group+Default table, then Default group+table, then Default group+Default table.";
  toolAccessSection.parentElement?.insertBefore(intro, toolAccessSection);

  const table = document.createElement('table');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML =
    '<th>Tool</th>' + uniqueGroups.map((g) => `<th>${g}</th>`).join('');
  table.appendChild(headerRow);

  CATALOGUE_TOOL_PRIVS.forEach((privId) => {
    const priv = RegistryDefs.OPERATIONS_BY_ID[privId];
    const row = document.createElement('tr');
    const labelCell = document.createElement('td');
    labelCell.textContent = priv.label;
    labelCell.title = priv.description;
    row.appendChild(labelCell);

    uniqueGroups.forEach((groupName) => {
      const cell = document.createElement('td');
      const resolved = resolveOperations(df, groupName, 'ecatalogue');
      const hasDirectly = resolved && resolved.privs.includes(privId);
      const hasViaReplace =
        privId !== 'daReplace' &&
        resolved &&
        resolved.privs.includes('daReplace');
      const has = hasDirectly || hasViaReplace;

      cell.textContent = has ? 'Yes' : 'No';
      cell.style.backgroundColor = has ? 'lightgreen' : 'lightcoral';
      if (has && resolved) {
        cell.title = hasViaReplace
          ? `Granted via Global Replace (${resolved.source})`
          : `Set directly (${resolved.source})`;
      }
      row.appendChild(cell);
    });

    table.appendChild(row);
  });

  toolAccessSection.appendChild(table);
}

// Human-friendly labels for each entry type, used as section headings when
// grouping a group's settings by category.
const ENTRY_TYPE_HEADINGS = {
  table_access: 'Module Access',
  operations: 'Actions & Tools per Module',
  column_access: 'Field-level Permissions',
  column_access_modifier: 'Conditional Field Permissions',
  tabs_default: 'Default Tabs',
  tabs_switching: 'Dynamic Tab Switching',
  insert_tab_order: 'Tab Order (Display/New/Edit)',
  query_tab_order: 'Tab Order (Search)',
  group_membership: 'Group Membership',
  name: 'Display Name',
};

function createGroupExplanation(df, uniqueGroups) {
  groupSection.innerHTML = '';
  let unmatchedCount = 0;

  uniqueGroups.forEach((group) => {
    const groupInfo = document.createElement('div');
    const itemAnchor = `${group.replace(/\s+/g, '-')}`;
    groupInfo.classList.add('group-info');
    groupInfo.innerHTML = `<h3 id="${itemAnchor}">${group}</h3>`;

    const groupRows = df.query(
      df['Key1'].eq('Group').and(df['Key2'].eq(group)),
    );

    // Bucket every row for this group by which entry type it matches.
    const buckets = {};
    const rawRows = groupRows.values; // array of arrays, in column order
    const cols = groupRows.columns;

    for (let i = 0; i < rawRows.length; i++) {
      const rowObj = {};
      cols.forEach((c, idx) => {
        // RegistryDefs works off lowercase keys (key1..key10, value)
        // regardless of how the DataFrame columns happen to be cased.
        rowObj[c.toLowerCase()] = rawRows[i][idx];
      });
      const description = RegistryDefs.describeRow(rowObj);
      if (!description) {
        unmatchedCount++;
        continue;
      }
      const match = RegistryDefs.classifyRow(rowObj);
      const typeId = match.entryType.id;
      if (!buckets[typeId]) buckets[typeId] = [];
      buckets[typeId].push(description);
    }

    if (Object.keys(buckets).length === 0) {
      const p = document.createElement('p');
      p.innerHTML =
        'No explicit settings for this group. See <a href="#Default">Default</a> to see what applies.';
      groupInfo.appendChild(p);
    } else {
      Object.keys(ENTRY_TYPE_HEADINGS).forEach((typeId) => {
        if (!buckets[typeId]) return;
        const heading = document.createElement('h4');
        heading.textContent = ENTRY_TYPE_HEADINGS[typeId];
        groupInfo.appendChild(heading);

        const list = document.createElement('ul');
        buckets[typeId].sort().forEach((desc) => {
          const li = document.createElement('li');
          li.textContent = desc;
          list.appendChild(li);
        });
        groupInfo.appendChild(list);
      });
    }

    groupSection.appendChild(groupInfo);
  });

  if (unmatchedSection) {
    unmatchedSection.innerHTML = '';
    if (unmatchedCount > 0) {
      const p = document.createElement('p');
      p.textContent = `${unmatchedCount} Registry row(s) for these groups did not match a recognized permission shape (e.g. System-wide settings, or entry types this tool doesn't interpret yet). They are still included in exports/searches you do directly in EMu.`;
      unmatchedSection.appendChild(p);
    }
  }
}

document.getElementById('loadFile').addEventListener('click', function () {
  const fileInput = document.getElementById('fileInput');
  if (fileInput.files.length === 0) {
    alert('Please select a CSV file first.');
    return;
  }
  showLoadingSpinner('groupsList');
  showLoadingSpinner('groupPermTable');
  showLoadingSpinner('groupSection');
  const file = fileInput.files[0];
  dfd
    .readCSV(file)
    .then((df) => {
      // convert column names to lowercase for consistency
      df.columns = df.columns.map((col) => col.toLowerCase());
      if (
        !minCols.every((col) =>
          df.columns.map((c) => c.toLowerCase()).includes(col),
        )
      ) {
        alert('CSV file is missing required columns: ' + minCols.join(', '));
        return;
      } else {
        console.log(
          `DataFrame loaded with ${df.shape[0]} rows and ${df.shape[1]} columns.`,
        );
        fileInfo.textContent = `Loaded CSV file: ${file.name} with ${df.shape[0]} rows and ${df.shape[1]} columns.`;
      }
      // Proceed with processing the DataFrame
      const duplicatesDF = getDuplicates(df);
      if (duplicatesDF && duplicatesDF.shape[0] > 0) {
        console.warn(
          `Found ${duplicatesDF.shape[0]} duplicate registry settings:`,
        );
        console.table(duplicatesDF.values);
        alert(
          `Warning: Found ${duplicatesDF.shape[0]} duplicate registry settings. Check console for details.`,
        );
      } else {
        console.log('No duplicate registry settings found.');
      }

      // Restore title-case column names expected by the query helpers below
      // (Key1..Key10, Value) while keeping a lowercase lookup available.
      const titleCased = df.columns.map((c) => {
        const m = c.match(/^key(\d+)$/);
        if (m) return `Key${m[1]}`;
        if (c === 'value') return 'Value';
        if (c === 'irn') return 'irn';
        if (c === 'levels') return 'Levels';
        return c;
      });
      df.columns = titleCased;

      const uniqueGroups = getGroupsList(df);
      createGroupPermissionTable(df, uniqueGroups);
      createToolAccessSummary(df, uniqueGroups);
      createGroupExplanation(df, uniqueGroups);
    })
    .catch((err) => {
      console.error('Error loading CSV:', err);
    });
});

const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('visible', window.scrollY > 400);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
