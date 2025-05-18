const fs = require('fs');
const path = require('path');

// Specific charts that need custom color mapping
const SPECIFIC_CHART_UPDATES = [
  {
    pattern: /REV\/issuance-burn\/SolBurnChart\.tsx/,
    colorMap: {
      burnBar: 'revChartColors.solBurn',
      cumulativeLine: 'revChartColors.cumulativeBurn'
    }
  },
  {
    pattern: /REV\/issuance-burn\/RewardsAndBurnChart\.tsx/,
    colorMap: {
      solBurn: 'revChartColors.solBurn',
      stakingReward: 'revChartColors.stakingReward',
      votingReward: 'revChartColors.votingReward'
    }
  },
  {
    pattern: /REV\/cost-capacity\/TransactionMetricsChart\.tsx/,
    colorMap: {
      total_vote_transactions: 'revChartColors.totalVoteTransactions',
      total_non_vote_transactions: 'revChartColors.totalNonVoteTransactions',
      successful_transactions_perc: 'revChartColors.successfulTransactionsPerc',
      successful_non_vote_transactions_perc: 'revChartColors.successfulNonVoteTransactionsPerc'
    }
  },
  {
    pattern: /DEX\/volume\/VolumeHistoryChart\.tsx/,
    colorMap: {
      volumeBar: 'dexChartColors.volumeBar'
    }
  },
  {
    pattern: /DEX\/traders\/TradersCategoryChart\.tsx/,
    colorMap: {
      '"<1k USD "': 'dexChartColors.smallTrader',
      '"1k-10k USD"': 'dexChartColors.mediumTrader',
      '"10k-50k USD"': 'dexChartColors.largeTrader',
      '"50k-500k USD"': 'dexChartColors.veryLargeTrader',
      '"500k-2.5M USD"': 'dexChartColors.whaleTrader',
      '">2.5M USD"': 'dexChartColors.megaWhaleTrader'
    }
  },
  {
    pattern: /REV\/total-economic-value\/EconomicValueChart\.tsx/,
    colorMap: {
      real_economic_value_sol: 'revChartColors.realEconomicValueSol',
      total_economic_value_sol: 'revChartColors.totalEconomicValueSol',
      real_economic_value_usd: 'revChartColors.realEconomicValueUsd',
      total_economic_value_usd: 'revChartColors.totalEconomicValueUsd'
    }
  },
  {
    pattern: /protocol-revenue\/summary\/ProtocolRevenueChart\.tsx/,
    colorMap: {
      protocolRevenue: 'protocolRevenueColors.protocolRevenue',
      solanaRevenue: 'protocolRevenueColors.solanaRevenue'
    }
  },
  {
    pattern: /overview\/network-usage\/TxnStatsChart\.tsx/,
    colorMap: {
      'Total_Vote_Transactions': 'overviewChartColors.totalVoteTransactions',
      'Total_Non_Vote_Transactions': 'overviewChartColors.totalNonVoteTransactions',
      'Succeesful_Transactions_perc': 'overviewChartColors.successfulTransactionsPerc',
      'Successful_Non_Vote_Transactiosn_perc': 'overviewChartColors.successfulNonVoteTransactionsPerc'
    }
  }
];

// Function to update specific chart color objects
function updateSpecificCharts() {
  // Chart directories to scan
  const chartDirs = [
    './app/components/charts/REV',
    './app/components/charts/DEX',
    './app/components/charts/protocol-revenue',
    './app/components/charts/overview',
    './app/components/charts/stablecoins'
  ];
  
  // Find all chart files
  const chartFiles = [];
  for (const dir of chartDirs) {
    if (fs.existsSync(dir)) {
      findTsxFiles(dir, chartFiles);
    }
  }
  
  console.log(`Found ${chartFiles.length} chart files to check for specific color mappings`);
  
  // Process each file
  for (const filePath of chartFiles) {
    // Check if this file matches any of our specific patterns
    const matchingUpdates = SPECIFIC_CHART_UPDATES.filter(update => 
      update.pattern.test(filePath)
    );
    
    if (matchingUpdates.length > 0) {
      console.log(`Applying specific color mapping to: ${filePath}`);
      
      // Read the file
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Apply each matching update
      for (const update of matchingUpdates) {
        // Apply the color mappings
        for (const [key, value] of Object.entries(update.colorMap)) {
          const keyPattern = new RegExp(`${key}:\\s*['"]#[0-9a-fA-F]{3,6}['"]`, 'g');
          content = content.replace(keyPattern, `${key}: ${value}`);
        }
      }
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
  
  console.log('Specific chart color updates complete!');
}

// Function to find all TSX files in directories recursively
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

// Run the update
updateSpecificCharts(); 