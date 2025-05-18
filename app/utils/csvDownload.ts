/**
 * Utility function to handle downloading CSV data
 * @param csvContent The CSV content as a string
 * @param fileName The name of the file to download
 * @returns Promise that resolves when download is complete
 */
export const downloadCSV = (csvContent: string, fileName: string): void => {
  if (!csvContent) {
    console.error('No data available for CSV export');
    alert('No data available for export');
    return;
  }
  
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  
  // Append to the document and trigger click
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log(`${fileName} downloaded successfully`);
};

/**
 * Generic function to handle CSV download with loading state
 * @param fetchDataFn The function to fetch the CSV content
 * @param fileName The name of the file to download
 * @param setIsLoading Function to update loading state
 */
export const handleCSVDownload = async (
  fetchDataFn: () => Promise<string>,
  fileName: string,
  setIsLoading: (isLoading: boolean) => void
): Promise<void> => {
  if (setIsLoading) setIsLoading(true);
  
  try {
    const csvContent = await fetchDataFn();
    downloadCSV(csvContent, fileName);
  } catch (error) {
    console.error(`Error downloading ${fileName}:`, error);
    alert('Failed to download data. Please try again.');
  } finally {
    if (setIsLoading) setIsLoading(false);
  }
}; 