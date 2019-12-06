/* globals google */
import '../css/index.css'

google.charts.load('current', { packages: ['bar', 'line'] })
google.charts.setOnLoadCallback(drawChart)

const colors = [
  {
    name: 'Red',
    slug: 'red',
    hex: '#c60c30'
  },
  {
    name: 'Orange',
    slug: 'orange',
    hex: '#f9461c'
  },
  {
    name: 'Yellow',
    slug: 'yellow',
    hex: '#f9e300'
  },
  {
    name: 'Green',
    slug: 'green',
    hex: '#009b3a'
  },
  {
    name: 'Blue',
    slug: 'blue',
    hex: '#00a1de'
  },
  {
    name: 'Purple',
    slug: 'purple',
    hex: '#522398'
  },
  {
    name: 'Pink',
    slug: 'pink',
    hex: '#e27ea6'
  },
  {
    name: 'Brown',
    slug: 'brown',
    hex: '#62361b'
  }
]

const issues = [
  {
    name: 'Minor Delays',
    slug: 'minor_delays'
  },
  {
    name: 'Major Delays',
    slug: 'major_delays'
  },
  {
    name: 'Significant Delays',
    slug: 'significant_delays'
  },
  {
    name: 'Planned Work',
    slug: 'planned_work'
  },
  {
    name: 'Service Disruption',
    slug: 'service_disruption'
  }
]

function drawChart() {
  fetch('/tweets/')
    .then(res => {
      return res.json()
    })
    .then(json => {
      declareWinner(json)
      issuesChart(json)
      totalIssuesChart(json)
      timelineChart(json)
      window.addEventListener('resize', e => {
        issuesChart(json)
        totalIssuesChart(json)
        timelineChart(json)
      })
    })
}

function declareWinner(json) {
  const lines = [...colors.map(c => {
    return {
      name: c.name,
      issues: json.filter(d => d.line === c.slug).length
    }
  })]
  const highest = Math.max(...lines.map(l => l.issues))
  const winners = lines.filter(l => l.issues === highest).map(l => l.name + ' Line')
  document.querySelector('.winner').innerHTML = `🎉 ${winners.join(' & ')} <span style="display:inline-block;transform:scaleX(-1)">🎉</span>`
}

function issuesChart(json) {
  const minorDelays = json.filter(d => d.minor_delays)
  const majorDelays = json.filter(d => d.major_delays)
  const significantDelays = json.filter(d => d.significant_delays)
  const plannedWork = json.filter(d => d.planned_work)
  const serviceDisruption = json.filter(d => d.service_disruption)

  const data = google.visualization.arrayToDataTable([
    ['', ...colors.map(c => c.name)],
    [
      'Minor Delays',
      ...colors.map(c => minorDelays.filter(d => d.line === c.slug).length)
    ],
    [
      'Major Delays',
      ...colors.map(c => majorDelays.filter(d => d.line === c.slug).length)
    ],
    [
      'Significant Delays',
      ...colors.map(c => significantDelays.filter(d => d.line === c.slug).length)
    ],
    [
      'Planned Work',
      ...colors.map(c => plannedWork.filter(d => d.line === c.slug).length)
    ],
    [
      'Service Disruption',
      ...colors.map(c => serviceDisruption.filter(d => d.line === c.slug).length)
    ]
  ])

  const options = {
    colors: colors.map(c => c.hex)
  }

  const chart = new google.charts.Bar(document.getElementById('issues'))
  chart.draw(data, google.charts.Bar.convertOptions(options))
}

function totalIssuesChart(json) {
  const red = json.filter(d => d.line === 'red')
  const orange = json.filter(d => d.line === 'orange')
  const yellow = json.filter(d => d.line === 'yellow')
  const green = json.filter(d => d.line === 'green')
  const blue = json.filter(d => d.line === 'blue')
  const purple = json.filter(d => d.line === 'purple')
  const pink = json.filter(d => d.line === 'pink')
  const brown = json.filter(d => d.line === 'brown')

  const data = google.visualization.arrayToDataTable([
    ['', ...issues.map(i => i.name)],
    [
      'Red',
      ...issues.map(i => red.filter(d => d[i.slug]).length)
    ],
    [
      'Orange',
      ...issues.map(i => orange.filter(d => d[i.slug]).length)
    ],
    [
      'Yellow',
      ...issues.map(i => yellow.filter(d => d[i.slug]).length)
    ],
    [
      'Green',
      ...issues.map(i => green.filter(d => d[i.slug]).length)
    ],
    [
      'Blue',
      ...issues.map(i => blue.filter(d => d[i.slug]).length)
    ],
    [
      'Purple',
      ...issues.map(i => purple.filter(d => d[i.slug]).length)
    ],
    [
      'Pink',
      ...issues.map(i => pink.filter(d => d[i.slug]).length)
    ],
    [
      'Brown',
      ...issues.map(i => brown.filter(d => d[i.slug]).length)
    ]
  ])

  const options = {
    isStacked: true
  }

  const chart = new google.charts.Bar(document.getElementById('total-issues'))
  chart.draw(data, google.charts.Bar.convertOptions(options))
}

function timelineChart(json) {
  const dates = {}
  json.forEach(tweet => {
    const date = tweet.date.split('T')[0]
    if (!dates[date]) {
      dates[date] = []
    }
    dates[date].push(tweet)
  })
  const datesArray = Object.values(dates).sort((a, b) => {
    const aDate = new Date(a[0].date)
    const bDate = new Date(b[0].date)
    return aDate - bDate
  })

  const data = google.visualization.arrayToDataTable([
    ['', ...colors.map(c => c.name)],
    ...datesArray.map(d => {
      const date = new Date(d[0].date.split('T')[0])
      return [
        `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
        ...colors.map(c => d.filter(v => v.line === c.slug).length)
      ]
    })
  ])

  const options = {
    colors: colors.map(c => c.hex)
  }

  const chart = new google.charts.Line(document.getElementById('timeline'))
  chart.draw(data, google.charts.Line.convertOptions(options))
}
