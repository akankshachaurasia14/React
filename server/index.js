const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const jobs = [
  {
    id: 1,
    title: 'Frontend Developer',
    company: 'PulseTech',
    type: 'Full-time',
    location: 'Remote',
    salary: '$85K - $110K',
    skills: ['React', 'JavaScript', 'CSS'],
    posted: '2 days ago',
    description: 'Build responsive user interfaces for a fast-growing product team.'
  },
  {
    id: 2,
    title: 'React Intern',
    company: 'BrightLoop',
    type: 'Internship',
    location: 'Hybrid',
    salary: '$18/hr',
    skills: ['React', 'UI Design', 'Git'],
    posted: 'Today',
    description: 'Support the engineering team on product features and design implementation.'
  },
  {
    id: 3,
    title: 'Product Analyst',
    company: 'Northstar AI',
    type: 'Full-time',
    location: 'New York',
    salary: '$78K - $95K',
    skills: ['SQL', 'Data Analysis', 'Excel'],
    posted: '4 days ago',
    description: 'Turn product usage data into insights that shape roadmap decisions.'
  }
]

const applications = []

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/jobs', (req, res) => {
  res.json(jobs)
})

app.post('/api/jobs', (req, res) => {
  const job = {
    id: Date.now(),
    ...req.body,
    posted: req.body.posted || 'Just now'
  }

  jobs.unshift(job)
  res.status(201).json(job)
})

app.get('/api/applications', (req, res) => {
  res.json(applications)
})

app.post('/api/applications', (req, res) => {
  const application = {
    id: Date.now(),
    ...req.body,
    status: 'Applied'
  }

  applications.push(application)
  res.status(201).json(application)
})

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`)
})
