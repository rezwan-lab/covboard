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
        {['overview', 'variants', 'temporal', 'demographics'].map(tab => (
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









        {/* Other tabs would go here */}
        {activeTab !== 'overview' && (
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