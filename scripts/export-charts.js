// This script helps extract chart data from localStorage
// Open your browser console on http://localhost:3000 and run:

/*
Copy and paste this code in your browser console:

const charts = JSON.parse(localStorage.getItem('solana-charts'));
console.log(JSON.stringify(charts, null, 2));

Copy the output and save it to a file named charts.json
Then run the import script with: node scripts/import-charts.js
*/

console.log("This is a helper script with instructions for exporting charts from localStorage.");
console.log("Open your browser console and follow the instructions in this file.");

// This is just a reference script - the real work is done in the browser
function exportChartsFromLocalStorage() {
  try {
    const charts = JSON.parse(localStorage.getItem('solana-charts'));
    if (!charts || !Array.isArray(charts) || charts.length === 0) {
      console.log('No charts found in localStorage');
      return null;
    }
    return JSON.stringify(charts, null, 2);
  } catch (error) {
    console.error('Error exporting charts:', error);
    return null;
  }
} 