"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AVAILABLE_PAGES, CHART_TYPES, ChartFormData, ChartType, YAxisConfig, DualAxisConfig } from '../types';
import { formDataToConfig, validateApiEndpoint, saveChartConfig } from '../utils';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormCheckbox from '../components/FormCheckbox';
import FormTextarea from '../components/FormTextarea';
import Button from '../components/Button';
import Link from 'next/link';
import FormMultiInput from '../components/FormMultiInput';
import FormMultiInputWithType from '../components/FormMultiInputWithType';

export default function ChartCreatorPage() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<ChartFormData>({
    title: '',
    subtitle: '',
    page: '' as any,
    section: '',
    chartType: '' as any,
    apiEndpoint: '',
    apiKey: '',
    isStacked: false,
    colorScheme: 'default',
    dataMapping: {
      xAxis: '',
      yAxis: '',
      groupBy: '',
    }
  });
  
  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // API validation state
  const [isValidatingApi, setIsValidatingApi] = useState(false);
  const [apiValidationResult, setApiValidationResult] = useState<{
    valid: boolean;
    message?: string;
    data?: any;
  } | null>(null);
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successConfig, setSuccessConfig] = useState<{id: string, page: string} | null>(null);
  
  // Add state to track multi-input mode
  const [useMultipleFields, setUseMultipleFields] = useState({
    xAxis: false,
    yAxis: false
  });
  
  // Track dual axis configuration
  const [isDualAxis, setIsDualAxis] = useState(false);
  const [dualAxisConfig, setDualAxisConfig] = useState<DualAxisConfig>({
    leftAxisType: 'bar',
    rightAxisType: 'line',
    leftAxisFields: [],
    rightAxisFields: []
  });
  
  // Add state for filter configuration
  const [enableFilters, setEnableFilters] = useState({
    timeFilter: false,
    currencyFilter: false
  });
  
  // Add state for filter parameters
  const [filterParams, setFilterParams] = useState({
    timeFilter: {
      options: ['D', 'W', 'M', 'Q', 'Y'],
      paramName: 'Date Part'
    },
    currencyFilter: {
      options: ['USD', 'SOL', 'USDe'],
      paramName: 'currency'
    }
  });
  
  // Add state for menu selection
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  
  // Define menu options and their pages
  const MENU_OPTIONS = [
    { id: 'overview', name: 'Overview', icon: 'home' },
    { id: 'dex', name: 'DEX', icon: 'chart-bar' },
    { id: 'rev', name: 'REV', icon: 'currency-dollar' },
    { id: 'stablecoins', name: 'Stablecoins', icon: 'coin' },
    { id: 'protocol-revenue', name: 'Protocol Revenue', icon: 'chart-pie' }
  ];
  
  // Available pages based on the selected menu
  const [availablePages, setAvailablePages] = useState<Array<{id: string, name: string, path: string}>>([]);
  
  // Update available pages when menu selection changes
  useEffect(() => {
    if (!selectedMenu) {
      setAvailablePages([]);
      return;
    }
    
    // Define pages for each menu
    switch (selectedMenu) {
      case 'overview':
        setAvailablePages([
          { id: 'dashboard', name: 'User Activity', path: '/dashboard' },
          { id: 'network-usage', name: 'Network Usage', path: '/network-usage' },
          { id: 'protocol-rev', name: 'Protocol Revenue', path: '/protocol-rev' },
          { id: 'market-dynamics', name: 'Market Dynamics', path: '/market-dynamics' }
        ]);
        break;
      case 'dex':
        setAvailablePages([
          { id: 'summary', name: 'Summary', path: '/dex/summary' },
          { id: 'volume', name: 'Volume', path: '/dex/volume' },
          { id: 'tvl', name: 'TVL', path: '/dex/tvl' },
          { id: 'traders', name: 'Traders', path: '/dex/traders' },
          { id: 'aggregators', name: 'DEX Aggregators', path: '/dex/aggregators' }
        ]);
        break;
      case 'rev':
        setAvailablePages([
          { id: 'overview', name: 'Summary', path: '/rev' },
          { id: 'cost-capacity', name: 'Cost & Capacity', path: '/rev/cost-capacity' },
          { id: 'issuance-burn', name: 'Issuance & Burn', path: '/rev/issuance-burn' },
          { id: 'total-economic-value', name: 'Total Economic Value', path: '/rev/total-economic-value' },
          { id: 'breakdown', name: 'Breakdown', path: '/rev/breakdown' }
        ]);
        break;
      case 'stablecoins':
        setAvailablePages([
          { id: 'stablecoin-usage', name: 'Stablecoin Usage', path: '/stablecoins/stablecoin-usage' },
          { id: 'transaction-activity', name: 'Transaction Activity', path: '/stablecoins/transaction-activity' },
          { id: 'liquidity-velocity', name: 'Liquidity Velocity', path: '/stablecoins/liquidity-velocity' },
          { id: 'mint-burn', name: 'Mint & Burn', path: '/stablecoins/mint-burn' },
          { id: 'platform-exchange', name: 'Platform & Exchange', path: '/stablecoins/platform-exchange' },
          { id: 'tvl', name: 'TVL', path: '/stablecoins/tvl' }
        ]);
        break;
      case 'protocol-revenue':
        setAvailablePages([
          { id: 'summary', name: 'Summary', path: '/protocol-revenue/summary' },
          { id: 'total', name: 'Total', path: '/protocol-revenue/total' },
          { id: 'dex-ecosystem', name: 'DEX Ecosystem', path: '/protocol-revenue/dex-ecosystem' },
          { id: 'nft-ecosystem', name: 'NFT Ecosystem', path: '/protocol-revenue/nft-ecosystem' },
          { id: 'depin', name: 'DePin', path: '/protocol-revenue/depin' }
        ]);
        break;
      default:
        setAvailablePages([]);
    }
  }, [selectedMenu]);
  
  // Handle menu selection change
  const handleMenuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuId = e.target.value;
    setSelectedMenu(menuId);
    
    // Reset page selection when menu changes with proper type casting
    setFormData(prev => ({
      ...prev,
      page: '' as any // Using 'any' to work around the strict type checking
    }));
    
    // Clear page-related errors
    if (errors.page) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated.page;
        return updated;
      });
    }
    
    // Mark menu as touched
    setTouched(prev => ({
      ...prev,
      menu: true
    }));
  };
  
  // Modified handleInputChange to handle string input directly
  const handleInputChange = (name: string, value: string) => {
    if (name.includes('.')) {
      // Handle nested properties (like dataMapping.xAxis)
      const [parent, child] = name.split('.');
      
      if (parent === 'dataMapping') {
        setFormData(prev => ({
          ...prev,
          dataMapping: {
            ...prev.dataMapping,
            [child]: value
          }
        }));
      }
    } else {
      // Handle simple properties
      if (name === 'chartType') {
        // Auto-check isStacked for stacked chart types
        const chartType = value as ChartType;
        const wasStackedChart = (prev: ChartFormData) => prev.chartType === 'stacked-bar' || prev.chartType === 'stacked-area';
        const isStackedChart = chartType === 'stacked-bar' || chartType === 'stacked-area';
        
        // If switching to stacked bar, enable multi-input for y-axis by default
        if (chartType === 'stacked-bar' && !useMultipleFields.yAxis) {
          setUseMultipleFields(prev => ({
            ...prev,
            yAxis: true
          }));
          
          // Convert current y-axis to array if it's a string
          setFormData(prev => {
            const currentYAxis = prev.dataMapping.yAxis;
            return {
              ...prev,
              chartType,
              isStacked: isStackedChart || (prev.isStacked && !wasStackedChart(prev)),
              dataMapping: {
                ...prev.dataMapping,
                yAxis: typeof currentYAxis === 'string' && currentYAxis ? [currentYAxis] : (Array.isArray(currentYAxis) ? currentYAxis : [])
              }
            };
          });
        } else {
          setFormData(prev => ({
            ...prev,
            [name]: chartType,
            // If switching from stacked to non-stacked, turn off isStacked
            // If switching to stacked, turn on isStacked
            isStacked: isStackedChart || (prev.isStacked && !wasStackedChart(prev))
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Add a handler for multi-input fields
  const handleMultiInputChange = (fieldName: string, values: string[]) => {
    const [parent, child] = fieldName.split('.');
    
    if (parent === 'dataMapping') {
      setFormData(prev => {
        // Create a properly typed update for dataMapping
        const updatedDataMapping = { ...prev.dataMapping };
        
        // Handle x and y axis separately to maintain proper typing
        if (child === 'xAxis') {
          // xAxis can only be string or string[]
          updatedDataMapping.xAxis = values.length === 1 ? values[0] : values;
        } else if (child === 'yAxis') {
          // yAxis can be string, string[] or YAxisConfig[]
          updatedDataMapping.yAxis = values.length === 1 ? values[0] : values;
        } else if (child === 'groupBy') {
          // groupBy is a string or undefined
          updatedDataMapping.groupBy = values.length === 1 ? values[0] : undefined;
        }
        
        return {
          ...prev,
          dataMapping: updatedDataMapping
        };
      });
    }
    
    // Mark as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    // Clear error if exists
    if (errors[fieldName]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  };
  
  // Add a handler for multi-input fields with chart type
  const handleMultiInputWithTypeChange = (fieldName: string, values: YAxisConfig[]) => {
    const [parent, child] = fieldName.split('.');
    
    console.log('handleMultiInputWithTypeChange called with:', fieldName, values);
    
    if (parent === 'dataMapping' && child === 'yAxis') {
      // When in dual-axis mode, we'll update both the dataMapping.yAxis
      // and the dualAxisConfig arrays based on the rightAxis flag
      if (isDualAxis) {
        // Update the dualAxisConfig with the new assignments
        const leftFields = values.filter(val => !val.rightAxis).map(val => val.field);
        const rightFields = values.filter(val => val.rightAxis).map(val => val.field);
        
        setDualAxisConfig(prev => ({
          ...prev,
          leftAxisFields: leftFields,
          rightAxisFields: rightFields
        }));
      }
      
      setFormData(prev => {
        // Create a properly typed update for dataMapping
        const updatedDataMapping = { ...prev.dataMapping };
        
        // Set the yAxis value ensuring we maintain the correct type
        updatedDataMapping.yAxis = values;
        
        return {
          ...prev,
          dataMapping: updatedDataMapping
        };
      });
    }
    
    // Mark as touched
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    // Clear error if exists
    if (errors[fieldName]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  };
  
  // Toggle between single and multi-input modes
  const toggleMultiInput = (field: 'xAxis' | 'yAxis') => {
    setUseMultipleFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    
    // When switching to multi-input, convert string to array
    // When switching to single input, keep only the first value if array
    setFormData(prev => {
      const currentValue = prev.dataMapping[field];
      
      // Define a properly typed return value for the dataMapping update
      let updatedDataMapping = {...prev.dataMapping};
      
      if (!useMultipleFields[field]) {
        // Switching to multi-input
        if (field === 'yAxis') {
          // For Y-axis, create YAxisConfig objects with default chart type = 'bar'
          let newYValue: YAxisConfig[];
          
          if (typeof currentValue === 'string' && currentValue) {
            // Initialize with bar type but allow user to toggle
            const unit = prev.dataMapping.yAxisUnit || ''; // Preserve the single field unit
            newYValue = [{ field: currentValue, type: 'bar' as const, unit }];
          } else if (Array.isArray(currentValue) && currentValue.length > 0) {
            // Convert simple string array to YAxisConfig array
            if (typeof currentValue[0] === 'string') {
              const unit = prev.dataMapping.yAxisUnit || ''; // Preserve the single field unit
              newYValue = (currentValue as string[]).map(field => ({ field, type: 'bar' as const, unit }));
            } else {
              // Already in right format
              newYValue = currentValue as YAxisConfig[];
            }
          } else {
            newYValue = [];
          }
          
          // Update dataMapping
          updatedDataMapping = {
            ...updatedDataMapping,
            yAxis: newYValue,
            yAxisUnit: undefined // Clear the single-field unit
          };
        } else {
          // For X-axis, just use string array
          const newXValue: string[] = typeof currentValue === 'string' && currentValue ? [currentValue] : [];
          updatedDataMapping = {
            ...updatedDataMapping,
            xAxis: newXValue
          };
        }
      } else {
        // Switching to single input
        if (field === 'yAxis') {
          // Handle Y-axis case
          let newYValue: string = '';
          let unit: string | undefined = undefined;
          
          if (Array.isArray(currentValue) && currentValue.length > 0) {
            const firstItem = currentValue[0];
            if (typeof firstItem === 'object' && 'field' in firstItem) {
              // It's a YAxisConfig object
              const firstConfig = firstItem as YAxisConfig;
              newYValue = firstConfig.field;
              unit = firstConfig.unit; // Get the unit from the first YAxisConfig
            } else if (typeof firstItem === 'string') {
              // It's a string
              newYValue = firstItem;
            }
          }
          
          // Update dataMapping
          updatedDataMapping = {
            ...updatedDataMapping,
            yAxis: newYValue,
            yAxisUnit: unit
          };
        } else {
          // Handle X-axis case
          let newXValue: string = '';
          
          if (Array.isArray(currentValue) && currentValue.length > 0) {
            newXValue = currentValue[0] as string;
          }
          
          // Update dataMapping
          updatedDataMapping = {
            ...updatedDataMapping,
            xAxis: newXValue
          };
        }
      }
      
      // Return updated form data with the updated dataMapping
      return {
        ...prev,
        dataMapping: updatedDataMapping
      };
    });
  };
  
  // Toggle filter checkboxes
  const toggleFilter = (filterName: keyof typeof enableFilters) => {
    setEnableFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
    
    // Add appropriate filter configuration to additionalOptions when enabled
    setFormData(prev => {
      const additionalOptions = prev.additionalOptions || {};
      
      if (!enableFilters[filterName]) {
        // Enabling the filter, add configuration
        additionalOptions.filters = {
          ...(additionalOptions.filters || {}),
          [filterName]: filterParams[filterName]
        };
      } else {
        // Disabling the filter, remove configuration
        if (additionalOptions.filters) {
          const { [filterName]: _, ...remainingFilters } = additionalOptions.filters;
          additionalOptions.filters = Object.keys(remainingFilters).length > 0 ? remainingFilters : undefined;
        }
      }
      
      return {
        ...prev,
        additionalOptions: Object.keys(additionalOptions).length > 0 ? additionalOptions : {}
      };
    });
  };
  
  // Handle filter parameter changes
  const handleFilterParamChange = (
    filterName: keyof typeof filterParams,
    field: keyof typeof filterParams.timeFilter,
    value: string | string[]
  ) => {
    setFilterParams(prev => ({
      ...prev,
      [filterName]: {
        ...prev[filterName],
        [field]: value
      }
    }));
    
    // Update additionalOptions if the filter is enabled
    if (enableFilters[filterName]) {
      setFormData(prev => {
        const additionalOptions = prev.additionalOptions || {};
        
        additionalOptions.filters = {
          ...(additionalOptions.filters || {}),
          [filterName]: {
            ...(additionalOptions.filters?.[filterName] || {}),
            [field]: value
          }
        };
        
        return {
          ...prev,
          additionalOptions
        };
      });
    }
  };
  
  // Toggle dual axis mode
  const toggleDualAxis = () => {
    // Only allow toggling dual axis when we have multiple y-axis fields
    if (!useMultipleFields.yAxis) {
      alert('Please enable multiple y-axis fields first to use dual axis');
      return;
    }
    
    const newIsDualAxis = !isDualAxis;
    setIsDualAxis(newIsDualAxis);
    
    if (newIsDualAxis) {
      // Set chart type to dual-axis when enabling
      setFormData(prev => ({
        ...prev,
        chartType: 'dual-axis'
      }));
      
      // Initialize dual axis configuration based on current fields
      const yAxisFields = Array.isArray(formData.dataMapping.yAxis) 
        ? formData.dataMapping.yAxis 
        : formData.dataMapping.yAxis ? [formData.dataMapping.yAxis] : [];
      
      // Extract string fields from YAxisConfig if needed
      const fieldNames = yAxisFields.map(field => 
        typeof field === 'string' ? field : field.field
      );
      
      // By default, put first field on left axis, rest on right
      const leftFields = fieldNames.length > 0 ? [fieldNames[0]] : [];
      const rightFields = fieldNames.length > 1 ? fieldNames.slice(1) : [];
      
      setDualAxisConfig({
        leftAxisType: 'bar',
        rightAxisType: 'line',
        leftAxisFields: leftFields,
        rightAxisFields: rightFields
      });
      
      // Add rightAxis flags to the YAxisConfig objects
      if (Array.isArray(formData.dataMapping.yAxis) && typeof formData.dataMapping.yAxis[0] !== 'string') {
        const updatedYAxisConfigs = (formData.dataMapping.yAxis as YAxisConfig[]).map((config, index) => ({
          ...config,
          rightAxis: index > 0 // First field on left, rest on right by default
        }));
        
        setFormData(prev => ({
          ...prev,
          dataMapping: {
            ...prev.dataMapping,
            yAxis: updatedYAxisConfigs
          }
        }));
      }
    } else {
      // Reset to standard chart type when disabling
      setFormData(prev => {
        // Remove rightAxis flags from YAxisConfig objects when disabling dual axis
        let updatedYAxis = prev.dataMapping.yAxis;
        if (Array.isArray(updatedYAxis) && typeof updatedYAxis[0] !== 'string') {
          updatedYAxis = (updatedYAxis as YAxisConfig[]).map(config => ({
            field: config.field,
            type: config.type
          }));
        }
        
        return {
          ...prev,
          chartType: 'bar',
          dualAxisConfig: undefined,
          dataMapping: {
            ...prev.dataMapping,
            yAxis: updatedYAxis
          }
        };
      });
    }
  };

  // Update dual axis configuration
  const updateDualAxisConfig = (
    key: keyof DualAxisConfig, 
    value: string | string[]
  ) => {
    setDualAxisConfig(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Update form data with the new configuration
    setFormData(prev => ({
      ...prev,
      dualAxisConfig: {
        ...prev.dualAxisConfig || dualAxisConfig,
        [key]: value
      }
    }));
  };

  // Move fields between axes
  const moveFieldBetweenAxes = (field: string, destination: 'left' | 'right') => {
    setDualAxisConfig(prev => {
      let newLeftFields = [...prev.leftAxisFields];
      let newRightFields = [...prev.rightAxisFields];
      
      if (destination === 'left') {
        // Remove from right and add to left
        newRightFields = newRightFields.filter(f => f !== field);
        if (!newLeftFields.includes(field)) {
          newLeftFields.push(field);
        }
      } else {
        // Remove from left and add to right
        newLeftFields = newLeftFields.filter(f => f !== field);
        if (!newRightFields.includes(field)) {
          newRightFields.push(field);
        }
      }
      
      return {
        ...prev,
        leftAxisFields: newLeftFields,
        rightAxisFields: newRightFields
      };
    });
    
    // Update form data with the new field configurations
    setFormData(prev => ({
      ...prev,
      dualAxisConfig: {
        ...prev.dualAxisConfig || dualAxisConfig,
        leftAxisFields: destination === 'left' 
          ? [...dualAxisConfig.leftAxisFields.filter(f => f !== field), field]
          : dualAxisConfig.leftAxisFields.filter(f => f !== field),
        rightAxisFields: destination === 'right'
          ? [...dualAxisConfig.rightAxisFields.filter(f => f !== field), field]
          : dualAxisConfig.rightAxisFields.filter(f => f !== field)
      }
    }));
  };
  
  // Validate form fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.title) newErrors.title = 'Title is required';
    if (!selectedMenu) newErrors.menu = 'Menu option is required';
    if (!formData.page) newErrors.page = 'Page is required';
    if (!formData.chartType) newErrors.chartType = 'Chart type is required';
    if (!formData.apiEndpoint) newErrors.apiEndpoint = 'API endpoint is required';
    
    // For x-axis validation
    const xAxisValue = formData.dataMapping.xAxis;
    if (!xAxisValue || (Array.isArray(xAxisValue) && xAxisValue.length === 0)) {
      newErrors['dataMapping.xAxis'] = 'X-axis mapping is required';
    }
    
    // For y-axis validation
    const yAxisValue = formData.dataMapping.yAxis;
    if (!yAxisValue || (Array.isArray(yAxisValue) && yAxisValue.length === 0)) {
      newErrors['dataMapping.yAxis'] = 'Y-axis mapping is required';
    }
    
    // Additional validation for stacked charts
    if (formData.isStacked) {
      const yAxisArray = Array.isArray(yAxisValue) ? yAxisValue : [yAxisValue];
      
      // For stacked charts, either need groupBy OR multiple y-axis fields
      if (!formData.dataMapping.groupBy && (!Array.isArray(yAxisValue) || yAxisValue.length < 2)) {
        newErrors['dataMapping.yAxis'] = 'Stacked charts require either a Group By field or multiple Y-axis fields';
      }
    }
    
    // Validation for filters
    const enabledFilterCount = Object.values(enableFilters).filter(Boolean).length;
    
    // Check for empty filter parameters
    Object.entries(enableFilters).forEach(([filterName, isEnabled]) => {
      if (isEnabled) {
        const typedFilterName = filterName as keyof typeof filterParams;
        const filter = filterParams[typedFilterName];
        
        if (!filter.paramName) {
          newErrors[`${filterName}ParamName`] = `Parameter name is required for ${filterName}`;
        }
        
        if (!filter.options || filter.options.length === 0) {
          newErrors[`${filterName}Options`] = `At least one option is required for ${filterName}`;
        }
      }
    });
    
    // API validation
    if (formData.apiEndpoint && !apiValidationResult?.valid) {
      newErrors.apiEndpoint = 'Please validate the API endpoint first';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle API validation
  const handleValidateApi = async () => {
    if (!formData.apiEndpoint) {
      setErrors(prev => ({
        ...prev,
        apiEndpoint: 'API endpoint is required'
      }));
      return;
    }
    
    // Check for common parameter name case issues before validation
    const paramCaseWarnings = checkParameterCaseSensitivity();
    if (paramCaseWarnings.length > 0) {
      if (!confirm(`Potential parameter case issues detected:\n\n${paramCaseWarnings.join('\n')}\n\nDo you want to continue with validation anyway?`)) {
        return;
      }
    }
    
    setIsValidatingApi(true);
    setApiValidationResult(null);
    
    try {
      // Create parameters object from enabled filters
      const testParameters: Record<string, any> = {};
      
      // Add parameters from all enabled filters for comprehensive validation
      if (enableFilters.timeFilter && filterParams.timeFilter.options.length > 0) {
        testParameters[filterParams.timeFilter.paramName] = filterParams.timeFilter.options[0];
      }
      
      if (enableFilters.currencyFilter && filterParams.currencyFilter.options.length > 0) {
        testParameters[filterParams.currencyFilter.paramName] = filterParams.currencyFilter.options[0];
      }
      
      // Check if we have multiple filters enabled for validation warning
      const enabledFilterCount = Object.values(enableFilters).filter(Boolean).length;
      const hasMultipleFilters = enabledFilterCount > 1;
      
      // Only pass parameters if we have some
      const hasParameters = Object.keys(testParameters).length > 0;
      
      // Validate the API endpoint with parameters
      const result = await validateApiEndpoint(
        formData.apiEndpoint, 
        formData.apiKey,
        hasParameters ? testParameters : undefined
      );
      
      setApiValidationResult(result);
      
      if (!result.valid) {
        setErrors(prev => ({
          ...prev,
          apiEndpoint: result.message || 'Invalid API endpoint'
        }));
      } else {
        // If we have multiple filters enabled, do an additional validation to test filter combinations
        if (hasMultipleFilters) {
          await validateApiWithFilters(result);
        } else if (result.data?.columns) {
          // Auto-populate dataMapping fields if we received column data
          const columns = result.data.columns;
          const dateColumns = columns.filter((col: string) => 
            col.toLowerCase().includes('date') || 
            col.toLowerCase().includes('month') || 
            col.toLowerCase().includes('time')
          );
          
          const numericColumns = columns.filter((col: string) => 
            !dateColumns.includes(col) && 
            (col.toLowerCase().includes('revenue') || 
             col.toLowerCase().includes('amount') || 
             col.toLowerCase().includes('value') || 
             col.toLowerCase().includes('count'))
          );
          
          const categoryColumns = columns.filter((col: string) => 
            !dateColumns.includes(col) && 
            !numericColumns.includes(col) && 
            (col.toLowerCase().includes('platform') || 
             col.toLowerCase().includes('category') || 
             col.toLowerCase().includes('segment') || 
             col.toLowerCase().includes('type'))
          );
          
          // Auto-set data mapping if we can make reasonable guesses
          if (dateColumns.length > 0 && numericColumns.length > 0) {
            setFormData(prev => ({
              ...prev,
              dataMapping: {
                xAxis: dateColumns[0],
                yAxis: numericColumns[0],
                groupBy: categoryColumns.length > 0 ? categoryColumns[0] : prev.dataMapping.groupBy
              }
            }));
          }
        }
      }
    } catch (error) {
      setApiValidationResult({
        valid: false,
        message: `Error validating API: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsValidatingApi(false);
    }
  };
  
  // New function to validate multiple filter combinations
  const validateApiWithFilters = async (initialResult: any) => {
    try {
      // Test multiple filter combinations to ensure they work together
      const enabledFilters = [];
      
      if (enableFilters.timeFilter) enabledFilters.push('timeFilter');
      if (enableFilters.currencyFilter) enabledFilters.push('currencyFilter');
      
      // Only proceed if we have multiple filters
      if (enabledFilters.length <= 1) return;
      
      // Create a test combination using the first option of each filter
      const combinedParameters: Record<string, any> = {};
      
      enabledFilters.forEach(filterName => {
        const filter = filterParams[filterName as keyof typeof filterParams];
        if (filter.options.length > 0) {
          combinedParameters[filter.paramName] = filter.options[0];
        }
      });
      
      // Add a note to the initial result about testing combinations
      if (initialResult && initialResult.valid) {
        setApiValidationResult({
          valid: true,
          message: (initialResult.message || 'API validated successfully.') + ' Testing filter combinations...',
          data: initialResult.data
        });
      }
      
      // Test the API with the combined parameters
      const combinedResult = await validateApiEndpoint(
        formData.apiEndpoint,
        formData.apiKey,
        combinedParameters
      );
      
      // Update the validation result with combination test results
      if (combinedResult.valid) {
        setApiValidationResult({
          valid: true,
          message: (initialResult.message || 'API validated successfully.') + ' All filter combinations validated successfully!',
          data: combinedResult.data || initialResult.data
        });
      } else {
        // If the combination fails, warn the user but don't invalidate the entire setup
        setApiValidationResult({
          valid: initialResult.valid,
          message: (initialResult.message || 'API validated successfully.') + ` Warning: Filter combination test failed - ${combinedResult.message}. You may need to adjust your filter parameters.`,
          data: initialResult.data
        });
      }
    } catch (error) {
      console.error('Error validating filter combinations:', error);
      // Don't update the result - we'll keep the initial successful validation
    }
  };
  
  // New function to check parameter case sensitivity against common conventions
  const checkParameterCaseSensitivity = (): string[] => {
    const warnings: string[] = [];
    
    // Common parameter name conventions to check against
    const commonConventions = {
      currency: ['currency', 'currencies'],
      datePart: ['date_part', 'datepart', 'date part'],
    };
    
    // Check each enabled filter
    if (enableFilters.currencyFilter) {
      const paramName = filterParams.currencyFilter.paramName;
      if (paramName && !commonConventions.currency.includes(paramName.toLowerCase())) {
        if (commonConventions.currency.some(conv => conv.toLowerCase() === paramName.toLowerCase())) {
          warnings.push(`"${paramName}" might have incorrect casing. Common format is "currency" (all lowercase).`);
        }
      }
    }
    
    if (enableFilters.timeFilter) {
      const paramName = filterParams.timeFilter.paramName;
      // Special case for TopLedger API which uses "Date Part" with capital letters
      if (paramName && paramName !== "Date Part" && !commonConventions.datePart.includes(paramName.toLowerCase())) {
        if (commonConventions.datePart.some(conv => conv.toLowerCase() === paramName.toLowerCase())) {
          warnings.push(`"${paramName}" might have incorrect casing. TopLedger API typically uses "Date Part" (with capitals).`);
        }
      }
    }
    
    return warnings;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set all fields as touched to show all validation errors
    const allTouched: Record<string, boolean> = {
      menu: true,
      ...Object.keys(formData).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>)
    };
    
    // Add specific data mapping fields
    allTouched['dataMapping.xAxis'] = true;
    allTouched['dataMapping.yAxis'] = true;
    allTouched['dataMapping.groupBy'] = true;
    
    // Add filter fields as touched
    Object.entries(enableFilters).forEach(([filterName, isEnabled]) => {
      if (isEnabled) {
        allTouched[`${filterName}ParamName`] = true;
        allTouched[`${filterName}Options`] = true;
      }
    });
    
    setTouched(allTouched);
    
    // Validate the form
    if (!validateForm()) {
      setSubmitError('Please fix the errors in the form');
      return;
    }
    
    // If we have multiple filters enabled but haven't validated combinations, show a warning
    const enabledFilterCount = Object.values(enableFilters).filter(Boolean).length;
    if (enabledFilterCount > 1 && apiValidationResult && !apiValidationResult.message?.includes('filter combinations')) {
      if (!confirm('You have multiple filters enabled but haven\'t validated their combinations. This might cause issues with the API. Do you want to continue anyway?')) {
        return;
      }
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessConfig(null);
    
    try {
      // Ensure additionalOptions.filters is properly set with all enabled filters
      const updatedFormData = { ...formData };
      
      // Initialize additional options if not already set
      updatedFormData.additionalOptions = updatedFormData.additionalOptions || {};
      
      // Set up filters configuration
      if (enabledFilterCount > 0) {
        updatedFormData.additionalOptions = updatedFormData.additionalOptions || {};
        updatedFormData.additionalOptions.filters = {};
        
        Object.entries(enableFilters).forEach(([filterName, isEnabled]) => {
          if (isEnabled) {
            const typedFilterName = filterName as keyof typeof filterParams;
            if (updatedFormData.additionalOptions && updatedFormData.additionalOptions.filters) {
              updatedFormData.additionalOptions.filters[filterName] = {
                paramName: filterParams[typedFilterName].paramName,
                options: filterParams[typedFilterName].options
              };
            }
          }
        });
      }
      
      // If dual axis is enabled, make sure to include the configuration
      if (isDualAxis) {
        updatedFormData.dualAxisConfig = dualAxisConfig;
      } else {
        // Remove dual axis config if not using it
        updatedFormData.dualAxisConfig = undefined;
      }
      
      // Convert form data to chart config
      const chartConfig = await formDataToConfig(updatedFormData, isDualAxis);
      
      // Save to local storage
      saveChartConfig(chartConfig);
      
      // Set success state with chart info
      setSuccessConfig({
        id: chartConfig.id,
        page: chartConfig.page
      });
    } catch (error) {
      setSubmitError(`Error creating chart: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Chart</h1>
        <p className="mt-2 text-sm text-gray-700">Configure a new chart to add to a page</p>
      </div>
      
      {successConfig && (
        <div className="bg-green-50 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-900">Chart Created Successfully</h3>
              <div className="mt-2 text-sm text-green-800">
                <p>Your chart has been created and added to the selected page.</p>
                <div className="mt-4 flex space-x-4">
                  <Link 
                    href={availablePages.find(p => p.id === successConfig.page)?.path || '#'}
                    target="_blank"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    View on Page
                  </Link>
                  <Link 
                    href="/admin/manage-charts"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-800 bg-green-100 hover:bg-green-200"
                  >
                    Manage Charts
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {submitError && (
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-900">Error</h3>
              <div className="mt-2 text-sm text-red-800">
                <p>{submitError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart Basic Information */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Basic Information</h2>
          </div>
          
          <FormInput
            id="title"
            label="Chart Title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="E.g., Protocol Revenue by Category"
            required
            error={touched.title ? errors.title : undefined}
          />
          
          <FormInput
            id="subtitle"
            label="Chart Subtitle"
            value={formData.subtitle || ''}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
            placeholder="E.g., Monthly revenue breakdown by protocol category"
          />
          
          {/* Replace single page dropdown with menu + page dropdowns */}
          <FormSelect
            id="menu"
            label="Menu Option"
            options={MENU_OPTIONS}
            value={selectedMenu}
            onChange={handleMenuChange}
            required
            error={touched.menu ? errors.menu : undefined}
            helpText="Select the menu section where the chart will be displayed"
          />
          
          <FormSelect
            id="page"
            label="Page"
            options={availablePages}
            value={formData.page}
            onChange={(e) => handleInputChange('page', e.target.value)}
            required
            disabled={!selectedMenu}
            error={touched.page ? errors.page : undefined}
            helpText={selectedMenu ? "Select the specific page for this chart" : "Select a menu option first"}
          />
          
          <FormInput
            id="section"
            label="Section"
            value={formData.section || ''}
            onChange={(e) => handleInputChange('section', e.target.value)}
            placeholder="E.g., Top Charts"
            helpText="Optional section name for grouping charts"
          />
          
          {/* Chart Type Configuration */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Chart Configuration</h2>
          </div>
          
          <FormSelect
            id="chartType"
            label="Chart Type"
            options={CHART_TYPES}
            value={formData.chartType}
            onChange={(e) => handleInputChange('chartType', e.target.value)}
            required
            error={touched.chartType ? errors.chartType : undefined}
          />
          
          <FormInput
            id="colorScheme"
            label="Color Scheme"
            value={formData.colorScheme || 'default'}
            onChange={(e) => handleInputChange('colorScheme', e.target.value)}
            placeholder="E.g., blue,green,purple or default"
            helpText="Comma-separated colors or 'default'"
          />
          
          <div className="col-span-2">
            <FormCheckbox
              id="isStacked"
              label="Is this a stacked chart?"
              checked={formData.isStacked || false}
              onChange={(e) => handleCheckboxChange('isStacked', e.target.checked)}
              helpText={
                formData.isStacked 
                  ? "The chart will display data as stacked"
                  : "Enable to create a stacked chart"
              }
            />
            
            {formData.isStacked && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm">
                <p className="font-medium text-blue-800">Stacked Chart Configuration</p>
                <p className="mt-1 text-blue-700">You can create a stacked chart in two ways:</p>
                <ol className="mt-2 ml-5 list-decimal text-blue-700">
                  <li>Use <strong>multiple Y-axis fields</strong> (each field becomes a stack segment)</li>
                  <li>Use a <strong>Group By field</strong> (data is grouped and stacked by this field)</li>
                </ol>
              </div>
            )}
          </div>
          
          {/* API Configuration */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Data Source</h2>
          </div>
          
          <div className="col-span-2 flex space-x-4">
            <div className="flex-grow">
              <FormInput
                id="apiEndpoint"
                label="API Endpoint"
                value={formData.apiEndpoint}
                onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
                placeholder="E.g., https://analytics.topledger.xyz/solana/api/queries/12345/results.json"
                required
                error={touched.apiEndpoint ? errors.apiEndpoint : undefined}
                helpText="Enter the full URL of the API endpoint"
              />
            </div>
            <div className="flex items-end mb-4">
              <Button
                onClick={handleValidateApi}
                variant="secondary"
                isLoading={isValidatingApi}
                disabled={!formData.apiEndpoint}
              >
                Validate API
              </Button>
            </div>
          </div>
          
          <FormInput
            id="apiKey"
            label="API Key"
            value={formData.apiKey || ''}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder="E.g., YourApiKeyHere"
            helpText="Optional API key for authentication"
            className="col-span-2"
          />
          
          {apiValidationResult && (
            <div className={`col-span-2 p-4 rounded-md ${apiValidationResult.valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-sm ${apiValidationResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                {apiValidationResult.message}
              </p>
              {apiValidationResult.valid && apiValidationResult.data && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Available columns:</p>
                  <div className="mt-1 text-sm text-gray-500 max-h-32 overflow-y-auto">
                    {apiValidationResult.data.columns.map((col: string, index: number) => (
                      <span key={index} className="inline-block bg-gray-100 rounded-md px-2 py-1 mr-2 mb-2">
                        {col}
                      </span>
                    ))}
                  </div>
                  {apiValidationResult.data.sampleRows && (
                    <>
                      <p className="text-sm font-medium text-gray-700 mt-2">Sample data:</p>
                      <div className="mt-1 text-sm text-gray-500 max-h-48 overflow-y-auto">
                        <pre className="bg-gray-100 p-2 rounded-md text-xs">
                          {JSON.stringify(apiValidationResult.data.sampleRows, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Data Mapping */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Data Mapping</h2>
          </div>
          
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-700">X-Axis Configuration</h3>
              <button
                type="button"
                onClick={() => toggleMultiInput('xAxis')}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {useMultipleFields.xAxis ? 'Switch to Single Field' : 'Use Multiple Fields'}
              </button>
            </div>
            
            {useMultipleFields.xAxis ? (
              <FormMultiInput
                id="dataMapping.xAxis"
                label="X-Axis Fields"
                values={Array.isArray(formData.dataMapping.xAxis) ? formData.dataMapping.xAxis : (formData.dataMapping.xAxis ? [formData.dataMapping.xAxis] : [])}
                onChange={handleMultiInputChange}
                placeholder="E.g., month, date, category"
                required
                error={touched['dataMapping.xAxis'] ? errors['dataMapping.xAxis'] : undefined}
                helpText="Field names for the x-axis (add multiple fields for multi-series charts)"
              />
            ) : (
              <FormInput
                id="dataMapping.xAxis"
                label="X-Axis Field"
                value={typeof formData.dataMapping.xAxis === 'string' ? formData.dataMapping.xAxis : (Array.isArray(formData.dataMapping.xAxis) && formData.dataMapping.xAxis.length > 0 ? formData.dataMapping.xAxis[0] : '')}
                onChange={(e) => handleInputChange('dataMapping.xAxis', e.target.value)}
                placeholder="E.g., month"
                required
                error={touched['dataMapping.xAxis'] ? errors['dataMapping.xAxis'] : undefined}
                helpText="Field name for the x-axis (usually time/date)"
              />
            )}
          </div>
          
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-700">Y-Axis Configuration</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMultiInput('yAxis')}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {useMultipleFields.yAxis ? 'Switch to Single Field' : 'Use Multiple Fields'}
                </button>
                
                {useMultipleFields.yAxis && (
                  <button
                    type="button"
                    onClick={toggleDualAxis}
                    className={`text-sm ${isDualAxis ? 'text-blue-600 hover:text-blue-800' : 'text-indigo-600 hover:text-indigo-800'}`}
                  >
                    {isDualAxis ? 'Disable Dual Axis' : 'Enable Dual Axis'}
                  </button>
                )}
              </div>
            </div>
            
            {useMultipleFields.yAxis ? (
              formData.chartType === 'bar' || formData.chartType === 'line' || formData.chartType === 'dual-axis' ? (
                // For regular bar/line charts and dual-axis, allow mixed chart types
                <FormMultiInputWithType
                  id="dataMapping.yAxis"
                  label="Y-Axis Fields"
                  values={Array.isArray(formData.dataMapping.yAxis) && 
                         typeof formData.dataMapping.yAxis[0] !== 'string' ? 
                         formData.dataMapping.yAxis as YAxisConfig[] : 
                         (Array.isArray(formData.dataMapping.yAxis) ? 
                          (formData.dataMapping.yAxis as string[]).map(field => ({ field, type: 'bar' as const })) : 
                          (formData.dataMapping.yAxis ? [{ field: formData.dataMapping.yAxis as string, type: 'bar' as const }] : [])
                         )}
                  onChange={handleMultiInputWithTypeChange}
                  placeholder="E.g., revenue, volume, count"
                  required
                  error={touched['dataMapping.yAxis'] ? errors['dataMapping.yAxis'] : undefined}
                  helpText={`${isDualAxis ? 'Use → button to assign fields to right Y-axis. ' : ''}Click the chart icon to toggle between bar and line chart for each field.`}
                  supportDualAxis={isDualAxis}
                />
              ) : (
                // For other chart types, use regular multi-input without chart type selection
                <FormMultiInput
                  id="dataMapping.yAxis"
                  label="Y-Axis Fields"
                  values={Array.isArray(formData.dataMapping.yAxis) ? 
                         (typeof formData.dataMapping.yAxis[0] === 'string' ? 
                          formData.dataMapping.yAxis as string[] : 
                          (formData.dataMapping.yAxis as YAxisConfig[]).map(config => config.field)) : 
                         (formData.dataMapping.yAxis ? [formData.dataMapping.yAxis as string] : [])}
                  onChange={handleMultiInputChange}
                  placeholder="E.g., revenue, volume, count"
                  required
                  error={touched['dataMapping.yAxis'] ? errors['dataMapping.yAxis'] : undefined}
                  helpText={formData.isStacked ? "For stacked charts, each field will become a segment in the stack" : "Field names for the y-axis (add multiple fields for multi-series charts)"}
                />
              )
            ) : (
              <div className="mb-4">
                <label htmlFor="y-axis-field" className="block text-sm font-medium text-gray-800 mb-1">
                  Y-Axis Field <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="y-axis-field"
                    value={typeof formData.dataMapping.yAxis === 'string' ? formData.dataMapping.yAxis : ''}
                    onChange={(e) => handleInputChange('dataMapping.yAxis', e.target.value)}
                    placeholder="Field name for the y-axis"
                    className="block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                    required
                  />
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      id="y-axis-unit"
                      value={formData.dataMapping.yAxisUnit || ''}
                      onChange={(e) => handleInputChange('dataMapping.yAxisUnit', e.target.value)}
                      placeholder="Unit ($, %, SOL)"
                      className="w-32 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                    />
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {formData.isStacked 
                    ? "For stacked charts with a single Y-axis, you must specify a Group By field below" 
                    : "Field name for the y-axis (usually numeric values)"}
                </p>
                {touched['dataMapping.yAxis'] && errors['dataMapping.yAxis'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['dataMapping.yAxis']}</p>
                )}
              </div>
            )}
          </div>
          
          {formData.isStacked && !useMultipleFields.yAxis && (
            <FormInput
              id="dataMapping.groupBy"
              label="Group By Field"
              value={formData.dataMapping.groupBy || ''}
              onChange={(e) => handleInputChange('dataMapping.groupBy', e.target.value)}
              placeholder="E.g., platform"
              required
              error={touched['dataMapping.groupBy'] ? errors['dataMapping.groupBy'] : undefined}
              helpText="Field to group data by (required for stacked charts with a single Y-axis field)"
            />
          )}
          
          {formData.isStacked && useMultipleFields.yAxis && (
            <FormInput
              id="dataMapping.groupBy"
              label="Group By Field (Optional)"
              value={formData.dataMapping.groupBy || ''}
              onChange={(e) => handleInputChange('dataMapping.groupBy', e.target.value)}
              placeholder="E.g., platform"
              error={touched['dataMapping.groupBy'] ? errors['dataMapping.groupBy'] : undefined}
              helpText="Optional field to further group data (not required when using multiple Y-axis fields)"
            />
          )}
          
          {/* Filter Configuration Section */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Filter Configuration</h2>
            <p className="text-sm text-gray-700 mb-4">Enable filters for this chart. These will appear as interactive controls for users.</p>
          </div>
          
          {/* Time Filter */}
          <div className="col-span-2">
            <FormCheckbox
              id="timeFilter"
              label="Enable Time Filter"
              checked={enableFilters.timeFilter}
              onChange={() => toggleFilter('timeFilter')}
              helpText="Add a time period filter (Day, Week, Month, Quarter, Year)"
            />
            
            {enableFilters.timeFilter && (
              <div className="pl-6 mt-2 space-y-4 border-l-2 border-indigo-100">
                <FormInput
                  id="timeFilterParamName"
                  label="API Parameter Name"
                  value={filterParams.timeFilter.paramName}
                  onChange={(e) => handleFilterParamChange('timeFilter', 'paramName', e.target.value)}
                  placeholder="e.g., period, timeframe, Date Part"
                  helpText="Parameter name that will be sent to the API (case sensitive - must match exactly)"
                />
                
                <FormMultiInput
                  id="timeFilterOptions"
                  label="Filter Options"
                  values={Array.isArray(filterParams.timeFilter.options) ? filterParams.timeFilter.options : []}
                  onChange={(field, values) => handleFilterParamChange('timeFilter', 'options', values)}
                  placeholder="D, W, M, Q, Y"
                  helpText="Available time filter options (D=Day, W=Week, M=Month, Q=Quarter, Y=Year)"
                />
              </div>
            )}
          </div>
          
          {/* Currency Filter */}
          <div className="col-span-2 mt-4">
            <FormCheckbox
              id="currencyFilter"
              label="Enable Currency Filter"
              checked={enableFilters.currencyFilter}
              onChange={() => toggleFilter('currencyFilter')}
              helpText="Add a currency selector (USD, SOL, etc.)"
            />
            
            {enableFilters.currencyFilter && (
              <div className="pl-6 mt-2 space-y-4 border-l-2 border-indigo-100">
                <FormInput
                  id="currencyFilterParamName"
                  label="API Parameter Name"
                  value={filterParams.currencyFilter.paramName}
                  onChange={(e) => handleFilterParamChange('currencyFilter', 'paramName', e.target.value)}
                  placeholder="e.g., currency, denomination"
                  helpText="Parameter name that will be sent to the API (case sensitive - must match exactly)"
                />
                
                <FormMultiInput
                  id="currencyFilterOptions"
                  label="Filter Options"
                  values={Array.isArray(filterParams.currencyFilter.options) ? filterParams.currencyFilter.options : []}
                  onChange={(field, values) => handleFilterParamChange('currencyFilter', 'options', values)}
                  placeholder="USD, SOL, USDe"
                  helpText="Available currency options"
                />
              </div>
            )}
          </div>
          
          {/* Additional Options */}
          <div className="col-span-2 border-t pt-6 mt-4">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Additional Options</h2>
          </div>
          
          <FormTextarea
            id="additionalOptions"
            label="Additional Options (JSON)"
            value={JSON.stringify(formData.additionalOptions || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : {};
                setFormData(prev => ({
                  ...prev,
                  additionalOptions: parsed
                }));
              } catch (error) {
                // Don't update if JSON is invalid
              }
            }}
            placeholder="{}"
            rows={6}
            className="col-span-2"
            helpText="Optional JSON configuration for advanced options"
          />
          
          {/* Add simplified Dual Axis Configuration section if enabled */}
          {isDualAxis && useMultipleFields.yAxis && (
            <div className="col-span-2 border-t pt-3 mt-3">
              <div className="text-md font-medium text-blue-700 mb-2">Dual Axis Configuration</div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Left Y-Axis Type
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={dualAxisConfig.leftAxisType}
                    onChange={(e) => updateDualAxisConfig('leftAxisType', e.target.value as 'bar' | 'line')}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-600">Chart type for left y-axis fields</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Right Y-Axis Type
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={dualAxisConfig.rightAxisType}
                    onChange={(e) => updateDualAxisConfig('rightAxisType', e.target.value as 'bar' | 'line')}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-600">Chart type for right y-axis fields</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <p className="text-sm text-gray-700">
                  Use the <span className="font-semibold">→</span> buttons on each field above to assign them to the right Y-axis.
                  Fields shown with <span className="bg-blue-100 px-1 rounded">blue background</span> are on the left axis, and fields with 
                  <span className="bg-purple-100 px-1 rounded ml-1">purple background</span> are on the right axis.
                </p>
              </div>
            </div>
          )}
          
          {/* Form Actions */}
          <div className="col-span-2 flex justify-end space-x-4 border-t pt-6 mt-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/admin')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Create Chart
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 