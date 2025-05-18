const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CHARTS_DIR = './app/components/charts';
const COLOR_IMPORTS = {
  'REV': "import { revChartColors, chartStyleColors } from '../../../../utils/chartColors';",
  'DEX': "import { dexChartColors, chartStyleColors } from '../../../../utils/chartColors';",
  'protocol-revenue': "import { protocolRevenueColors, chartStyleColors } from '../../../../utils/chartColors';",
  'overview': "import { overviewChartColors, chartStyleColors } from '../../../../utils/chartColors';",
  'stablecoins': "import { stablecoinColors, chartStyleColors } from '../../../../utils/chartColors';"
};

// Common color replacements
const COLOR_REPLACEMENTS = {
  // Grid/Axes
  '#1f2937': 'chartStyleColors.grid',
  '#374151': 'chartStyleColors.axisLines',
  '#6b7280': 'chartStyleColors.tickLabels',
  '#9ca3af': 'chartStyleColors.tickLabels',
  'rgba(255, 255, 255, 0.05)': 'chartStyleColors.background',
  
  // Common colors
  '#60a5fa': 'baseColors.blue',
  '#a78bfa': 'baseColors.purple',
  '#34d399': 'baseColors.green',
  '#f97316': 'baseColors.orange',
  '#ef4444': 'baseColors.red',
  '#facc15': 'baseColors.yellow',
  '#ec4899': 'baseColors.pink',
  '#8b5cf6': 'baseColors.indigo',
  '#10B981': 'baseColors.teal',
  '#0EA5E9': 'baseColors.cyan',
  '#475569': 'baseColors.gray',
  
  // Lighter shades
  '#93c5fd': 'baseColors.lightBlue',
  '#c4b5fd': 'baseColors.lightPurple',
  '#6ee7b7': 'baseColors.lightGreen',
  '#fb923c': 'baseColors.lightOrange',
  '#f87171': 'baseColors.lightRed',
  '#fcd34d': 'baseColors.lightYellow',
  
  // Darker shades
  '#3b82f6': 'baseColors.darkBlue',
  '#8b5cf6': 'baseColors.darkPurple',
  '#059669': 'baseColors.darkGreen',
  '#ea580c': 'baseColors.darkOrange',
  '#dc2626': 'baseColors.darkRed',
  '#d97706': 'baseColors.darkYellow',
};

// Function to find all TypeScript files in directories recursively
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') && file.includes('Chart')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to add color imports if they don't exist
function addColorImports(content, filePath) {
  // Check which category the file belongs to
  let categoryImport = null;
  for (const [category, importStatement] of Object.entries(COLOR_IMPORTS)) {
    if (filePath.includes(category)) {
      categoryImport = importStatement;
      break;
    }
  }
  
  if (!categoryImport) {
    // Default import if no specific category is found
    categoryImport = "import { baseColors, chartStyleColors } from '../../../../utils/chartColors';";
  }
  
  // Check if there's already a chartColors import
  if (content.includes('utils/chartColors')) {
    return content;
  }
  
  // Find the last import statement
  const lastImportIndex = content.lastIndexOf('import ');
  if (lastImportIndex === -1) return content;
  
  const importEndIndex = content.indexOf(';', lastImportIndex) + 1;
  if (importEndIndex === 0) return content;
  
  // Insert our import after the last import
  return content.substring(0, importEndIndex) + '\n' + categoryImport + content.substring(importEndIndex);
}

// Function to replace color hex values with references to the color system
function replaceColors(content) {
  let updatedContent = content;
  
  // Replace hardcoded color values in color objects
  for (const [hexColor, colorRef] of Object.entries(COLOR_REPLACEMENTS)) {
    const colorPattern = new RegExp(`['"]${hexColor}['"]( \/\/ .+)?`, 'g');
    updatedContent = updatedContent.replace(colorPattern, colorRef);
  }
  
  return updatedContent;
}

// Main function
async function updateChartFiles() {
  const chartFiles = findTsxFiles(CHARTS_DIR);
  console.log(`Found ${chartFiles.length} chart files to process...`);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  try {
    for (let i = 0; i < chartFiles.length; i++) {
      const filePath = chartFiles[i];
      console.log(`Processing (${i+1}/${chartFiles.length}): ${filePath}`);
      
      // Read the file
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Update the content
      let updatedContent = addColorImports(content, filePath);
      updatedContent = replaceColors(updatedContent);
      
      // Write the updated content back to the file
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Updated: ${filePath}`);
      } else {
        console.log(`No changes needed for: ${filePath}`);
      }
      
      // Ask to continue every 5 files
      if ((i + 1) % 5 === 0 && i < chartFiles.length - 1) {
        const answer = await question('Continue with the next batch? (y/n): ');
        if (answer.toLowerCase() !== 'y') {
          console.log('Operation cancelled by user.');
          break;
        }
      }
    }
    
    console.log('Chart color update complete!');
  } finally {
    rl.close();
  }
}

updateChartFiles(); 