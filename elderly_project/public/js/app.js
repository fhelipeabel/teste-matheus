(() => {
  const { useState, useEffect, useRef } = React;
  const {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
  } = Recharts;

  /**
   * Coordinates of Brazilian state capitals used to position markers on
   * the Leaflet map.  These values are approximate and derived from
   * publicly available geospatial data.  They provide a simple way
   * to visualise the relative location of each state without
   * relying on external geojson files, which may be unreachable in
   * certain environments.
   */
  const STATE_COORDS = {
    BR: { lat: -15.78, lng: -47.93 },
    RO: { lat: -8.76, lng: -63.90 },
    AC: { lat: -9.97, lng: -67.80 },
    AM: { lat: -3.12, lng: -60.02 },
    RR: { lat: 2.82, lng: -60.67 },
    PA: { lat: -1.45, lng: -48.50 },
    AP: { lat: 1.41, lng: -51.77 },
    TO: { lat: -10.25, lng: -48.36 },
    MA: { lat: -2.53, lng: -44.30 },
    PI: { lat: -5.09, lng: -42.80 },
    CE: { lat: -3.72, lng: -38.54 },
    RN: { lat: -5.81, lng: -35.21 },
    PB: { lat: -7.12, lng: -34.88 },
    PE: { lat: -8.05, lng: -34.88 },
    AL: { lat: -9.64, lng: -35.73 },
    SE: { lat: -10.95, lng: -37.07 },
    BA: { lat: -12.97, lng: -38.50 },
    MG: { lat: -19.92, lng: -43.94 },
    ES: { lat: -20.31, lng: -40.31 },
    RJ: { lat: -22.91, lng: -43.17 },
    SP: { lat: -23.55, lng: -46.64 },
    PR: { lat: -25.43, lng: -49.27 },
    SC: { lat: -27.59, lng: -48.55 },
    RS: { lat: -30.03, lng: -51.23 },
    MS: { lat: -20.47, lng: -54.62 },
    MT: { lat: -15.61, lng: -56.10 },
    GO: { lat: -16.68, lng: -49.25 },
    DF: { lat: -15.78, lng: -47.93 },
  };

  /**
   * Format large numbers into compact strings (e.g. 34 000 000 → "34,0 M").
   * This helper improves readability in charts and tables.
   */
  function formatNumber(value) {
    if (value >= 1e6) return (value / 1e6).toFixed(1).replace('.', ',') + ' M';
    if (value >= 1e3) return (value / 1e3).toFixed(0) + ' k';
    return value.toString();
  }

  function App() {
    const [states, setStates] = useState([]);
    const [year, setYear] = useState('2024');
    const [selectedState, setSelectedState] = useState('BR');
    const [overview, setOverview] = useState([]);
    const [stateSeries, setStateSeries] = useState({});
    const [projections, setProjections] = useState({});
    const [livingDist, setLivingDist] = useState({});
    const [dependencyDist, setDependencyDist] = useState({});
    const [incomeStats, setIncomeStats] = useState({});
    const [yearsList, setYearsList] = useState([]);
    const mapRef = useRef(null);

    // Fetch static metadata (states, living, dependency, income) on mount
    useEffect(() => {
      fetch('/api/states').then((res) => res.json()).then(setStates);
      fetch('/api/living').then((res) => res.json()).then(setLivingDist);
      fetch('/api/dependency').then((res) => res.json()).then(setDependencyDist);
      fetch('/api/income').then((res) => res.json()).then(setIncomeStats);

      // Fetch Brazil time series once to extract list of years for the
      // selector.  This ensures the front‑end stays in sync with the
      // backend’s dataset without hard‑coding year values.  The keys of
      // the returned object are strings representing years.
      fetch('/api/elderly?state=BR')
        .then((res) => res.json())
        .then((series) => {
          const yrs = Object.keys(series).sort();
          setYearsList(yrs);
          // Default to the most recent year if available.
          if (yrs.length > 0) setYear(yrs[yrs.length - 1]);
        });
    }, []);

    // Fetch overview data for selected year
    useEffect(() => {
      fetch(`/api/elderly?year=${year}`)
        .then((res) => res.json())
        .then((data) => setOverview(data));
    }, [year]);

    // Fetch series data for selected state
    useEffect(() => {
      fetch(`/api/elderly?state=${selectedState}`)
        .then((res) => res.json())
        .then((data) => setStateSeries(data));
      fetch(`/api/projections/${selectedState}`)
        .then((res) => res.json())
        .then((data) => setProjections(data));
    }, [selectedState]);

    // Initialise and update Leaflet map when overview data changes
    useEffect(() => {
      if (!mapRef.current) {
        const map = L.map('stateMap').setView([-15.8, -47.9], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);
        mapRef.current = { map, markers: {} };
      }
      const { map, markers } = mapRef.current;
      // Remove existing markers
      Object.values(markers).forEach((m) => m.remove());
      // Add markers for each state in the overview
      overview.forEach((item) => {
        const coords = STATE_COORDS[item.sigla];
        if (!coords) return;
        const radius = 4 + item.elder_percentage; // enlarge by percentage
        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius,
          color: '#4f46e5',
          fillColor: '#4f46e5',
          fillOpacity: 0.5,
          weight: 1,
        })
          .bindPopup(
            `<strong>${item.name}</strong><br/>${item.elder_percentage.toFixed(1)} % de idosos` +
            `<br/>${formatNumber(item.elder_population)} idosos`
          )
          .on('click', () => setSelectedState(item.sigla));
        marker.addTo(map);
        markers[item.sigla] = marker;
      });
    }, [overview]);

    // Prepare data for charts
    const topStates = [...overview]
      .filter((item) => item.sigla !== 'BR')
      .sort((a, b) => b.elder_percentage - a.elder_percentage)
      .slice(0, 8);

    // Convert state series object into array sorted by year
    const stateChartData = Object.keys(stateSeries)
      .sort()
      .map((yr) => ({
        year: yr,
        elderly: stateSeries[yr]?.elder_population,
        total: stateSeries[yr]?.total_population,
        percentage: stateSeries[yr]?.elder_percentage,
      }));

    // Data for living arrangement pie chart
    const livingPieData = [
      { name: 'Mora sozinho(a)', value: livingDist.alone || 0 },
      { name: 'Com outras pessoas', value: livingDist.withOthers || 0 },
      { name: 'Com família/Instituições', value: livingDist.withFamilyOrOther || 0 },
    ];

    // Data for dependency pie chart
    const dependencyPieData = [
      { name: 'Independentes/Parciais', value: dependencyDist.independentOrPartial || 0 },
      { name: 'Totalmente dependentes', value: dependencyDist.total || 0 },
    ];

    return (
      React.createElement('div', { className: 'p-4 max-w-7xl mx-auto' },
        [
          // Title
          React.createElement('h1', {
            key: 'title',
            className: 'text-3xl font-bold mb-4 text-indigo-700'
          }, 'Dashboard da População Idosa no Brasil'),

          // Controls
          React.createElement('div', { key: 'controls', className: 'flex flex-wrap gap-4 mb-4' }, [
            // Year selector
            React.createElement('div', { key: 'year', className: 'flex items-center space-x-2' }, [
              React.createElement('label', { htmlFor: 'yearSelect', className: 'font-medium' }, 'Ano:'),
              React.createElement('select', {
                id: 'yearSelect',
                className: 'border rounded px-2 py-1',
                value: year,
                onChange: (e) => setYear(e.target.value),
              },
                yearsList.map((yr) => (
                  React.createElement('option', { key: yr, value: yr }, yr)
                ))
              ),
            ]),
            // State selector
            React.createElement('div', { key: 'state', className: 'flex items-center space-x-2' }, [
              React.createElement('label', { htmlFor: 'stateSelect', className: 'font-medium' }, 'Estado:'),
              React.createElement('select', {
                id: 'stateSelect',
                className: 'border rounded px-2 py-1',
                value: selectedState,
                onChange: (e) => setSelectedState(e.target.value),
              },
                states.map(({ sigla, name }) => (
                  React.createElement('option', { key: sigla, value: sigla }, `${sigla} - ${name}`)
                ))
              ),
            ]),
          ]),

          // Summary cards
          React.createElement('div', { key: 'cards', className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6' }, [
            // Card: Elderly count selected year
            React.createElement('div', { key: 'card1', className: 'bg-white rounded shadow p-4' }, [
              React.createElement('h3', { className: 'text-sm text-gray-600' }, 'Idosos (ano selecionado)'),
              React.createElement('p', { className: 'text-2xl font-semibold text-indigo-700' }, () => {
                const entry = overview.find((i) => i.sigla === 'BR');
                return entry ? formatNumber(entry.elder_population) : '-';
              }),
            ]),
            // Card: Percentage
            React.createElement('div', { key: 'card2', className: 'bg-white rounded shadow p-4' }, [
              React.createElement('h3', { className: 'text-sm text-gray-600' }, 'Percentual de idosos'),
              React.createElement('p', { className: 'text-2xl font-semibold text-indigo-700' }, () => {
                const entry = overview.find((i) => i.sigla === 'BR');
                return entry ? entry.elder_percentage.toFixed(1) + ' %' : '-';
              }),
            ]),
            // Card: Selected state elderly percentage
            React.createElement('div', { key: 'card3', className: 'bg-white rounded shadow p-4' }, [
              React.createElement('h3', { className: 'text-sm text-gray-600' }, `Idosos em ${selectedState}`),
              React.createElement('p', { className: 'text-2xl font-semibold text-indigo-700' }, () => {
                const entry = overview.find((i) => i.sigla === selectedState);
                return entry ? entry.elder_percentage.toFixed(1) + ' %' : '-';
              }),
            ]),
            // Card: Income
            React.createElement('div', { key: 'card4', className: 'bg-white rounded shadow p-4' }, [
              React.createElement('h3', { className: 'text-sm text-gray-600' }, 'Renda média (PNAD 2023)'),
              React.createElement('p', { className: 'text-lg font-semibold text-indigo-700' }, `R$ ${incomeStats.averageIncome?.toLocaleString('pt-BR') || '-'}`),
              React.createElement('p', { className: 'text-xs text-gray-500' }, `Pensão: R$ ${incomeStats.averagePensionIncome?.toLocaleString('pt-BR') || '-'}`),
            ]),
          ]),

          // Grid: Charts and Map
          React.createElement('div', { key: 'charts', className: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6' }, [
            // Bar chart: Top states
            React.createElement('div', { key: 'bar', className: 'bg-white rounded shadow p-4 h-80' }, [
              React.createElement('h3', { className: 'font-medium mb-2' }, 'Top estados por proporção de idosos'),
              React.createElement(ResponsiveContainer, { width: '100%', height: '90%' },
                React.createElement(BarChart, { data: topStates, layout: 'vertical' }, [
                  React.createElement(CartesianGrid, { strokeDasharray: '3 3', key: 'cg' }),
                  React.createElement(XAxis, { type: 'number', domain: [0, Math.max(...topStates.map(i => i.elder_percentage)) * 1.2], tickFormatter: (val) => val + '%' , key: 'x' }),
                  React.createElement(YAxis, { type: 'category', dataKey: 'sigla', key: 'y' }),
                  React.createElement(Tooltip, { formatter: (value) => `${value.toFixed(1)} %` , key: 'tooltip' }),
                  React.createElement(Bar, { dataKey: 'elder_percentage', fill: '#6366f1', key: 'bar1' }),
                ])
              ),
            ]),
            // Line chart: projections for selected state
            React.createElement('div', { key: 'line', className: 'bg-white rounded shadow p-4 h-80' }, [
              React.createElement('h3', { className: 'font-medium mb-2' }, `Projeção de idosos em ${selectedState}`),
              React.createElement(ResponsiveContainer, { width: '100%', height: '90%' },
                React.createElement(LineChart, { data: stateChartData }, [
                  React.createElement(CartesianGrid, { strokeDasharray: '3 3', key: 'cg' }),
                  React.createElement(XAxis, { dataKey: 'year', interval: stateChartData.length > 20 ? 4 : 0, key: 'x' }),
                  React.createElement(YAxis, { yAxisId: 'left', tickFormatter: formatNumber, key: 'y1' }),
                  React.createElement(YAxis, { yAxisId: 'right', orientation: 'right', domain: [0, 100], tickFormatter: (val) => val + '%', key: 'y2' }),
                  React.createElement(Tooltip, { formatter: (value, name) => {
                    if (name === 'percentage') return [value.toFixed(1) + ' %', 'Percentual'];
                    return [formatNumber(value), name === 'elderly' ? 'Idosos' : 'Total'];
                  }, key: 'tooltip' }),
                  React.createElement(Legend, { key: 'legend' }),
                  React.createElement(Line, { yAxisId: 'left', type: 'monotone', dataKey: 'elderly', stroke: '#4f46e5', name: 'Idosos', dot: false, key: 'l1' }),
                  React.createElement(Line, { yAxisId: 'left', type: 'monotone', dataKey: 'total', stroke: '#60a5fa', name: 'População total', dot: false, key: 'l2' }),
                  React.createElement(Line, { yAxisId: 'right', type: 'monotone', dataKey: 'percentage', stroke: '#a855f7', name: 'Percentual', dot: false, key: 'l3' }),
                ])
              ),
            ]),
            // Pie charts: living and dependency
            React.createElement('div', { key: 'pie1', className: 'bg-white rounded shadow p-4 h-80' }, [
              React.createElement('h3', { className: 'font-medium mb-2' }, 'Arranjos de moradia dos idosos'),
              React.createElement(ResponsiveContainer, { width: '100%', height: '80%' },
                React.createElement(PieChart, null, [
                  React.createElement(Pie, {
                    data: livingPieData,
                    dataKey: 'value',
                    nameKey: 'name',
                    cx: '50%',
                    cy: '50%',
                    innerRadius: 40,
                    outerRadius: 80,
                    fill: '#4f46e5',
                    label: (entry) => `${(entry.percent * 100).toFixed(1)} %`,
                    isAnimationActive: false,
                  }, livingPieData.map((entry, index) => (
                    React.createElement(Cell, { key: index, fill: ['#6366f1', '#60a5fa', '#a855f7'][index % 3] })
                  )))
                ])
              ),
              React.createElement('ul', { className: 'mt-2 text-sm' }, livingPieData.map((entry, index) => (
                React.createElement('li', { key: index, className: 'flex items-center' }, [
                  React.createElement('span', { className: `inline-block w-3 h-3 mr-2 rounded`, style: { backgroundColor: ['#6366f1', '#60a5fa', '#a855f7'][index % 3] } }),
                  `${entry.name}: ${(entry.value * 100).toFixed(1)} %`,
                ])
              )))
            ]),
            React.createElement('div', { key: 'pie2', className: 'bg-white rounded shadow p-4 h-80' }, [
              React.createElement('h3', { className: 'font-medium mb-2' }, 'Dependência entre idosos'),
              React.createElement(ResponsiveContainer, { width: '100%', height: '80%' },
                React.createElement(PieChart, null, [
                  React.createElement(Pie, {
                    data: dependencyPieData,
                    dataKey: 'value',
                    nameKey: 'name',
                    cx: '50%',
                    cy: '50%',
                    innerRadius: 40,
                    outerRadius: 80,
                    fill: '#4f46e5',
                    label: (entry) => `${(entry.percent * 100).toFixed(1)} %`,
                    isAnimationActive: false,
                  }, dependencyPieData.map((entry, index) => (
                    React.createElement(Cell, { key: index, fill: ['#34d399', '#f87171'][index % 2] })
                  )))
                ])
              ),
              React.createElement('ul', { className: 'mt-2 text-sm' }, dependencyPieData.map((entry, index) => (
                React.createElement('li', { key: index, className: 'flex items-center' }, [
                  React.createElement('span', { className: `inline-block w-3 h-3 mr-2 rounded`, style: { backgroundColor: ['#34d399', '#f87171'][index % 2] } }),
                  `${entry.name}: ${(entry.value * 100).toFixed(1)} %`,
                ])
              )))
            ]),
          ]),

          // Map container
          React.createElement('div', { key: 'map', className: 'bg-white rounded shadow p-4 mb-6' }, [
            React.createElement('h3', { className: 'font-medium mb-2' }, 'Mapa dos estados (clique para selecionar)'),
            React.createElement('div', { id: 'stateMap', style: { height: '400px' } }),
          ]),

          // Table of states
          React.createElement('div', { key: 'table', className: 'bg-white rounded shadow p-4 overflow-x-auto mb-8' }, [
            React.createElement('h3', { className: 'font-medium mb-2' }, `Resumo por estado (${year})`),
            React.createElement('table', { className: 'min-w-full text-sm' }, [
              React.createElement('thead', null, 
                React.createElement('tr', { className: 'bg-gray-100' }, [
                  React.createElement('th', { className: 'p-2 text-left' }, 'Estado'),
                  React.createElement('th', { className: 'p-2 text-right' }, 'Idosos'),
                  React.createElement('th', { className: 'p-2 text-right' }, 'Total'),
                  React.createElement('th', { className: 'p-2 text-right' }, '% Idosos'),
                ])
              ),
              React.createElement('tbody', null,
                overview
                  .filter((item) => item.sigla !== 'BR')
                  .sort((a, b) => b.elder_percentage - a.elder_percentage)
                  .map((item) => (
                    React.createElement('tr', { key: item.sigla, className: 'border-b hover:bg-gray-50 cursor-pointer', onClick: () => setSelectedState(item.sigla) }, [
                      React.createElement('td', { className: 'p-2' }, `${item.sigla} - ${item.name}`),
                      React.createElement('td', { className: 'p-2 text-right' }, formatNumber(item.elder_population)),
                      React.createElement('td', { className: 'p-2 text-right' }, formatNumber(item.total_population)),
                      React.createElement('td', { className: 'p-2 text-right' }, `${item.elder_percentage.toFixed(1)} %`),
                    ])
                  ))
              )
            ])
          ])
        ]
      )
    );
  }

  // Render the app
  ReactDOM.render(React.createElement(App), document.getElementById('root'));
})();