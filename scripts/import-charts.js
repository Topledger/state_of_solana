const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
let charts;

try {
  charts = JSON.parse(fs.readFileSync('./charts.json', 'utf8'));
} catch (error) {
  console.error('Error reading charts.json file:', error);
  process.exit(1);
}

async function importCharts() {
  console.log(`Found ${charts.length} charts to import`);
  
  for (const chart of charts) {
    try {
      // Check if chart already exists
      const existingChart = await prisma.chart.findUnique({
        where: { id: chart.id }
      });
      
      if (existingChart) {
        console.log(`Chart ${chart.id} (${chart.title}) already exists, updating...`);
        await prisma.chart.update({
          where: { id: chart.id },
          data: {
            title: chart.title,
            page: chart.page,
            config: JSON.stringify(chart),
            updatedAt: new Date(chart.updatedAt || new Date())
          }
        });
      } else {
        console.log(`Importing chart: ${chart.title}`);
        await prisma.chart.create({
          data: {
            id: chart.id,
            title: chart.title,
            page: chart.page,
            config: JSON.stringify(chart),
            createdAt: new Date(chart.createdAt || new Date()),
            updatedAt: new Date(chart.updatedAt || new Date())
          }
        });
      }
    } catch (error) {
      console.error(`Error importing chart ${chart.id} (${chart.title}):`, error);
    }
  }
  console.log('Import complete');
}

importCharts()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('Error during import:', e);
    prisma.$disconnect();
    process.exit(1);
  }); 