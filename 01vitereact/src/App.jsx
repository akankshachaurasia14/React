import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const authStyle = {
  background: 'linear-gradient(135deg, #0f172a, #1d4ed8)',
  color: '#fff'
}

const sampleJobs = [
  {
    id: 1,
    title: 'Frontend Developer',
    company: 'PulseTech',
    type: 'Full-time',
    location: 'Hyderabad',
    salary: '₹10L - ₹16L',
    skills: ['React', 'JavaScript', 'CSS'],
    posted: '2 days ago',
    description: 'Build responsive user interfaces for a fast-growing product team.'
  },
  {
    id: 2,
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
    id: 3,
    title: 'Product Analyst',
    company: 'Northstar AI',
    type: 'Full-time',
    location: 'Bengaluru',
    salary: '₹12L - ₹18L',
    skills: ['SQL', 'Data Analysis', 'Excel'],
    posted: '4 days ago',
    description: 'Turn product usage data into insights that shape roadmap decisions for growing teams.'
  },
  {
    id: 4,
    title: 'UX Designer',
    company: 'Studio Mint',
    type: 'Contract',
    location: 'Mumbai',
    salary: '₹40k/day',
    skills: ['Figma', 'UI Design', 'Prototyping'],
    posted: '1 week ago',
    description: 'Create intuitive experiences for our SaaS dashboard and mobile apps.'
  }
]

const initialProfile = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@email.com',
  phone: '+91 98765 43210',
  title: 'Frontend Developer',
  location: 'Bengaluru, India',
  experience: '2+ years',
  summary: 'Design-focused frontend developer who enjoys building clean, accessible web experiences for Indian startups and enterprises.',
  skills: ['React', 'JavaScript', 'CSS', 'UI Design']
}

function App() {
  const [jobs, setJobs] = useState(sampleJobs)
  const [profile, setProfile] = useState(initialProfile)
  const [resumeName, setResumeName] = useState('resume.pdf')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedLocation, setSelectedLocation] = useState('All')
  const [selectedSkill, setSelectedSkill] = useState('All')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('jobs')
  const [authMode, setAuthMode] = useState('login')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    type: 'Full-time',
    location: '',
    salary: '',
    skills: ''
  })

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await fetch(`${API_URL}/api/jobs`)
        if (!response.ok) {
          throw new Error('Failed to load jobs')
        }
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          setJobs(data)
        }
      } catch (error) {
        console.warn('Using sample job data because the API is unavailable:', error)
      }
    }

    loadJobs()
  }, [])

  const uniqueSkills = useMemo(
    () => Array.from(new Set(jobs.flatMap((job) => job.skills || []))).sort(),
    [jobs]
  )

  const uniqueLocations = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.location))).sort(),
    [jobs]
  )

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const tabFilteredJobs =
      activeTab === 'internships'
        ? jobs.filter((job) => job.type === 'Internship')
        : jobs

    return tabFilteredJobs.filter((job) => {
      const matchesSearch =
        !term ||
        job.title.toLowerCase().includes(term) ||
        job.company.toLowerCase().includes(term) ||
        job.skills.some((skill) => skill.toLowerCase().includes(term))

      const matchesType = selectedType === 'All' || job.type === selectedType
      const matchesLocation =
        selectedLocation === 'All' || job.location === selectedLocation
      const matchesSkill =
        selectedSkill === 'All' || job.skills.includes(selectedSkill)

      return matchesSearch && matchesType && matchesLocation && matchesSkill
    })
  }, [activeTab, jobs, searchTerm, selectedType, selectedLocation, selectedSkill])

  const suggestedJobs = useMemo(() => {
    return jobs
      .filter(
        (job) =>
          job.type !== 'Internship' &&
          (job.skills || []).some((skill) => profile.skills.includes(skill))
      )
      .slice(0, 3)
  }, [jobs, profile.skills])

  const suggestedInternships = useMemo(() => {
    return jobs
      .filter(
        (job) =>
          job.type === 'Internship' &&
          (job.skills || []).some((skill) => profile.skills.includes(skill))
      )
      .slice(0, 3)
  }, [jobs, profile.skills])

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setResumeName(file.name)
      setMessage(`Resume uploaded: ${file.name}`)
    }
  }

  const handleApply = async (job) => {
    try {
      const response = await fetch(`${API_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          candidateName: profile.name,
          candidateEmail: profile.email,
          resumeName
        })
      })

      if (!response.ok) {
        throw new Error('Application failed')
      }

      setJobs((prevJobs) =>
        prevJobs.map((item) =>
          item.id === job.id ? { ...item, applied: true } : item
        )
      )
      setMessage(`Application sent for ${job.title} at ${job.company}`)
    } catch (error) {
      console.error(error)
      setMessage('Unable to submit application right now. Please try again.')
    }
  }

  const handlePostJob = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch(`${API_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newJob,
          skills: newJob.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean),
          posted: 'Just now'
        })
      })

      if (!response.ok) {
        throw new Error('Job post failed')
      }

      const createdJob = await response.json()
      setJobs((prevJobs) => [createdJob, ...prevJobs])
      setNewJob({
        title: '',
        company: '',
        type: 'Full-time',
        location: '',
        salary: '',
        skills: ''
      })
      setMessage(`Your job posting for ${createdJob.title} is live.`)
    } catch (error) {
      console.error(error)
      setMessage('Could not post the job right now.')
    }
  }

  const handleAuthChange = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAuthSubmit = (event) => {
    event.preventDefault()

    if (authMode === 'signup' && authForm.password !== authForm.confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    if (!authForm.email || !authForm.password || (authMode === 'signup' && !authForm.name)) {
      setMessage('Please fill in all required fields.')
      return
    }

    setIsAuthenticated(true)
    setMessage(
      authMode === 'signup'
        ? 'Account created successfully.'
        : 'Welcome back!'
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-page" style={authStyle}>
        <div className="auth-card">
          <div>
            <p className="eyebrow">HirePulse</p>
            <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
            <p className="auth-subtitle">
              {authMode === 'login'
                ? 'Log in to explore opportunities'
                : 'Start your career journey today'}
            </p>
          </div>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={authForm.name}
                onChange={(e) => handleAuthChange('name', e.target.value)}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => handleAuthChange('email', e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => handleAuthChange('password', e.target.value)}
            />
            {authMode === 'signup' && (
              <input
                type="password"
                placeholder="Confirm password"
                value={authForm.confirmPassword}
                onChange={(e) => handleAuthChange('confirmPassword', e.target.value)}
              />
            )}
            <button type="submit">
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>
          <p className="auth-toggle">
            {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div>
          <span className="brand-badge">HirePulse</span>
          <span className="brand-text">Career Hub</span>
        </div>
        <nav>
          <button
            className={activeTab === 'jobs' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('jobs')}
          >
            Jobs
          </button>
          <button
            className={activeTab === 'internships' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('internships')}
          >
            Internships
          </button>
          <button
            className={activeTab === 'post' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('post')}
          >
            Post Job
          </button>
          <button
            className={activeTab === 'profile' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
        </nav>
      </header>

      <main className="dashboard">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Matches for you</p>
            <h1>Discover jobs and internships that fit your goals</h1>
          </div>
          <div className="hero-right">
            <div className="match-pill">98% profile match</div>
            <div className="hero-stats">
              <div>
                <strong>{jobs.length}</strong>
                <span>Open roles</span>
              </div>
              <div>
                <strong>{suggestedJobs.length}</strong>
                <span>Recommended jobs</span>
              </div>
              <div>
                <strong>{suggestedInternships.length}</strong>
                <span>Internship matches</span>
              </div>
            </div>
          </div>
        </section>

        {message && <div className="notice-banner">{message}</div>}

        {activeTab === 'post' ? (
          <section className="post-session-panel">
            <div className="post-session-card">
              <p className="section-label">Recruiter tools</p>
              <h2>Post a new opportunity</h2>
              <form className="post-session-form" onSubmit={handlePostJob}>
                <div className="post-session-grid">
                  <input
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="Job title"
                    required
                  />
                  <input
                    value={newJob.company}
                    onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                    placeholder="Company"
                    required
                  />
                  <select
                    value={newJob.type}
                    onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                  >
                    <option>Full-time</option>
                    <option>Internship</option>
                    <option>Contract</option>
                  </select>
                  <input
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="Location"
                    required
                  />
                  <input
                    value={newJob.salary}
                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    placeholder="Salary"
                  />
                  <input
                    value={newJob.skills}
                    onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })}
                    placeholder="Skills (comma separated)"
                  />
                </div>
                <button type="submit">Post Job</button>
              </form>
            </div>
          </section>
        ) : (
          <section className="content-grid">
            <section className="jobs-panel">
              <div className="panel-header-row">
                <div>
                  <p className="section-label">Opportunities</p>
                  <h2>
                    {activeTab === 'internships'
                      ? 'Internship opportunities'
                      : activeTab === 'profile'
                        ? 'Your job matches'
                        : 'Latest job openings'}
                  </h2>
                </div>
                <span className="result-count">{filteredJobs.length} results</span>
              </div>
              <div className="filters-row">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by role, company, or skill"
                />
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  <option>All</option>
                  <option>Full-time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                </select>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option>All</option>
                  {uniqueLocations.map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
                <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
                  <option>All</option>
                  {uniqueSkills.map((skill) => (
                    <option key={skill}>{skill}</option>
                  ))}
                </select>
              </div>

              <div className="job-list">
                {filteredJobs.map((job) => (
                  <article className="job-card" key={job.id}>
                    <div className="job-card-header">
                      <div>
                        <p className="job-type">{job.type}</p>
                        <h3>{job.title}</h3>
                        <p className="job-company">{job.company}</p>
                      </div>
                      <span className="job-salary">{job.salary}</span>
                    </div>
                    <p className="job-description">{job.description}</p>
                    <div className="job-meta">
                      <span>{job.location}</span>
                      <span>{job.posted}</span>
                    </div>
                    <div className="skill-tags">
                      {(job.skills || []).map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                    <button
                      className="apply-btn"
                      onClick={() => handleApply(job)}
                      disabled={job.applied}
                    >
                      {job.applied ? 'Applied' : 'Apply Now'}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <aside className="sidebar">
              <section className="profile-panel">
                <div className="panel-header">
                  <div className="profile-avatar">AC</div>
                  <div>
                    <h3>{profile.name}</h3>
                    <span>{profile.title}</span>
                  </div>
                </div>
                <div className="profile-form">
                  <input
                    value={profile.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    placeholder="Full name"
                  />
                  <input
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    placeholder="Email"
                  />
                  <input
                    value={profile.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    placeholder="Phone"
                  />
                  <input
                    value={profile.location}
                    onChange={(e) => handleProfileChange('location', e.target.value)}
                    placeholder="Location"
                  />
                  <input
                    value={profile.experience}
                    onChange={(e) => handleProfileChange('experience', e.target.value)}
                    placeholder="Experience"
                  />
                  <textarea
                    value={profile.summary}
                    onChange={(e) => handleProfileChange('summary', e.target.value)}
                    rows="4"
                  />
                  <div className="skill-tags profile-skill-tags">
                    {profile.skills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                  <label className="upload-box">
                    <span>Upload resume</span>
                    <input type="file" onChange={handleResumeChange} />
                  </label>
                  <p className="resume-label">Current file: {resumeName}</p>
                </div>
              </section>

              <section className="suggestion-panel">
                <h3>Recommended jobs</h3>
                <div className="suggestion-list">
                  {suggestedJobs.map((job) => (
                    <div key={job.id}>
                      <strong>{job.title}</strong>
                      <p>{job.company} • {job.location}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="suggestion-panel">
                <h3>Suggested internships</h3>
                <div className="suggestion-list">
                  {suggestedInternships.map((job) => (
                    <div key={job.id}>
                      <strong>{job.title}</strong>
                      <p>{job.company} • {job.location}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
