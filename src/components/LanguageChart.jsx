import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#5b7cf7', '#a78bfa', '#34d399', '#f59e0b', '#f87171', '#38bdf8']

function LanguageChart({ data }) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }))

  return (
    <div className="language-chart">
      <p className="section-label">Language Breakdown</p>
      {/* Fixed height, width explicitly 99% prevents ResponsiveContainer resize loop */}
      <ResponsiveContainer width="99%" height={280}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="42%"
            outerRadius={80}
            strokeWidth={0}
            animationBegin={200}
            animationDuration={600}
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1c2333',
              border: '1px solid #21293a',
              borderRadius: 6,
              fontSize: 12,
              color: '#e6edf3',
            }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
            formatter={(value) => (
              <span style={{ color: '#8b949e' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default LanguageChart