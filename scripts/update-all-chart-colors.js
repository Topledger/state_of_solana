const { exec } = require('child_process');

console.log('Starting chart color update process...');
console.log('------------------------------------');

console.log('1. Running general chart color replacements...');
exec('node scripts/update-chart-colors.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  
  console.log(stdout);
  console.log('General chart color replacements completed.');
  console.log('------------------------------------');
  
  console.log('2. Running specific chart component updates...');
  exec('node scripts/update-specific-chart-colors.js', (error2, stdout2, stderr2) => {
    if (error2) {
      console.error(`Error: ${error2.message}`);
      return;
    }
    
    if (stderr2) {
      console.error(`Stderr: ${stderr2}`);
      return;
    }
    
    console.log(stdout2);
    console.log('Specific chart component updates completed.');
    console.log('------------------------------------');
    
    console.log('All chart color updates completed successfully!');
    console.log('Next steps:');
    console.log('1. Run your app to verify the charts are displaying correctly');
    console.log('2. Check for any missed color references');
    console.log('3. Update any new charts manually if needed');
    console.log('------------------------------------');
  });
}); 