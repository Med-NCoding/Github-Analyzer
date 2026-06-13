import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#378ADD', '#EF9F27', '#639922', '#A32D2D', '#854F0B', '#3B6D11']

function LanguageChart({ data }) {
  const chartData = Object.keys(data).map(language => ({
    name: language,
    value: data[language]
  }))

  return (
    <div className="language-chart">
      <h2>Language Breakdown</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default LanguageChart