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

// Show loading spinner
function showLoadingSpinner(divName) {
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.innerHTML = 'Loading data...';
  document.getElementById(divName).appendChild(spinner);
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
  let groupsGrouped = groupRows.groupby(['Key2']);
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
    tableCell.textContent = tableName;
    row.appendChild(tableCell);

    uniqueGroups.forEach((groupName) => {
      const cell = document.createElement('td');
      let hasPermission =
        df.query(
          df['Key1']
            .eq('Group')
            .and(df['Key2'].eq(groupName))
            .and(df['Key3'].eq('Table'))
            .and(df['Key4'].eq(tableName))
        ).shape[0] > 0;

      cell.textContent = hasPermission ? 'Yes' : 'No';
      cell.style.backgroundColor = hasPermission ? 'lightgreen' : 'lightcoral';
      row.appendChild(cell);
    });

    table.appendChild(row);
  });

  groupPermTable.innerHTML = ''; // Clear previous table
  groupPermTable.appendChild(table);
}

// function getTabs(df, group) {
// TODO
// }

function createGroupExplanation(df, uniqueGroups) {
  groupSection.innerHTML = '';
  uniqueGroups.forEach((group) => {
    let groupInfo = document.createElement('div');
    let itemAnchor = `${group.replace(/\s+/g, '-')}`;
    groupInfo.classList.add('group-info');
    groupInfo.innerHTML = `<h3 id="${itemAnchor}">${group}</h3><p>Modules with specific access settings:</p>`;
    // show values (column "Value") listed for each group (look in column "Key4), where Key 1 = "Group", Key2 = group name, and Key 3 = "Table Access".
    let modulesArr = df.query(
      df['Key1']
        .eq('Group')
        .and(df['Key2'].eq(group))
        .and(df['Key3'].eq('Table Access'))
    )['Value'].values;
    let moduleList = document.createElement('ul');
    // if there are no modules, show a message
    if (modulesArr.length === 0) {
      let listItem = document.createElement('li');
      listItem.innerHTML =
        'No module access settings specified. See <a href="#Default">Default</a> to see what applies.';
      moduleList.appendChild(listItem);
    }
    modulesArr.forEach((module) => {
      // split module by semicolon and add each in new li
      module
        .split(';')
        .sort()
        .forEach((mod) => {
          let listItem = document.createElement('li');
          listItem.textContent = mod.trim();
          moduleList.appendChild(listItem);
        });
    });
    groupInfo.appendChild(moduleList);
    groupSection.appendChild(groupInfo);
  });
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
          df.columns.map((c) => c.toLowerCase()).includes(col)
        )
      ) {
        alert('CSV file is missing required columns: ' + minCols.join(', '));
        return;
      } else {
        console.log(
          `DataFrame loaded with ${df.shape[0]} rows and ${df.shape[1]} columns.`
        );
        fileInfo.textContent = `Loaded CSV file: ${file.name} with ${df.shape[0]} rows and ${df.shape[1]} columns.`;
      }
      // Proceed with processing the DataFrame
      const uniqueGroups = getGroupsList(df);
      createGroupPermissionTable(df, uniqueGroups);
      createGroupExplanation(df, uniqueGroups);
    })
    .catch((err) => {
      console.error('Error loading CSV:', err);
    });
});
