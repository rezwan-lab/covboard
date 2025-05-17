## CovBoard
# COVID-19 Genomic Dashboard

CovBoard is a web dashboard that shows COVID-19 variant data using charts and visualizations. It helps analyze SARS-CoV-2 genetic information across different variants, mutations, time periods, and patient groups.

---
CovBoard includes:

* Overview Dashboard: Quick summary of key metrics and charts
* Variant Analysis: Explore different COVID-19 variants and their distribution
* Temporal Analysis: See how variants changed over time
* Demographics Analysis: View patient age and gender distribution
* Mutation Analysis: Examine genetic mutations in the COVID-19 genome

---

# Instructions:

1. Clone the repository

```
git clone https://github.com/rezwan-lab/covboard.git

cd covboard

```

2. Install dependencies: npm install
3. Put analysed CSV data file in the public folder as df_cleaned.csv
4. Start the development server: npm start
5. Open http://localhost:3000 in browser


# Requirements

Python
```
pandas==2.0.0
numpy==1.24.3
scikit-learn==1.2.2
matplotlib==3.7.1
seaborn==0.12.2
plotly==5.14.1
```

Node.js

```
"dependencies": {
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "chart.js": "^4.3.0",
  "react-chartjs-2": "^5.2.0",
  "recharts": "^2.5.0",
  "papaparse": "^5.4.1",
  "d3": "^7.8.4"
}
```

React App

```
# Install Node.js dependencies
npm install

# Start development server
npm start
```

## Author:
Dr Rezwanuzzaman Laskar
