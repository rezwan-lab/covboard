// src/CovBoard.jsx
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import Papa from 'papaparse';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CovBoard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dashboard metrics
  const [stats, setStats] = useState({
    totalSamples: 0,
    uniqueLineages: 0,
    uniqueCountries: 0,
    avgMutations: 0,
    dateRange: { min: '', max: '' }
  });
  const [variantData, setVariantData] = useState({
    labels: [],
    datasets: []
  });
  const [temporalData, setTemporalData] = useState({
    labels: [],
    datasets: []
  });
  const [genderData, setGenderData] = useState({
    labels: [],
    datasets: []
  });
  const [ageData, setAgeData] = useState({
    labels: [],
    datasets: []
  });

  // Colors
  const COLORS = [
    '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
    '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/df_cleaned.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (result) => {
            setData(result.data);
            processData(result.data);
            setLoading(false);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setError('Failed to parse CSV data');
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error loading file:', error);
        setError(`Failed to load CSV file: ${error.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processData = (data) => {
    // Basic stats processing
    const lineages = [...new Set(data.map(row => row.pango_lineage).filter(Boolean))];
    const countries = [...new Set(data.map(row => row.country).filter(Boolean))];
    
    const validDates = data
      .map(row => row.date)
      .filter(Boolean)
      .sort();
    
    const minDate = validDates[0] || '';
    const maxDate = validDates[validDates.length - 1] || '';
    
    // Calculate average mutations
    let totalMutations = 0;
    let countSamples = 0;
    
    data.forEach(row => {
      if (row.totalSubstitutions !== undefined && !isNaN(row.totalSubstitutions)) {
        totalMutations += row.totalSubstitutions;
        countSamples++;
      }
    });
    
    const avgMutations = countSamples > 0 ? (totalMutations / countSamples).toFixed(1) : 0;
    
    setStats({
      totalSamples: data.length,
      uniqueLineages: lineages.length,
      uniqueCountries: countries.length,
      avgMutations: avgMutations,
      dateRange: { min: minDate, max: maxDate }
    });

    // Process variant data for Chart.js
    const lineageCounts = {};
    data.forEach(row => {
      if (row.pango_lineage) {
        lineageCounts[row.pango_lineage] = (lineageCounts[row.pango_lineage] || 0) + 1;
      }
    });
    
    const sortedLineages = Object.entries(lineageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    setVariantData({
      labels: sortedLineages.map(([name]) => name),
      datasets: [
        {
          label: 'Sample Count',
          data: sortedLineages.map(([, value]) => value),
          backgroundColor: sortedLineages.map((_, i) => COLORS[i % COLORS.length]),
          borderWidth: 1,
        },
      ],
    });

    // Process temporal data
    const monthCounts = {};
    data.forEach(row => {
      if (row.year && row.month) {
        const yearMonth = `${row.year}-${String(row.month).padStart(2, '0')}`;
        monthCounts[yearMonth] = (monthCounts[yearMonth] || 0) + 1;
      }
    });
    
    const sortedMonths = Object.entries(monthCounts)
      .sort((a, b) => a[0].localeCompare(b[0]));

    setTemporalData({
      labels: sortedMonths.map(([month]) => month),
      datasets: [
        {
          label: 'Sample Count',
          data: sortedMonths.map(([, count]) => count),
          fill: true,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.4,
        },
      ],
    });

    // Process gender data
    const genderCounts = {};
    data.forEach(row => {
      if (row.sex) {
        const gender = typeof row.sex === 'string' ? row.sex.trim() : String(row.sex);
        if (gender) {
          genderCounts[gender] = (genderCounts[gender] || 0) + 1;
        }
      }
    });

    setGenderData({
      labels: Object.keys(genderCounts),
      datasets: [
        {
          label: 'Gender Distribution',
          data: Object.values(genderCounts),
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 206, 86, 0.8)',
          ],
          borderWidth: 1,
        },
      ],
    });

    // Process age data
    const ages = [];
    data.forEach(row => {
      if (row.age !== undefined && row.age !== null && !isNaN(row.age)) {
        ages.push(parseFloat(row.age));
      }
    });
    
    if (ages.length > 0) {
      const ageRanges = [
        '0-9', '10-19', '20-29', '30-39', '40-49', 
        '50-59', '60-69', '70-79', '80-89', '90+'
      ];
      
      const ageCounts = ageRanges.map(range => {
        const [min, max] = range.split('-');
        if (max) {
          const minVal = parseInt(min);
          const maxVal = parseInt(max);
          return ages.filter(age => age >= minVal && age <= maxVal).length;
        } else {
          const minVal = parseInt(range.replace('+', ''));
          return ages.filter(age => age >= minVal).length;
        }
      });

      setAgeData({
        labels: ageRanges,
        datasets: [
          {
            label: 'Age Distribution',
            data: ageCounts,
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderWidth: 1,
          },
        ],
      });
    }
  };


const processMutationData = (data) => {
  // Process mutation data for analysis
  const mutationCounts = {};
  const lineageMutations = {};
  
  // Count mutations across all samples
  data.forEach(row => {
    if (row.substitutions) {
      // Split mutations if they're in a comma-separated string
      const mutations = typeof row.substitutions === 'string' 
        ? row.substitutions.split(',').map(m => m.trim()) 
        : Array.isArray(row.substitutions) ? row.substitutions : [];
      
      // Count each mutation
      mutations.forEach(mutation => {
        if (mutation) {
          mutationCounts[mutation] = (mutationCounts[mutation] || 0) + 1;
          
          // Track mutations by lineage
          if (row.pango_lineage) {
            if (!lineageMutations[row.pango_lineage]) {
              lineageMutations[row.pango_lineage] = {};
            }
            lineageMutations[row.pango_lineage][mutation] = 
              (lineageMutations[row.pango_lineage][mutation] || 0) + 1;
          }
        }
      });
    }
  });
  
  // Get top mutations
  const topMutations = Object.entries(mutationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  // Prepare data for mutation frequency chart
  const mutationFreqData = {
    labels: topMutations.map(([mutation]) => mutation),
    datasets: [
      {
        label: 'Frequency',
        data: topMutations.map(([, count]) => count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderWidth: 1
      }
    ]
  };
  
  // Prepare data for spike protein mutations
  const spikeMutations = Object.entries(mutationCounts)
    .filter(([mutation]) => mutation.startsWith('S:'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const spikeData = {
    labels: spikeMutations.map(([mutation]) => mutation),
    datasets: [
      {
        label: 'Spike Protein Mutations',
        data: spikeMutations.map(([, count]) => count),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderWidth: 1
      }
    ]
  };
  
  // Calculate mutation burden by lineage
  const lineageBurdenData = {
    labels: [],
    datasets: [
      {
        label: 'Average Mutations',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderWidth: 1
      }
    ]
  };
  
  // Get top 10 lineages by sample count
  const lineageCounts = {};
  data.forEach(row => {
    if (row.pango_lineage) {
      lineageCounts[row.pango_lineage] = (lineageCounts[row.pango_lineage] || 0) + 1;
    }
  });
  
  const topLineages = Object.entries(lineageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lineage]) => lineage);
  
  // Calculate average mutation burden for each top lineage
  topLineages.forEach(lineage => {
    const lineageSamples = data.filter(row => row.pango_lineage === lineage);
    let totalMutations = 0;
    let samplesWithMutations = 0;
    
    lineageSamples.forEach(sample => {
      if (sample.totalSubstitutions !== undefined && !isNaN(sample.totalSubstitutions)) {
        totalMutations += sample.totalSubstitutions;
        samplesWithMutations++;
      }
    });
    
    if (samplesWithMutations > 0) {
      lineageBurdenData.labels.push(lineage);
      lineageBurdenData.datasets[0].data.push(
        parseFloat((totalMutations / samplesWithMutations).toFixed(2))
      );
    }
  });
  
  // Prepare mutation correlation data (which mutations appear together)
  const mutationCorrelation = {};
  const topMutationNames = topMutations.map(([mutation]) => mutation);
  
  topMutationNames.forEach(mutation => {
    mutationCorrelation[mutation] = {};
    
    topMutationNames.forEach(otherMutation => {
      if (mutation !== otherMutation) {
        mutationCorrelation[mutation][otherMutation] = 0;
      }
    });
  });
  
  // Count co-occurrences
  data.forEach(row => {
    if (row.substitutions) {
      const mutations = typeof row.substitutions === 'string' 
        ? row.substitutions.split(',').map(m => m.trim()) 
        : Array.isArray(row.substitutions) ? row.substitutions : [];
      
      // Find all combinations of mutations that co-occur
      for (let i = 0; i < mutations.length; i++) {
        const mutation1 = mutations[i];
        if (topMutationNames.includes(mutation1)) {
          for (let j = i + 1; j < mutations.length; j++) {
            const mutation2 = mutations[j];
            if (topMutationNames.includes(mutation2)) {
              mutationCorrelation[mutation1][mutation2] = 
                (mutationCorrelation[mutation1][mutation2] || 0) + 1;
              mutationCorrelation[mutation2][mutation1] = 
                (mutationCorrelation[mutation2][mutation1] || 0) + 1;
            }
          }
        }
      }
    }
  });
  
  return {
    mutationFreqData,
    spikeData,
    lineageBurdenData,
    mutationCorrelation,
    topMutations,
    topMutationNames
  };
};












  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Loading COVID-19 Genomic Data...
        </div>
        <div style={{ 
          width: '4rem', 
          height: '4rem', 
          borderRadius: '50%', 
          border: '0.25rem solid #f3f3f3', 
          borderTop: '0.25rem solid #3498db', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e53e3e', marginBottom: '0.5rem' }}>
          Error: {error}
        </div>
        <div>Please check if your CSV file is properly formatted</div>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
  };

  return (
    <div style={{ 
      backgroundColor: '#f9fafb', 
      padding: '1rem', 
      borderRadius: '0.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial'
    }}>
      {/* Dashboard Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: '#1a202c', 
          marginBottom: '0.5rem' 
        }}>
          CovBoard: COVID-19 Genomic Dashboard
        </h1>
        <p style={{ color: '#4a5568' }}>
          Analyze and visualize SARS-CoV-2 variant data across time, geography, and genetic characteristics
        </p>
      </div>
      
      {/* Stats Overview Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.5rem' 
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)' 
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#718096' }}>
            Total Samples
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5a67d8' }}>
            {stats.totalSamples}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)' 
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#718096' }}>
            Variant Lineages
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5a67d8' }}>
            {stats.uniqueLineages}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)' 
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#718096' }}>
            Countries
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5a67d8' }}>
            {stats.uniqueCountries}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)' 
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#718096' }}>
            Avg Mutations
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5a67d8' }}>
            {stats.avgMutations}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)' 
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#718096' }}>
            Date Range
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#5a67d8' }}>
            {stats.dateRange.min} to {stats.dateRange.max}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        overflowX: 'auto', 
        marginBottom: '1.5rem', 
        borderBottom: '1px solid #e2e8f0' 
      }}>
        {['overview', 'variants', 'temporal', 'demographics', 'mutations'].map(tab => (
          <button
            key={tab}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 500,
              borderTopLeftRadius: '0.375rem',
              borderTopRightRadius: '0.375rem',
              backgroundColor: activeTab === tab ? 'white' : '#f1f5f9',
              color: activeTab === tab ? '#5a67d8' : '#4a5568',
              border: activeTab === tab ? '1px solid #e2e8f0' : 'none',
              borderBottom: activeTab === tab ? '1px solid white' : 'none',
              marginBottom: activeTab === tab ? '-1px' : 0,
              cursor: 'pointer',
              marginRight: '0.25rem'
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Panel */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.5rem', 
        padding: '1.5rem', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)' 
      }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Dashboard Overview
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {/* Top Lineages */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem' 
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Top Variant Lineages
                </h3>
                <div style={{ height: '300px' }}>
                  <Bar 
                    options={{
                      ...chartOptions,
                      indexAxis: 'y',
                    }} 
                    data={variantData} 
                  />
                </div>
              </div>
              
              {/* Temporal Distribution */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem' 
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Samples Over Time
                </h3>
                <div style={{ height: '300px' }}>
                  <Line 
                    options={chartOptions} 
                    data={temporalData} 
                  />
                </div>
              </div>
              
              {/* Gender Distribution */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem' 
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Gender Distribution
                </h3>
                <div style={{ height: '300px' }}>
                  <Pie
                    options={chartOptions}
                    data={genderData}
                  />
                </div>
              </div>
              
              {/* Age Distribution */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem' 
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Age Distribution
                </h3>
                <div style={{ height: '300px' }}>
                  <Bar
                    options={chartOptions}
                    data={ageData}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Variant Analysis Tab */}
        {activeTab === 'variants' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Variant Lineage Analysis
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {/* Variant Distribution Pie Chart */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 1'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Variant Lineage Distribution
                </h3>
                <div style={{ height: '400px' }}>
                  <Pie 
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.raw || 0;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = Math.round((value / total) * 100);
                              return `${label}: ${value} samples (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }} 
                    data={variantData} 
                  />
                </div>
              </div>
              
              {/* Variant Lineage Bar Chart */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '2 / span 1'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Top Variant Lineages (Count)
                </h3>
                <div style={{ height: '400px' }}>
                  <Bar 
                    options={{
                      ...chartOptions,
                      indexAxis: 'y',
                      plugins: {
                        ...chartOptions.plugins,
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.raw} samples`;
                            }
                          }
                        }
                      }
                    }} 
                    data={variantData} 
                  />
                </div>
              </div>
              
              {/* Variant Details Table */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 2',
                overflowX: 'auto'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Variant Lineage Details
                </h3>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  fontSize: '0.875rem' 
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Lineage</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Sample Count</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Percentage</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>First Detected</th>
                      <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Last Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantData.labels.map((lineage, index) => {
                      // Calculate detection dates for each lineage
                      const lineageSamples = data.filter(row => row.pango_lineage === lineage);
                      const lineageDates = lineageSamples
                        .map(row => row.date)
                        .filter(Boolean)
                        .sort();
                      
                      const firstDetected = lineageDates[0] || 'Unknown';
                      const lastDetected = lineageDates[lineageDates.length - 1] || 'Unknown';
                      
                      const totalSamples = variantData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                      const percentage = ((variantData.datasets[0].data[index] / totalSamples) * 100).toFixed(1);
                      
                      return (
                        <tr key={lineage} style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc'
                        }}>
                          <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center' 
                            }}>
                              <div style={{ 
                                width: '12px', 
                                height: '12px', 
                                backgroundColor: COLORS[index % COLORS.length],
                                marginRight: '0.5rem',
                                borderRadius: '2px'
                              }}></div>
                              {lineage}
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                            {variantData.datasets[0].data[index]}
                          </td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                            {percentage}%
                          </td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                            {firstDetected}
                          </td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                            {lastDetected}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Variant Insights */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 2'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Variant Analysis Insights
                </h3>
                
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>Dominant Variant:</strong> {variantData.labels[0] || 'N/A'} ({variantData.datasets[0].data[0] || 0} samples)
                  </p>
                  
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>Variant Diversity:</strong> The dataset contains {stats.uniqueLineages} different variant lineages.
                  </p>
                  
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>Top 3 Variants:</strong> {
                      variantData.labels.slice(0, 3).map((lineage, i) => 
                        `${lineage} (${variantData.datasets[0].data[i]} samples)`
                      ).join(', ')
                    }
                  </p>
                  
                  <p>
                    <strong>Variant Timeline:</strong> The earliest variant in this dataset was detected on {stats.dateRange.min} 
                    and the most recent on {stats.dateRange.max}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Temporal Analysis Tab */}
        {activeTab === 'temporal' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Temporal Distribution Analysis
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {/* Sample Collection Timeline */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 2'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Sample Collection Timeline
                </h3>
                <div style={{ height: '300px' }}>
                  <Line 
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.raw} samples`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Number of Samples'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Month'
                          }
                        }
                      }
                    }} 
                    data={temporalData} 
                  />
                </div>
              </div>
              
              {/* Lineage Distribution Over Time (Pan-India Style) */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 2'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Lineage Distribution Over Time
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '1rem' }}>
                  Showing the proportion of variant lineages by month and quarter
                </p>
                <div style={{ height: '400px' }}>
                  {data.length > 0 && (
                    <Bar
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            stacked: true,
                            title: {
                              display: true,
                              text: 'Month'
                            }
                          },
                          y: {
                            stacked: true,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Percentage (%)'
                            },
                            ticks: {
                              callback: function(value) {
                                return value + '%';
                              }
                            }
                          }
                        }
                      }}
                      data={(() => {
                        // Process data for the stacked bar chart - similar to Pan-India style
                        // Group by year, month and lineage
                        const yearMonthGroups = {};
                        
                        data.forEach(row => {
                          if (row.year && row.month && row.pango_lineage) {
                            const yearMonth = `${row.year}-${String(row.month).padStart(2, '0')}`;
                            if (!yearMonthGroups[yearMonth]) {
                              yearMonthGroups[yearMonth] = {
                                count: 0,
                                lineages: {}
                              };
                            }
                            
                            if (!yearMonthGroups[yearMonth].lineages[row.pango_lineage]) {
                              yearMonthGroups[yearMonth].lineages[row.pango_lineage] = 0;
                            }
                            
                            yearMonthGroups[yearMonth].lineages[row.pango_lineage]++;
                            yearMonthGroups[yearMonth].count++;
                          }
                        });
                        
                        // Get all unique lineages
                        const allLineages = [...new Set(data.map(row => row.pango_lineage).filter(Boolean))];
                        
                        // Sort lineages by total count
                        const lineageCounts = {};
                        allLineages.forEach(lineage => {
                          lineageCounts[lineage] = 0;
                          data.forEach(row => {
                            if (row.pango_lineage === lineage) {
                              lineageCounts[lineage]++;
                            }
                          });
                        });
                        
                        // Get top 8 lineages
                        const topLineages = Object.entries(lineageCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 8)
                          .map(entry => entry[0]);
                        
                        // Sort by year and month
                        const sortedKeys = Object.keys(yearMonthGroups).sort();
                        const monthNames = [
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ];
                        
                        const labels = sortedKeys.map(yearMonth => {
                          const [year, month] = yearMonth.split('-');
                          return monthNames[parseInt(month) - 1];
                        });
                        
                        // Create datasets for stacked bar chart
                        const datasets = [...topLineages, 'Other'].map((lineage, index) => {
                          return {
                            label: lineage,
                            data: sortedKeys.map(yearMonth => {
                              const totalCount = yearMonthGroups[yearMonth].count;
                              if (lineage === 'Other') {
                                // Calculate "Other" category
                                let otherCount = 0;
                                Object.entries(yearMonthGroups[yearMonth].lineages).forEach(([lin, count]) => {
                                  if (!topLineages.includes(lin)) {
                                    otherCount += count;
                                  }
                                });
                                return (otherCount / totalCount) * 100;
                              } else {
                                const count = yearMonthGroups[yearMonth].lineages[lineage] || 0;
                                return (count / totalCount) * 100;
                              }
                            }),
                            backgroundColor: COLORS[index % COLORS.length],
                            stack: 'Stack 0',
                          };
                        });
                        
                        return {
                          labels,
                          datasets
                        };
                      })()}
                    />
                  )}
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1rem',
                  marginTop: '1rem',
                  fontSize: '0.75rem',
                  color: '#4a5568'
                }}>
                  <div style={{ 
                    borderLeft: '4px solid #5a67d8', 
                    paddingLeft: '0.5rem'
                  }}>
                    <p style={{ fontWeight: 500 }}>Quarters shown on top axis</p>
                    <p>Distribution shows proportion of lineages by month</p>
                  </div>
                  <div style={{ 
                    borderLeft: '4px solid #5a67d8', 
                    paddingLeft: '0.5rem'
                  }}>
                    <p style={{ fontWeight: 500 }}>Top 8 lineages shown individually</p>
                    <p>All others grouped as "Other" category</p>
                  </div>
                  <div style={{ 
                    borderLeft: '4px solid #5a67d8', 
                    paddingLeft: '0.5rem'
                  }}>
                    <p style={{ fontWeight: 500 }}>Hover for exact percentages</p>
                    <p>Each bar totals 100% of samples in that month</p>
                  </div>
                </div>
              </div>
              
              {/* Monthly Growth Rate */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 1'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Monthly Sample Growth Rate
                </h3>
                <div style={{ height: '300px' }}>
                  {temporalData.labels.length > 1 ? (
                    <Bar
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `${context.raw.toFixed(1)}%`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            title: {
                              display: true,
                              text: 'Growth Rate (%)'
                            }
                          }
                        }
                      }}
                      data={{
                        labels: temporalData.labels.slice(1).map((month, i) => {
                          return month;
                        }),
                        datasets: [{
                          label: 'Monthly Growth Rate (%)',
                          data: temporalData.datasets[0].data.slice(1).map((count, i) => {
                            const prevCount = temporalData.datasets[0].data[i];
                            if (prevCount === 0) return 0;
                            return ((count - prevCount) / prevCount) * 100;
                          }),
                          backgroundColor: (context) => {
                            const value = context.dataset.data[context.dataIndex];
                            return value >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)';
                          }
                        }]
                      }}
                    />
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      color: '#4a5568'
                    }}>
                      Not enough temporal data for growth rate calculation
                    </div>
                  )}
                </div>
              </div>
              
              {/* Temporal Analysis Insights */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '2 / span 1'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Temporal Analysis Insights
                </h3>
                
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                  {temporalData.labels.length > 0 ? (
                    <>
                      <p style={{ marginBottom: '0.5rem' }}>
                        <strong>Date Range:</strong> {stats.dateRange.min} to {stats.dateRange.max}
                      </p>
                      
                      <p style={{ marginBottom: '0.5rem' }}>
                        <strong>Peak Collection Month:</strong> {(() => {
                          const maxIndex = temporalData.datasets[0].data.indexOf(
                            Math.max(...temporalData.datasets[0].data)
                          );
                          return `${temporalData.labels[maxIndex]} (${temporalData.datasets[0].data[maxIndex]} samples)`;
                        })()}
                      </p>
                      
                      <p style={{ marginBottom: '0.5rem' }}>
                        <strong>Total Time Period:</strong> {temporalData.labels.length} months
                      </p>
                      
                      <p>
                        <strong>Average Samples Per Month:</strong> {
                          temporalData.labels.length > 0 
                            ? (temporalData.datasets[0].data.reduce((sum, count) => sum + count, 0) / 
                               temporalData.datasets[0].data.length).toFixed(1)
                            : 'N/A'
                        }
                      </p>
                    </>
                  ) : (
                    <p>Insufficient temporal data for analysis</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}







        {/* Demographics Tab */}
        {activeTab === 'demographics' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Patient Demographics Analysis
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {/* Gender Distribution */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Gender Distribution
                </h3>
                <div style={{ height: '300px' }}>
                  <Pie
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.raw || 0;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = Math.round((value / total) * 100);
                              return `${label}: ${value} samples (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                    data={genderData}
                  />
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}>
                  {genderData.labels.map((gender, index) => (
                    <div 
                      key={gender}
                      style={{ 
                        backgroundColor: 'white', 
                        padding: '0.5rem', 
                        borderRadius: '0.375rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {genderData.datasets[0].data[index]}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>
                        {gender}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Age Distribution Histogram */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Age Distribution by Age Group
                </h3>
                <div style={{ height: '300px' }}>
                  <Bar
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.raw} samples`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Number of Samples'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Age Group'
                          }
                        }
                      }
                    }}
                    data={ageData}
                  />
                </div>
              </div>
              
              {/* Age Statistics Summary */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Age Statistics
                </h3>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem'
                }}>
                  {ageData.labels.length > 0 ? (
                    <>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        borderBottom: '1px solid #e2e8f0', 
                        paddingBottom: '0.5rem' 
                      }}>
                        <span style={{ fontWeight: 500 }}>Most Common Age Group:</span>
                        <span style={{ color: '#5a67d8', fontWeight: 500 }}>
                          {(() => {
                            const maxIndex = ageData.datasets[0].data.indexOf(
                              Math.max(...ageData.datasets[0].data)
                            );
                            return ageData.labels[maxIndex] || 'N/A';
                          })()}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        borderBottom: '1px solid #e2e8f0', 
                        paddingBottom: '0.5rem' 
                      }}>
                        <span style={{ fontWeight: 500 }}>Children (0-9):</span>
                        <span>
                          {(() => {
                            const index = ageData.labels.indexOf('0-9');
                            if (index !== -1) {
                              const count = ageData.datasets[0].data[index];
                              const total = ageData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                              const percentage = ((count / total) * 100).toFixed(1);
                              return `${count} samples (${percentage}%)`;
                            }
                            return '0 samples (0%)';
                          })()}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        borderBottom: '1px solid #e2e8f0', 
                        paddingBottom: '0.5rem' 
                      }}>
                        <span style={{ fontWeight: 500 }}>Young Adults (20-39):</span>
                        <span>
                          {(() => {
                            const index20s = ageData.labels.indexOf('20-29');
                            const index30s = ageData.labels.indexOf('30-39');
                            let count = 0;
                            
                            if (index20s !== -1) count += ageData.datasets[0].data[index20s];
                            if (index30s !== -1) count += ageData.datasets[0].data[index30s];
                            
                            const total = ageData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                            const percentage = ((count / total) * 100).toFixed(1);
                            
                            return `${count} samples (${percentage}%)`;
                          })()}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        borderBottom: '1px solid #e2e8f0', 
                        paddingBottom: '0.5rem' 
                      }}>
                        <span style={{ fontWeight: 500 }}>Middle-Aged (40-59):</span>
                        <span>
                          {(() => {
                            const index40s = ageData.labels.indexOf('40-49');
                            const index50s = ageData.labels.indexOf('50-59');
                            let count = 0;
                            
                            if (index40s !== -1) count += ageData.datasets[0].data[index40s];
                            if (index50s !== -1) count += ageData.datasets[0].data[index50s];
                            
                            const total = ageData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                            const percentage = ((count / total) * 100).toFixed(1);
                            
                            return `${count} samples (${percentage}%)`;
                          })()}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontWeight: 500 }}>Elderly (60+):</span>
                        <span>
                          {(() => {
                            const index60s = ageData.labels.indexOf('60-69');
                            const index70s = ageData.labels.indexOf('70-79');
                            const index80s = ageData.labels.indexOf('80-89');
                            const index90plus = ageData.labels.indexOf('90+');
                            let count = 0;
                            
                            if (index60s !== -1) count += ageData.datasets[0].data[index60s];
                            if (index70s !== -1) count += ageData.datasets[0].data[index70s];
                            if (index80s !== -1) count += ageData.datasets[0].data[index80s];
                            if (index90plus !== -1) count += ageData.datasets[0].data[index90plus];
                            
                            const total = ageData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                            const percentage = ((count / total) * 100).toFixed(1);
                            
                            return `${count} samples (${percentage}%)`;
                          })()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: '#4a5568' }}>No age data available</p>
                  )}
                </div>
              </div>
              
              {/* Gender and Age Combined View */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Gender and Age Distribution
                </h3>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem'
                }}>
                  <p>
                    This dataset contains {stats.totalSamples} COVID-19 samples with demographic information showing:
                  </p>
                  <ul style={{ 
                    listStyleType: 'disc', 
                    paddingLeft: '1.25rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.25rem' 
                  }}>
                    <li>
                      <strong>Gender ratio:</strong> {(() => {
                        const maleIndex = genderData.labels.indexOf('Male');
                        const femaleIndex = genderData.labels.indexOf('Female');
                        
                        let malePercentage = 0;
                        let femalePercentage = 0;
                        let otherPercentage = 0;
                        
                        const total = genderData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                        
                        if (maleIndex !== -1) malePercentage = (genderData.datasets[0].data[maleIndex] / total) * 100;
                        if (femaleIndex !== -1) femalePercentage = (genderData.datasets[0].data[femaleIndex] / total) * 100;
                        
                        // Calculate other/unknown
                        otherPercentage = 100 - malePercentage - femalePercentage;
                        
                        return `${malePercentage.toFixed(1)}% male vs ${femalePercentage.toFixed(1)}% female` +
                          (otherPercentage > 0 ? ` (${otherPercentage.toFixed(1)}% other/unknown)` : '');
                      })()}
                    </li>
                    <li>
                      <strong>Age distribution:</strong> Most samples are from the {(() => {
                        if (ageData.labels.length === 0) return 'unknown';
                        
                        const maxIndex = ageData.datasets[0].data.indexOf(
                          Math.max(...ageData.datasets[0].data)
                        );
                        return ageData.labels[maxIndex] || 'unknown';
                      })()} age range
                    </li>
                    <li>
                      <strong>Young adults:</strong> Make up {(() => {
                        const index20s = ageData.labels.indexOf('20-29');
                        const index30s = ageData.labels.indexOf('30-39');
                        let count = 0;
                        
                        if (index20s !== -1) count += ageData.datasets[0].data[index20s];
                        if (index30s !== -1) count += ageData.datasets[0].data[index30s];
                        
                        const total = ageData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                        return total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                      })()}% of all cases
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Age Distribution Percentage */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 2'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Age Group Distribution Percentage
                </h3>
                <div style={{ height: '400px' }}>
                  <Bar
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.raw.toFixed(1)}%`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: Math.ceil(Math.max(...ageData.datasets[0].data.map(d => {
                            const total = ageData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                            return (d / total) * 100;
                          })) / 10) * 10,
                          title: {
                            display: true,
                            text: 'Percentage (%)'
                          },
                          ticks: {
                            callback: function(value) {
                              return value + '%';
                            }
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Age Group'
                          }
                        }
                      }
                    }}
                    data={{
                      labels: ageData.labels,
                      datasets: [{
                        label: 'Percentage',
                        data: ageData.datasets[0].data.map(count => {
                          const total = ageData.datasets[0].data.reduce((sum, count) => sum + count, 0);
                          return (count / total) * 100;
                        }),
                        backgroundColor: '#82ca9d',
                        borderWidth: 1,
                      }]
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Mutations Analysis Tab */}
        {activeTab === 'mutations' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Mutation Analysis
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {/* Mutation Frequency Chart */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 2'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Top 15 Mutations Frequency
                </h3>
                <div style={{ height: '300px' }}>
                  {(() => {
                    const mutationData = processMutationData(data);
                    return (
                      <Bar 
                        options={{
                          ...chartOptions,
                          plugins: {
                            ...chartOptions.plugins,
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  return `${context.raw} samples`;
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Sample Count'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Mutation'
                              }
                            }
                          }
                        }} 
                        data={mutationData.mutationFreqData} 
                      />
                    );
                  })()}
                </div>
              </div>
              
              {/* Mutation Burden by Lineage */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '1 / span 1'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Mutation Burden by Lineage
                </h3>
                <div style={{ height: '300px' }}>
                  {(() => {
                    const mutationData = processMutationData(data);
                    return (
                      <Bar 
                        options={{
                          ...chartOptions,
                          indexAxis: 'y',
                          plugins: {
                            ...chartOptions.plugins,
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  return `${context.raw} avg. mutations`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Average Number of Mutations'
                              }
                            }
                          }
                        }} 
                        data={mutationData.lineageBurdenData} 
                      />
                    );
                  })()}
                </div>
              </div>
              
              {/* Spike Protein Mutations */}
              <div style={{ 
                backgroundColor: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                gridColumn: '2 / span 1'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Top Spike Protein Mutations
                </h3>
                <div style={{ height: '300px' }}>
                  {(() => {
                    const mutationData = processMutationData(data);
                    return (
                      <Bar 
                        options={{
                          ...chartOptions,
                          indexAxis: 'y',
                          plugins: {
                            ...chartOptions.plugins,
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  return `${context.raw} samples`;
                                }
                              }
                            }
                          }
                        }} 
                        data={mutationData.spikeData} 
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Mutation Heatmap */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      gridColumn: '1 / span 2'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                        Mutation Co-occurrence Patterns
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '1rem' }}>
                        This heatmap shows which mutations frequently occur together, highlighting mutation signatures for variants
                      </p>
                      <div style={{ height: '500px', overflow: 'auto' }}>
                        {(() => {
                          const mutationData = processMutationData(data);
                          // This would require a custom component for rendering a heatmap
                          // Here we'll render a simplified matrix visualization
                          
                          const { topMutationNames, mutationCorrelation } = mutationData;
                          
                          // Since we don't have a dedicated heatmap component in Chart.js,
                          // we'll create a simplified visual representation of the correlation matrix
                          
                          // In a real implementation, you might use a library like D3.js or 
                          // another visualization library that supports heatmaps
                          
                          return (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              margin: 'auto',
                              maxWidth: '100%',
                              overflowX: 'auto'
                            }}>
                              <table style={{ 
                                borderCollapse: 'collapse', 
                                fontSize: '0.75rem',
                                margin: 'auto'
                              }}>
                                <thead>
                                  <tr>
                                    <th style={{ 
                                      padding: '8px', 
                                      backgroundColor: '#f1f5f9',
                                      position: 'sticky',
                                      top: 0,
                                      left: 0,
                                      zIndex: 2
                                    }}></th>
                                    {topMutationNames.slice(0, 8).map(mutation => (
                                      <th key={mutation} style={{ 
                                        padding: '8px', 
                                        backgroundColor: '#f1f5f9',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                        minWidth: '80px',
                                        textAlign: 'center'
                                      }}>
                                        {mutation}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {topMutationNames.slice(0, 8).map(mutation1 => (
                                    <tr key={mutation1}>
                                      <td style={{ 
                                        padding: '8px', 
                                        backgroundColor: '#f1f5f9',
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 1,
                                        fontWeight: 500
                                      }}>
                                        {mutation1}
                                      </td>
                                      {topMutationNames.slice(0, 8).map(mutation2 => {
                                        let intensity = 0;
                                        if (mutation1 !== mutation2 && mutationCorrelation[mutation1]?.[mutation2]) {
                                          // Calculate color intensity based on correlation strength
                                          const maxCorrelation = Math.max(
                                            ...topMutationNames.map(m1 => 
                                              Math.max(...topMutationNames.map(m2 => 
                                                m1 !== m2 ? (mutationCorrelation[m1]?.[m2] || 0) : 0
                                              ))
                                            )
                                          );
                                          
                                          intensity = mutationCorrelation[mutation1][mutation2] / maxCorrelation;
                                        }
                                        
                                        // Generate color based on intensity (green to red scale)
                                        const r = Math.round(255 * intensity);
                                        const g = Math.round(255 * (1 - intensity));
                                        const b = 0;
                                        
                                        return (
                                          <td key={mutation2} style={{ 
                                            padding: '8px',
                                            backgroundColor: mutation1 === mutation2 
                                              ? '#f1f5f9' 
                                              : `rgba(${r}, ${g}, ${b}, ${intensity * 0.8})`,
                                            textAlign: 'center',
                                            color: intensity > 0.5 ? 'white' : 'black'
                                          }}>
                                            {mutation1 !== mutation2 && mutationCorrelation[mutation1]?.[mutation2]
                                              ? mutationCorrelation[mutation1][mutation2]
                                              : '-'}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginTop: '1rem'
                              }}>
                                <div style={{ 
                                  width: '200px', 
                                  height: '20px', 
                                  background: 'linear-gradient(to right, #00ff00, #ffff00, #ff0000)',
                                  marginRight: '10px'
                                }}></div>
                                <div style={{ display: 'flex', width: '200px', justifyContent: 'space-between' }}>
                                  <span>Low</span>
                                  <span>Co-occurrence Frequency</span>
                                  <span>High</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>


              {/* Protein Distribution Chart */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      gridColumn: '1 / span 2'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                        Mutations by Viral Protein
                      </h3>
                      <div style={{ height: '300px' }}>
                        {(() => {
                          // Process data to group mutations by protein
                          const proteinCounts = {};
                          
                          data.forEach(row => {
                            if (row.substitutions) {
                              const mutations = typeof row.substitutions === 'string' 
                                ? row.substitutions.split(',').map(m => m.trim()) 
                                : Array.isArray(row.substitutions) ? row.substitutions : [];
                              
                              mutations.forEach(mutation => {
                                if (mutation && mutation.includes(':')) {
                                  const protein = mutation.split(':')[0];
                                  proteinCounts[protein] = (proteinCounts[protein] || 0) + 1;
                                }
                              });
                            }
                          });
                          
                          const proteinData = {
                            labels: Object.keys(proteinCounts),
                            datasets: [
                              {
                                label: 'Mutation Count',
                                data: Object.values(proteinCounts),
                                backgroundColor: Object.keys(proteinCounts).map((_, i) => 
                                  COLORS[i % COLORS.length]
                                ),
                                borderWidth: 1,
                              }
                            ]
                          };
                          
                          return (
                            <Bar 
                              options={{
                                ...chartOptions,
                                plugins: {
                                  ...chartOptions.plugins,
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                                        return `${context.raw} mutations`;
                                      }
                                    }
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Mutation Count'
                                    }
                                  },
                                  x: {
                                    title: {
                                      display: true,
                                      text: 'Viral Protein'
                                    }
                                  }
                                }
                              }} 
                              data={proteinData} 
                            />
                          );
                        })()}
                      </div>
                      <div style={{ 
                        marginTop: '1rem', 
                        fontSize: '0.875rem', 
                        color: '#4a5568', 
                        backgroundColor: 'white',
                        padding: '1rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #e2e8f0'
                      }}>
                        <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Key Viral Proteins:</p>
                        <ul style={{ paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                          <li><strong>S</strong>: Spike protein - mediates entry into host cells</li>
                          <li><strong>N</strong>: Nucleocapsid protein - binds to viral RNA</li>
                          <li><strong>ORF1ab</strong>: Encodes non-structural proteins including the viral replicase</li>
                          <li><strong>E</strong>: Envelope protein - involved in viral assembly and release</li>
                          <li><strong>M</strong>: Membrane protein - central organizer of virus assembly</li>
                        </ul>
                      </div>
                    </div>

              {/* Mutation Timeline */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      gridColumn: '1 / span 2'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                        Mutation Emergence Timeline
                      </h3>
                      <div style={{ height: '400px' }}>
                        {(() => {
                          // Process temporal mutation data
                          const mutationTimeline = {};
                          
                          // Get top 5 mutations for timeline visualization
                          const mutationData = processMutationData(data);
                          const top5Mutations = mutationData.topMutations.slice(0, 5).map(([mutation]) => mutation);
                          
                          // Initialize the structure
                          const monthlyData = {};
                          
                          // Get sorted months
                          const months = [...new Set(data
                            .filter(row => row.year && row.month)
                            .map(row => `${row.year}-${String(row.month).padStart(2, '0')}`)
                          )].sort();
                          
                          // Initialize counts for each mutation in each month
                          months.forEach(month => {
                            monthlyData[month] = {};
                            top5Mutations.forEach(mutation => {
                              monthlyData[month][mutation] = 0;
                            });
                          });
                          
                          // Count mutations by month
                          data.forEach(row => {
                            if (row.year && row.month && row.substitutions) {
                              const yearMonth = `${row.year}-${String(row.month).padStart(2, '0')}`;
                              
                              const mutations = typeof row.substitutions === 'string' 
                                ? row.substitutions.split(',').map(m => m.trim()) 
                                : Array.isArray(row.substitutions) ? row.substitutions : [];
                              
                              mutations.forEach(mutation => {
                                if (top5Mutations.includes(mutation) && monthlyData[yearMonth]) {
                                  monthlyData[yearMonth][mutation]++;
                                }
                              });
                            }
                          });
                          
                          // Prepare the timeline data for Chart.js
                          const timelineData = {
                            labels: months,
                            datasets: top5Mutations.map((mutation, index) => ({
                              label: mutation,
                              data: months.map(month => monthlyData[month][mutation]),
                              backgroundColor: COLORS[index % COLORS.length],
                              borderColor: COLORS[index % COLORS.length],
                              fill: false,
                              tension: 0.4
                            }))
                          };
                          
                          return (
                            <Line 
                              options={{
                                ...chartOptions,
                                plugins: {
                                  ...chartOptions.plugins,
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                                        return `${context.dataset.label}: ${context.raw} samples`;
                                      }
                                    }
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Samples with Mutation'
                                    }
                                  },
                                  x: {
                                    title: {
                                      display: true,
                                      text: 'Month'
                                    }
                                  }
                                }
                              }} 
                              data={timelineData} 
                            />
                          );
                        })()}
                      </div>
                    </div>

              {/* Mutation Insights */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      gridColumn: '1 / span 2'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                        Mutation Analysis Insights
                      </h3>
                      <div style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.375rem', 
                        border: '1px solid #e2e8f0' 
                      }}>
                        {(() => {
                          const mutationData = processMutationData(data);
                          const topMutation = mutationData.topMutations[0] 
                            ? `${mutationData.topMutations[0][0]} (${mutationData.topMutations[0][1]} samples)` 
                            : 'N/A';
                          
                          return (
                            <>
                              <p style={{ marginBottom: '0.5rem' }}>
                                <strong>Most Common Mutation:</strong> {topMutation}
                              </p>
                              
                              <p style={{ marginBottom: '0.5rem' }}>
                                <strong>Common Spike Mutations:</strong> {mutationData.spikeData.labels.slice(0, 3).join(', ') || 'N/A'}
                              </p>
                              
                              <p style={{ marginBottom: '0.5rem' }}>
                                <strong>Highest Mutation Burden:</strong> {
                                  mutationData.lineageBurdenData.labels.length > 0 
                                    ? `${mutationData.lineageBurdenData.labels[0]} (${mutationData.lineageBurdenData.datasets[0].data[0]} avg. mutations)`
                                    : 'N/A'
                                }
                              </p>
                              
                              <p>
                                <strong>Key Mutation Patterns:</strong> Analysis shows several mutation combinations 
                                that frequently co-occur, suggesting functional relationships between these genetic changes.
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </div>


              {/* Interactive Mutation Explorer */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      gridColumn: '1 / span 2'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                        Functional Impact of Key Mutations
                      </h3>
                      <div style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.375rem', 
                        border: '1px solid #e2e8f0',
                        maxHeight: '400px',
                        overflowY: 'auto'
                      }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse', 
                          fontSize: '0.875rem' 
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                              <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0', position: 'sticky', top: 0, backgroundColor: '#f1f5f9' }}>Mutation</th>
                              <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0', position: 'sticky', top: 0, backgroundColor: '#f1f5f9' }}>Protein</th>
                              <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0', position: 'sticky', top: 0, backgroundColor: '#f1f5f9' }}>Frequency</th>
                              <th style={{ padding: '0.5rem', border: '1px solid #e2e8f0', position: 'sticky', top: 0, backgroundColor: '#f1f5f9' }}>Potential Impact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* This would typically come from a database of known mutation impacts */}
                            {/* Here we'll simulate with some example data */}
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>S:D614G</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Spike</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>High</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Increased infectivity, stabilizes spike in open conformation</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>S:N501Y</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Spike</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Medium</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Enhanced binding to ACE2 receptor, associated with Alpha & Beta variants</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>S:E484K</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Spike</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Medium</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Possible immune escape, reduces neutralization by antibodies</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>S:K417N</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Spike</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Low</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Possible immune escape, changes binding interface</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>S:P681R</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Spike</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Medium</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Near furin cleavage site, may increase cell entry efficiency</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>N:R203K</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Nucleocapsid</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>High</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>May affect RNA binding, often co-occurs with N:G204R</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>ORF1a:T3255I</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>NSP5 (Protease)</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Low</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>May affect protease function, under investigation</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>S:L452R</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Spike</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Medium</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Enhanced ACE2 receptor binding, reduced antibody recognition</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>S:H69del</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Spike</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Medium</td>
                              <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>Often co-occurs with S:V70del, may affect antibody binding</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

              {/* Mutation Evolution */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      gridColumn: '1 / span 2'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                        Mutation Evolution Network
                      </h3>
                      <div style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.375rem', 
                        border: '1px solid #e2e8f0'
                      }}>
                        <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#4a5568' }}>
                          The evolution network shows how mutations accumulate in lineages over time, revealing the viral evolutionary pathway.
                        </p>
                        
                        {/* A simplified visualization of mutation evolution network */}
                        <div style={{ 
                          height: '300px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          position: 'relative'
                        }}>
                          {/* This would typically be implemented with D3.js or a similar library */}
                          {/* Here we'll create a simplified representation */}
                          <div style={{ 
                            position: 'absolute', 
                            width: '80%', 
                            maxWidth: '800px',
                            height: '100%'
                          }}>
                            {/* Base */}
                            <div style={{ 
                              position: 'absolute', 
                              left: '5%', 
                              top: '40%', 
                              backgroundColor: '#CBD5E0', 
                              padding: '10px 15px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              Original Strain
                            </div>
                            
                            {/* Level 1 Mutations */}
                            <div style={{ 
                              position: 'absolute', 
                              left: '25%', 
                              top: '20%', 
                              backgroundColor: '#4299E1', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              S:D614G
                            </div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '25%', 
                              top: '60%', 
                              backgroundColor: '#4299E1', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              N:R203K
                            </div>
                            
                            {/* Level 2 Mutations */}
                            <div style={{ 
                              position: 'absolute', 
                              left: '45%', 
                              top: '10%', 
                              backgroundColor: '#ED8936', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              S:N501Y
                            </div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '45%', 
                              top: '30%', 
                              backgroundColor: '#ED8936', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              S:H69del + V70del
                            </div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '45%', 
                              top: '50%', 
                              backgroundColor: '#ED8936', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              S:E484K
                            </div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '45%', 
                              top: '70%', 
                              backgroundColor: '#ED8936', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              N:G204R
                            </div>
                            
                            {/* Level 3 Mutations */}
                            <div style={{ 
                              position: 'absolute', 
                              left: '65%', 
                              top: '20%', 
                              backgroundColor: '#9F7AEA', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              S:K417N
                            </div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '65%', 
                              top: '40%', 
                              backgroundColor: '#9F7AEA', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              S:L452R
                            </div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '65%', 
                              top: '60%', 
                              backgroundColor: '#9F7AEA', 
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              S:P681R
                            </div>
                            
                            {/* Level 4 (Variant Labels) */}
                            <div style={{ 
                              position: 'absolute', 
                              left: '85%', 
                              top: '15%', 
                              backgroundColor: '#F56565', 
                              color: 'white',
                              padding: '10px 15px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              Alpha
                            </div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '85%', 
                              top: '40%', 
                              backgroundColor: '#F56565', 
                              color: 'white',
                              padding: '10px 15px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              Beta
                            </div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '85%', 
                              top: '65%', 
                              backgroundColor: '#F56565', 
                              color: 'white',
                              padding: '10px 15px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              zIndex: 1
                            }}>
                              Delta
                            </div>
                            
                            {/* Connecting lines - this would be SVG in a real implementation */}
                            {/* We'll use pseudo-elements or divs to simulate lines */}
                            <div style={{ 
                              position: 'absolute', 
                              left: '13%', 
                              top: '40%', 
                              width: '12%', 
                              height: '1px', 
                              backgroundColor: '#A0AEC0',
                              zIndex: 0
                            }}></div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '13%', 
                              top: '40%', 
                              width: '1px', 
                              height: '20%', 
                              backgroundColor: '#A0AEC0',
                              zIndex: 0
                            }}></div>
                            
                            <div style={{ 
                              position: 'absolute', 
                              left: '13%', 
                              top: '40%', 
                              width: '1px', 
                              height: '-20%', 
                              backgroundColor: '#A0AEC0',
                              zIndex: 0
                            }}></div>
                            
                            {/* Additional simulated connecting lines would be added here */}
                            {/* But we'll skip them for brevity */}
                          </div>
                          
                          <div style={{ 
                            position: 'absolute', 
                            bottom: '10px', 
                            width: '100%', 
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: '#4A5568'
                          }}>
                            <p style={{ fontStyle: 'italic' }}>
                              Note: This is a simplified representation. In practice, a dynamic graph visualization would be used.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

              {/* Convergent Evolution */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      gridColumn: '1 / span 2'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                        Convergent Evolution Analysis
                      </h3>
                      <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#4a5568' }}>
                        Convergent evolution occurs when the same mutations arise independently in different lineages, suggesting selective advantages.
                      </p>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                        gap: '1rem',
                        backgroundColor: 'white',
                        padding: '1rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ 
                          padding: '0.75rem', 
                          backgroundColor: '#EBF4FF', 
                          borderRadius: '0.375rem',
                          borderLeft: '4px solid #4299E1'
                        }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            S:E484K Mutation
                          </h4>
                          <p style={{ fontSize: '0.75rem' }}>
                            Found independently in Beta, Gamma, and some Delta sublineages. Located in the receptor-binding domain, affecting antibody recognition.
                          </p>
                        </div>
                        
                        <div style={{ 
                          padding: '0.75rem', 
                          backgroundColor: '#EBF4FF', 
                          borderRadius: '0.375rem',
                          borderLeft: '4px solid #4299E1'
                        }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            S:N501Y Mutation
                          </h4>
                          <p style={{ fontSize: '0.75rem' }}>
                            Convergently evolved in Alpha, Beta, and Gamma lineages. Enhances ACE2 receptor binding, potentially increasing transmissibility.
                          </p>
                        </div>
                        
                        <div style={{ 
                          padding: '0.75rem', 
                          backgroundColor: '#EBF4FF', 
                          borderRadius: '0.375rem',
                          borderLeft: '4px solid #4299E1'
                        }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            S:P681R/H Mutations
                          </h4>
                          <p style={{ fontSize: '0.75rem' }}>
                            P681R in Delta and P681H in Alpha. Both affect the furin cleavage site, potentially enhancing viral entry efficiency.
                          </p>
                        </div>
                        
                        <div style={{ 
                          padding: '0.75rem', 
                          backgroundColor: '#EBF4FF', 
                          borderRadius: '0.375rem',
                          borderLeft: '4px solid #4299E1'
                        }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            S:L452R Mutation
                          </h4>
                          <p style={{ fontSize: '0.75rem' }}>
                            Found in Delta and Epsilon lineages. Located in the receptor-binding domain, may enhance transmissibility and immune evasion.
                          </p>
                        </div>
                      </div>
                    </div>

              {/* 3D Structure Visualization Placeholder */}
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      gridColumn: '1 / span 2'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                        3D Protein Structure - Mutation Impact
                      </h3>
                      <div style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.375rem', 
                        border: '1px solid #e2e8f0',
                        height: '300px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <p style={{ marginBottom: '1rem', textAlign: 'center' }}>
                          3D visualization of key mutations on the SARS-CoV-2 spike protein structure.
                        </p>
                        
                        <div style={{ 
                          display: 'flex', 
                          gap: '1rem', 
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ 
                            width: '150px', 
                            height: '150px', 
                            backgroundColor: '#EBF8FF', 
                            borderRadius: '50%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            color: '#2B6CB0',
                            padding: '0.5rem',
                            textAlign: 'center',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            position: 'relative'
                          }}>
                            Receptor Binding Domain
                            <div style={{ 
                              position: 'absolute', 
                              top: '30%', 
                              right: '20%', 
                              width: '15px', 
                              height: '15px', 
                              backgroundColor: '#F56565', 
                              borderRadius: '50%',
                              border: '2px solid white'
                            }}></div>
                            <div style={{ 
                              position: 'absolute', 
                              bottom: '30%', 
                              left: '25%', 
                              width: '15px', 
                              height: '15px', 
                              backgroundColor: '#ED8936', 
                              borderRadius: '50%',
                              border: '2px solid white'
                            }}></div>
                          </div>
                          
                          <div style={{ 
                            width: '130px', 
                            height: '130px', 
                            backgroundColor: '#E9FAF0', 
                            borderRadius: '50%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            color: '#2F855A',
                            padding: '0.5rem',
                            textAlign: 'center',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            position: 'relative'
                          }}>
                            N-Terminal Domain
                            <div style={{ 
                              position: 'absolute', 
                              top: '40%', 
                              right: '10%', 
                              width: '15px', 
                              height: '15px', 
                              backgroundColor: '#9F7AEA', 
                              borderRadius: '50%',
                              border: '2px solid white'
                            }}></div>
                          </div>
                          
                          <div style={{ 
                            width: '110px', 
                            height: '110px', 
                            backgroundColor: '#FEF5E7', 
                            borderRadius: '50%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            color: '#C05621',
                            padding: '0.5rem',
                            textAlign: 'center',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            position: 'relative'
                          }}>
                            Furin Cleavage Site
                            <div style={{ 
                              position: 'absolute', 
                              top: '25%', 
                              left: '25%', 
                              width: '15px', 
                              height: '15px', 
                              backgroundColor: '#38B2AC', 
                              borderRadius: '50%',
                              border: '2px solid white'
                            }}></div>
                          </div>
                        </div>
                        
                        <div style={{ 
                          marginTop: '1rem', 
                          display: 'flex', 
                          gap: '1rem', 
                          justifyContent: 'center',
                          fontSize: '0.675rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ 
                              width: '10px', 
                              height: '10px', 
                              backgroundColor: '#F56565', 
                              borderRadius: '50%',
                              marginRight: '0.25rem'
                            }}></div>
                            <span>N501Y</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ 
                              width: '10px', 
                              height: '10px', 
                              backgroundColor: '#ED8936', 
                              borderRadius: '50%',
                              marginRight: '0.25rem'
                            }}></div>
                            <span>E484K</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ 
                              width: '10px', 
                              height: '10px', 
                              backgroundColor: '#9F7AEA', 
                              borderRadius: '50%',
                              marginRight: '0.25rem'
                            }}></div>
                            <span>H69del-V70del</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ 
                              width: '10px', 
                              height: '10px', 
                              backgroundColor: '#38B2AC', 
                              borderRadius: '50%',
                              marginRight: '0.25rem'
                            }}></div>
                            <span>P681R</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}



        {/* Other tabs would go here */}
        {(activeTab !== 'overview' && activeTab !== 'variants' && activeTab !== 'temporal' && activeTab !== 'demographics' && activeTab !== 'mutations') && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Analysis
            </h2>
            <p>This tab is under development. Please check back later.</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{ 
        marginTop: '1.5rem', 
        textAlign: 'center', 
        color: '#718096',
        fontSize: '0.875rem'
      }}>
        <p>CovBoard: COVID-19 Genomic Data Dashboard | Data processed: {stats.totalSamples} samples</p>
        <p style={{ marginTop: '0.25rem' }}>
          Analysis of SARS-CoV-2 sequences with variant, mutation, temporal and geographic insights
        </p>
      </div>
    </div>
  );
};

export default CovBoard;