import { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'

function useThemeColors() {
  const [colors, setColors] = useState({
    text: '#1A1A2E',
    border: '#E8EAF0',
    accentBlue: '#7EB6FF',
    bg: '#FFFFFF'
  })

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement
      const computed = getComputedStyle(root)
      setColors({
        text: computed.getPropertyValue('--text').trim() || '#1A1A2E',
        border: computed.getPropertyValue('--border').trim() || '#E8EAF0',
        accentBlue: computed.getPropertyValue('--accent-blue').trim() || '#7EB6FF',
        bg: computed.getPropertyValue('--bg').trim() || '#FFFFFF'
      })
    }

    updateColors()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          updateColors()
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  return colors
}

export default function Charts({ sesiones }) {
  const theme = useThemeColors()

  const dataPorDia = useMemo(() => {
    if (!sesiones || sesiones.length === 0) return []
    const byDate = sesiones.reduce((acc, s) => {
      acc[s.fecha] = (acc[s.fecha] || 0) + s.duracion_minutos
      return acc
    }, {})

    // Sort dates
    const sortedDates = Object.keys(byDate).sort()
    
    // Take last 7 days
    const last7 = sortedDates.slice(-7)
    
    return last7.map(date => {
      const parts = date.split('-')
      const shortDate = `${parts[2]}/${parts[1]}`
      return {
        fechaStr: shortDate,
        fullDate: date,
        minutos: byDate[date]
      }
    })
  }, [sesiones])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title">{payload[0].payload.fullDate}</p>
          <p>
            <span className="chart-tooltip-dot" style={{ backgroundColor: theme.accentBlue }}></span>
            {payload[0].value} minutos estudiados
          </p>
        </div>
      )
    }
    return null
  }

  if (dataPorDia.length === 0) {
    return <p className="empty">Registra sesiones en diferentes días para ver tus gráficos.</p>
  }

  return (
    <div className="charts-section">
      <div className="chart-card">
        <h3>Minutos de estudio (últimos 7 días activos)</h3>
        <div className="chart-wrapper" style={{ height: 250, marginTop: '24px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
              <XAxis 
                dataKey="fechaStr" 
                tick={{ fill: theme.text, fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                dy={10} 
              />
              <YAxis 
                tick={{ fill: theme.text, fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                dx={-10} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="minutos" fill={theme.accentBlue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Tendencia de estudio</h3>
        <div className="chart-wrapper" style={{ height: 250, marginTop: '24px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
              <XAxis 
                dataKey="fechaStr" 
                tick={{ fill: theme.text, fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                dy={10} 
              />
              <YAxis 
                tick={{ fill: theme.text, fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                dx={-10} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="minutos" 
                stroke={theme.accentBlue} 
                strokeWidth={3} 
                dot={{ r: 4, fill: theme.bg, stroke: theme.accentBlue, strokeWidth: 2 }} 
                activeDot={{ r: 6, fill: theme.accentBlue, stroke: theme.bg }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
