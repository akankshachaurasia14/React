const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
)

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    profile: { type: Object, required: true },
    resumeName: String,
    resumeContent: String
  },
  { timestamps: true }
)

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    type: { type: String, required: true },
    location: String,
    salary: String,
    skills: [String],
    posted: String,
    description: String
  },
  { timestamps: true }
)

const applicationSchema = new mongoose.Schema(
  {
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    jobTitle: String,
    company: String,
    candidateName: String,
    candidateEmail: String,
    resumeName: String,
    status: { type: String, default: 'Applied' }
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)
const Profile = mongoose.model('Profile', profileSchema)
const Job = mongoose.model('Job', jobSchema)
const Application = mongoose.model('Application', applicationSchema)

const defaultJobs = [
  {
    title: 'Frontend Developer',
    company: 'PulseTech',
    type: 'Full-time',
    location: 'Bengaluru',
    salary: '₹10L - ₹16L',
    skills: ['React', 'JavaScript', 'CSS', 'Redux'],
    posted: '2 days ago',
    description: 'Build responsive user interfaces for a fast-growing product team.'
  },
  {
    title: 'React Intern',
    company: 'BrightLoop',
    type: 'Internship',
    location: 'Pune',
    salary: '₹15k/month',
    skills: ['React', 'UI Design', 'Git'],
    posted: 'Today',
    description: 'Support the engineering team on product features and design implementation.'
  },
  {
    title: 'Product Analyst',
    company: 'Northstar AI',
    type: 'Full-time',
    location: 'Hyderabad',
    salary: '₹12L - ₹18L',
    skills: ['SQL', 'Data Analysis', 'Excel', 'Python'],
    posted: '4 days ago',
    description: 'Turn product usage data into insights that shape roadmap decisions.'
  },
  {
    title: 'UX Designer',
    company: 'Studio Mint',
    type: 'Contract',
    location: 'Mumbai',
    salary: '₹40k/day',
    skills: ['Figma', 'UI Design', 'Prototyping'],
    posted: '1 week ago',
    description: 'Create intuitive experiences for our SaaS dashboard and mobile apps.'
  },
  {
    title: 'Node.js Backend Developer',
    company: 'CloudNova',
    type: 'Full-time',
    location: 'Remote',
    salary: '₹14L - ₹22L',
    skills: ['Node.js', 'Express', 'MongoDB', 'API Development'],
    posted: '3 days ago',
    description: 'Build scalable backends and integrations for B2B SaaS products.'
  },
  {
    title: 'Data Science Intern',
    company: 'Insight Labs',
    type: 'Internship',
    location: 'Remote',
    salary: '₹20k/month',
    skills: ['Python', 'Machine Learning', 'SQL'],
    posted: 'Today',
    description: 'Help research teams build models and analyze product data.'
  }
]

const normalizeText = (value = '') => value.toLowerCase()

const calculateJobMatch = (job, profile, resumeText = '') => {
  const searchableText = [
    job.title,
    job.company,
    job.description,
    job.location,
    ...(job.skills || []),
    profile.title || '',
    profile.summary || '',
    profile.location || '',
    ...(profile.skills || []),
    resumeText || ''
  ]
    .join(' ')
    .toLowerCase()

  const profileSkillSet = new Set((profile.skills || []).map((skill) => skill.toLowerCase()))
  const jobSkillSet = new Set((job.skills || []).map((skill) => skill.toLowerCase()))

  let score = 0
  jobSkillSet.forEach((skill) => {
    if (profileSkillSet.has(skill)) {
      score += 5
    }
  })

  if (profile.location && normalizeText(profile.location).includes(normalizeText(job.location))) {
    score += 2
  }

  if (profile.title && normalizeText(profile.title).includes(normalizeText(job.title.split(' ')[0]))) {
    score += 2
  }

  const keywordMatches = Array.from(jobSkillSet).filter((skill) => searchableText.includes(skill))
  score += keywordMatches.length

  return score
}

const seedJobs = async () => {
  const count = await Job.countDocuments()
  if (count === 0) {
    await Job.insertMany(defaultJobs)
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 })
    res.json(jobs)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch jobs' })
  }
})

app.post('/api/jobs', async (req, res) => {
  try {
    const job = await Job.create({
      ...req.body,
      posted: req.body.posted || 'Just now'
    })

    res.status(201).json(job)
  } catch (error) {
    res.status(500).json({ message: 'Failed to create job' })
  }
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, password: hashedPassword })

    res.status(201).json({ id: user._id, name: user.name, email: user.email })
  } catch (error) {
    res.status(500).json({ message: 'Signup failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    res.json({ id: user._id, name: user.name, email: user.email })
  } catch (error) {
    res.status(500).json({ message: 'Login failed' })
  }
})

app.post('/api/profile', async (req, res) => {
  try {
    const { userId, profile, resumeName, resumeContent } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User id is required.' })
    }

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId },
      { userId, profile, resumeName, resumeContent },
      { new: true, upsert: true }
    )

    res.json(updatedProfile)
  } catch (error) {
    res.status(500).json({ message: 'Profile save failed' })
  }
})

app.post('/api/jobs/match', async (req, res) => {
  try {
    const { profile = {}, resumeContent = '' } = req.body
    const jobs = await Job.find().sort({ createdAt: -1 })

    const scoredJobs = jobs
      .map((job) => ({
        ...job.toObject(),
        matchScore: calculateJobMatch(job.toObject(), profile, resumeContent)
      }))
      .sort((a, b) => b.matchScore - a.matchScore)

    res.json({ jobs: scoredJobs })
  } catch (error) {
    res.status(500).json({ message: 'Job matching failed' })
  }
})

app.get('/api/applications', async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 })
    res.json(applications)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch applications' })
  }
})

app.post('/api/applications', async (req, res) => {
  try {
    const application = await Application.create({
      ...req.body,
      status: 'Applied'
    })

    res.status(201).json(application)
  } catch (error) {
    res.status(500).json({ message: 'Application failed' })
  }
})

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    await seedJobs()
    app.listen(PORT, () => {
      console.log(`API running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('MongoDB connection error:', error)
  }
}

startServer()
