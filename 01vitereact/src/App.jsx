import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const USER_KEY = 'hirepulse-user'
const PROFILE_KEY = 'hirepulse-profile'

const authStyle = {
  background: 'linear-gradient(135deg, #0f172a, #1d4ed8)',
  color: '#fff'
}

const defaultProfile = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@email.com',
  phone: '+91 98765 43210',
  title: 'Frontend Developer',
  location: 'Bengaluru',
  experience: '2+ years',
  summary:
    'Design-focused frontend developer who enjoys building clean, accessible web experiences for Indian startups and enterprises.',
  skills: ['React', 'JavaScript', 'CSS', 'UI Design']
}

function App() {
  const [jobs, setJobs] = useState([])
  const [matchedJobs, setMatchedJobs] = useState([])
  const [profile, setProfile] = useState(defaultProfile)
  const [resumeName, setResumeName] = useState('resume.pdf')
  const [resumeContent, setResumeContent] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedLocation, setSelectedLocation] = useState('All')
  const [selectedSkill, setSelectedSkill] = useState('All')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('jobs')
  const [authMode, setAuthMode] = useState('login')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('hirepulse-theme') || 'light')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi! I can help you improve your resume, understand ATS scores, and suggest jobs that fit your profile.'
    }
  ])
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
    const savedUser = localStorage.getItem(USER_KEY)
    const savedProfile = localStorage.getItem(PROFILE_KEY)

    if (savedUser) {
      setUser(JSON.parse(savedUser))
      setIsAuthenticated(true)
    }

    if (savedProfile) {
      setProfile(JSON.parse(savedProfile))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('hirepulse-theme', theme)
  }, [theme])

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
        console.warn('Falling back to sample data:', error)
        setJobs([
          {
            id: 1,
            title: 'Frontend Developer',
            company: 'PulseTech',
            type: 'Full-time',
            location: 'Bengaluru',
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
          }
        ])
      }
    }

    loadJobs()
  }, [])

  const saveProfileToServer = async (nextProfile = profile, nextResumeName = resumeName, nextResumeContent = resumeContent) => {
    if (!user) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          profile: nextProfile,
          resumeName: nextResumeName,
          resumeContent: nextResumeContent
        })
      })

      if (!response.ok) {
        throw new Error('Profile save failed')
      }

      const matchResponse = await fetch(`${API_URL}/api/jobs/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: nextProfile,
          resumeContent: nextResumeContent
        })
      })

      if (!matchResponse.ok) {
        throw new Error('Matching failed')
      }

      const matchData = await matchResponse.json()
      setMatchedJobs(matchData.jobs || [])
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return
    }

    const sync = async () => {
      await saveProfileToServer()
    }

    sync()
  }, [isAuthenticated, user, profile, resumeContent, resumeName])

  const uniqueSkills = useMemo(
    () => Array.from(new Set(jobs.flatMap((job) => job.skills || []))).sort(),
    [jobs]
  )

  const uniqueLocations = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.location))).sort(),
    [jobs]
  )

  const atsAnalysis = useMemo(() => {
    const text = `${resumeContent} ${profile.summary} ${profile.skills.join(' ')}`.toLowerCase()
    let score = 58
    const recommendations = []

    if (profile.name && profile.email && profile.phone) {
      score += 8
    }

    if (profile.summary && profile.summary.length > 80) {
      score += 10
    } else {
      recommendations.push('Add a stronger summary that highlights your key achievements.')
    }

    if (profile.skills.length >= 4) {
      score += 10
    } else {
      recommendations.push('Add more relevant skills to match job requirements.')
    }

    if (resumeContent && resumeContent.length > 300) {
      score += 10
    } else {
      recommendations.push('Expand your resume with more experience details and results.')
    }

    const keywords = [
      'react', 'javascript', 'python', 'sql', 'node', 'css', 'figma', 'ui design',
      'api', 'mongodb', 'redux', 'typescript', 'excel', 'machine learning'
    ]

    const matchedKeywords = keywords.filter((keyword) => text.includes(keyword))
    score += Math.min(12, matchedKeywords.length * 2)

    if (!/\b(education|experience|skills|projects|summary)\b/i.test(resumeContent || '')) {
      recommendations.push('Organize your resume with clear sections like Skills, Experience, and Projects.')
    }

    if (!/\b(\d{10}|\+91|\+1|\+44)\b/.test(profile.phone || '')) {
      recommendations.push('Include a valid phone number for recruiters to contact you.')
    }

    if (profile.title && profile.title.length > 3) {
      score += 2
    }

    const finalScore = Math.min(98, Math.max(45, Math.round(score)))
    return {
      score: finalScore,
      recommendations: recommendations.slice(0, 5)
    }
  }, [profile, resumeContent])

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
        (job.skills || []).some((skill) => skill.toLowerCase().includes(term))

      const matchesType = selectedType === 'All' || job.type === selectedType
      const matchesLocation =
        selectedLocation === 'All' || job.location === selectedLocation
      const matchesSkill =
        selectedSkill === 'All' || (job.skills || []).includes(selectedSkill)

      return matchesSearch && matchesType && matchesLocation && matchesSkill
    })
  }, [activeTab, jobs, searchTerm, selectedType, selectedLocation, selectedSkill])

  const suggestedJobs = useMemo(() => {
    return matchedJobs.filter((job) => job.type !== 'Internship').slice(0, 4)
  }, [matchedJobs])

  const suggestedInternships = useMemo(() => {
    return matchedJobs.filter((job) => job.type === 'Internship').slice(0, 3)
  }, [matchedJobs])

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleSendChat = (event) => {
    event.preventDefault()
    const question = chatInput.trim()
    if (!question) {
      return
    }

    const lowerQuestion = question.toLowerCase()
    const skillText = profile.skills.slice(0, 5).join(', ')
    const roleText = profile.title || 'your target role'

    let answer = `Based on your profile, I recommend focusing on ${roleText} with skills like ${skillText}. For a stronger resume, highlight achievements, metrics, and keywords from job descriptions.`

    if (lowerQuestion.includes('ats') || lowerQuestion.includes('score')) {
      answer = `Your ATS score is about ${atsAnalysis.score}%. The biggest boosts will come from adding relevant keywords, clearer section headings, and measurable results that match the job description.`
    } else if (lowerQuestion.includes('resume') || lowerQuestion.includes('improve') || lowerQuestion.includes('rewrite')) {
      answer = `To improve your resume, start with a strong summary, add 3–5 key skills, and describe impact with numbers. For example, instead of saying “worked on projects,” say “built 3 React dashboards that improved onboarding speed.”`
    } else if (lowerQuestion.includes('job') || lowerQuestion.includes('role') || lowerQuestion.includes('match')) {
      answer = `Your profile looks best for roles related to ${roleText}. The most relevant skills right now are ${skillText}, so tailor your resume to match those keywords.`
    } else if (lowerQuestion.includes('interview') || lowerQuestion.includes('prepare')) {
      answer = 'Use the STAR method for answers, prepare examples for leadership, conflict resolution, and problem-solving, and practice explaining your impact clearly.'
    } else if (lowerQuestion.includes('skills') || lowerQuestion.includes('learn') || lowerQuestion.includes('upgrade')) {
      answer = `Good skills to add next are SQL, API development, communication, and project ownership. If you already know some of them, mention them in your resume with examples.`
    } else if (lowerQuestion.includes('summary') || lowerQuestion.includes('objective')) {
      answer = `A strong summary for you could be: “${profile.title || 'Professional'} with experience in ${skillText}. Skilled at building user-friendly solutions, improving workflows, and delivering measurable results.”`
    } else if (lowerQuestion.includes('cover letter') || lowerQuestion.includes('letter')) {
      answer = 'For a cover letter, open with why you are interested in the role, mention 1–2 relevant achievements, and close by explaining how you can contribute to the company.'
    }

    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: question },
      { sender: 'bot', text: answer }
    ])
    setChatInput('')
  }

  const handleResumeChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const nextContent = await file.text()
      setResumeName(file.name)
      setResumeContent(nextContent)
      setMessage(`Resume uploaded: ${file.name}`)
    } catch (error) {
      setResumeName(file.name)
      setResumeContent('')
      setMessage(`Resume selected: ${file.name}`)
    }
  }

  const handleApply = async (job) => {
    if (!user) {
      setMessage('Please log in before applying.')
      return
    }

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
          resumeName,
          applicantId: user.id
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

  const handleAuthSubmit = async (event) => {
    event.preventDefault()

    if (authMode === 'signup' && authForm.password !== authForm.confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    if (!authForm.email || !authForm.password || (authMode === 'signup' && !authForm.name)) {
      setMessage('Please fill in all required fields.')
      return
    }

    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          authMode === 'signup'
            ? {
                name: authForm.name,
                email: authForm.email,
                password: authForm.password
              }
            : {
                email: authForm.email,
                password: authForm.password
              }
        )
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Auth failed')
      }

      const nextUser = data
      setUser(nextUser)
      setIsAuthenticated(true)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      if (authMode === 'signup') {
        const nextProfile = {
          ...defaultProfile,
          name: nextUser.name,
          email: nextUser.email
        }
        setProfile(nextProfile)
        localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile))
      } else {
        const storedProfile = localStorage.getItem(PROFILE_KEY)
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile))
        }
      }
      setMessage(
        authMode === 'signup'
          ? 'Account created successfully.'
          : 'Welcome back!'
      )
    } catch (error) {
      console.error(error)
      setMessage(error.message || 'Unable to complete authentication.')
    }
  }

  const handleSaveProfile = async () => {
    const updatedProfile = {
      ...profile,
      email: user?.email || profile.email
    }

    setProfile(updatedProfile)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile))
    const success = await saveProfileToServer(updatedProfile)

    if (success) {
      setMessage('Profile saved and resume matches updated.')
    } else {
      setMessage('Profile saved locally, but matching update failed.')
    }
  }

  const appThemeClass = theme === 'dark' ? 'app-shell theme-dark' : 'app-shell theme-light'

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
          {message && <div className="notice-banner">{message}</div>}
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
            <button
              type="button"
              onClick={() => {
                setMessage('')
                setAuthMode(authMode === 'login' ? 'signup' : 'login')
              }}
            >
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={appThemeClass}>
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
        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button className="chat-trigger" onClick={() => setIsChatOpen((prev) => !prev)}>
            AI Resume Coach
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Matches for you</p>
            <h1>Discover jobs and internships that fit your goals</h1>
          </div>
          <div className="hero-right">
            <div className="match-pill">{matchedJobs.length} matched roles</div>
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
                        ? 'Resume-matched jobs'
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
                  <div className="profile-avatar">{profile.name.split(' ').map((item) => item[0]).join('').slice(0, 2)}</div>
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
                  <input
                    value={profile.title}
                    onChange={(e) => handleProfileChange('title', e.target.value)}
                    placeholder="Professional title"
                  />
                  <textarea
                    value={profile.summary}
                    onChange={(e) => handleProfileChange('summary', e.target.value)}
                    rows="4"
                    placeholder="Professional summary"
                  />
                  <input
                    value={profile.skills.join(', ')}
                    onChange={(e) =>
                      handleProfileChange(
                        'skills',
                        e.target.value
                          .split(',')
                          .map((skill) => skill.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="Skills (comma separated)"
                  />
                  <label className="upload-box">
                    <span>Upload resume / CV</span>
                    <input type="file" onChange={handleResumeChange} />
                  </label>
                  <p className="resume-label">Current file: {resumeName}</p>
                  <button className="apply-btn" onClick={handleSaveProfile}>
                    Save Profile
                  </button>
                </div>
              </section>

              <section className="ats-panel">
                <div className="ats-header">
                  <div>
                    <p className="section-label">ATS insight</p>
                    <h3>Resume score</h3>
                  </div>
                  <span className="ats-score">{atsAnalysis.score}%</span>
                </div>
                <div className="score-bar">
                  <span style={{ width: `${atsAnalysis.score}%` }} />
                </div>
                <ul className="recommendation-list">
                  {atsAnalysis.recommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
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

      {isChatOpen && (
        <section className="chatbot-panel">
          <div className="chatbot-header">
            <div>
              <p className="section-label">AI assistant</p>
              <h3>Resume Coach</h3>
            </div>
            <button onClick={() => setIsChatOpen(false)}>×</button>
          </div>
          <div className="chatbot-messages">
            {chatMessages.map((entry, index) => (
              <div key={`${entry.sender}-${index}`} className={`chat-bubble ${entry.sender}`}>
                {entry.text}
              </div>
            ))}
          </div>
          <form className="chatbot-form" onSubmit={handleSendChat}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about ATS, resume, or jobs"
            />
            <button type="submit">Send</button>
          </form>
        </section>
      )}
    </div>
  )
}

export default App
