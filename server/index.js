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

const memoryJobs = defaultJobs.map((job, index) => ({ id: index + 1, ...job }))
const memoryUsers = []
const memoryProfiles = {}
const memoryApplications = []

const isMongoReady = () => mongoose.connection.readyState === 1

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
  if (!isMongoReady()) {
    return
  }

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
    if (isMongoReady()) {
      const jobs = await Job.find().sort({ createdAt: -1 })
      return res.json(jobs)
    }

    return res.json(memoryJobs)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch jobs' })
  }
})

app.post('/api/jobs', async (req, res) => {
  try {
    if (isMongoReady()) {
      const job = await Job.create({
        ...req.body,
        posted: req.body.posted || 'Just now'
      })
      return res.status(201).json(job)
    }

    const job = {
      id: Date.now(),
      ...req.body,
      posted: req.body.posted || 'Just now'
    }
    memoryJobs.unshift(job)
    return res.status(201).json(job)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create job' })
  }
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }

    if (isMongoReady()) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(409).json({ message: 'Email already exists.' })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const user = await User.create({ name, email, password: hashedPassword })
      return res.status(201).json({ id: user._id, name: user.name, email: user.email })
    }

    const existingUser = memoryUsers.find((user) => user.email === email)
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = {
      id: Date.now(),
      name,
      email,
      password: hashedPassword
    }
    memoryUsers.push(user)
    return res.status(201).json({ id: user.id, name: user.name, email: user.email })
  } catch (error) {
    return res.status(500).json({ message: 'Signup failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    if (isMongoReady()) {
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' })
      }

      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password.' })
      }

      return res.json({ id: user._id, name: user.name, email: user.email })
    }

    const user = memoryUsers.find((candidate) => candidate.email === email)
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    return res.json({ id: user.id, name: user.name, email: user.email })
  } catch (error) {
    return res.status(500).json({ message: 'Login failed' })
  }
})

app.post('/api/profile', async (req, res) => {
  try {
    const { userId, profile, resumeName, resumeContent } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'User id is required.' })
    }

    if (isMongoReady()) {
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId },
        { userId, profile, resumeName, resumeContent },
        { new: true, upsert: true }
      )
      return res.json(updatedProfile)
    }

    memoryProfiles[userId] = {
      userId,
      profile,
      resumeName,
      resumeContent,
      updatedAt: new Date().toISOString()
    }

    return res.json(memoryProfiles[userId])
  } catch (error) {
    return res.status(500).json({ message: 'Profile save failed' })
  }
})

app.post('/api/jobs/match', async (req, res) => {
  try {
    const { profile = {}, resumeContent = '' } = req.body

    let jobs = []
    if (isMongoReady()) {
      jobs = await Job.find().sort({ createdAt: -1 })
    } else {
      jobs = memoryJobs
    }

    const scoredJobs = jobs
      .map((job) => ({
        ...(job.toObject ? job.toObject() : job),
        matchScore: calculateJobMatch(
          job.toObject ? job.toObject() : job,
          profile,
          resumeContent
        )
      }))
      .sort((a, b) => b.matchScore - a.matchScore)

    return res.json({ jobs: scoredJobs })
  } catch (error) {
    return res.status(500).json({ message: 'Job matching failed' })
  }
})

app.get('/api/applications', async (req, res) => {
  try {
    if (isMongoReady()) {
      const applications = await Application.find().sort({ createdAt: -1 })
      return res.json(applications)
    }

    return res.json(memoryApplications)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch applications' })
  }
})

app.post('/api/applications', async (req, res) => {
  try {
    if (isMongoReady()) {
      const application = await Application.create({
        ...req.body,
        status: 'Applied'
      })
      return res.status(201).json(application)
    }

    const application = {
      id: Date.now(),
      ...req.body,
      status: 'Applied'
    }
    memoryApplications.push(application)
    return res.status(201).json(application)
  } catch (error) {
    return res.status(500).json({ message: 'Application failed' })
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
    console.log('Starting server with in-memory fallback mode...')
    app.listen(PORT, () => {
      console.log(`API running at http://localhost:${PORT} (fallback mode)`)
    })
  }
}

startServer()
