const { getDb } = require('./db');

function seedDatabase() {
  const db = getDb();
  console.log('🌱 Seeding Aparaitech Email Blast Database...');

  // 1. Seed Sample Placement Templates
  const templates = [
    {
      name: 'Campus Placement Drive 2026 - Software Engineer',
      category: 'Placement Drive',
      subject: 'Aparaitech Software Placement Drive 2026 - Invitation for {Name} from {College}',
      tags_used: JSON.stringify(['{Name}', '{College}', '{Branch}', '{Drive_Date}', '{Package}', '{Job_Role}', '{Company}']),
      body_html: `
<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">APARAITECH SOFTWARE</h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #93c5fd; text-transform: uppercase; letter-spacing: 1px;">Building Intelligent AI Solutions for Tomorrow</p>
  </div>
  
  <div style="padding: 32px 28px;">
    <p style="font-size: 16px; margin-top: 0;">Dear <strong>{Name}</strong>,</p>
    
    <p>We are delighted to invite you from <strong>{College}</strong> ({Branch}, Batch of {Batch}) to participate in the upcoming <strong>Aparaitech Software Campus Placement & Talent Drive 2026</strong>.</p>
    
    <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 18px 20px; margin: 24px 0; border-radius: 6px;">
      <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Key Drive Highlights:</h3>
      <ul style="margin: 0; padding-left: 18px; font-size: 14px; color: #334155;">
        <li style="margin-bottom: 6px;"><strong>Role:</strong> {Job_Role}</li>
        <li style="margin-bottom: 6px;"><strong>Eligibility:</strong> B.E. / B.Tech / M.Tech / MCA ({Batch} Batch)</li>
        <li style="margin-bottom: 6px;"><strong>Compensation:</strong> {Package}</li>
        <li style="margin-bottom: 6px;"><strong>Drive Date & Time:</strong> {Drive_Date} at 10:00 AM IST</li>
        <li><strong>Location:</strong> Bengaluru & Pune / Baramati Tech Centers (Hybrid Options Available)</li>
      </ul>
    </div>

    <h4 style="margin: 20px 0 10px 0; font-size: 15px; color: #0f172a;">Recruitment Selection Process:</h4>
    <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569;">
      <li style="margin-bottom: 6px;">Online Cognitive & Coding Assessment (DSA, Problem Solving, AI fundamentals)</li>
      <li style="margin-bottom: 6px;">Technical Architecture & System Design Discussion</li>
      <li style="margin-bottom: 6px;">Leadership & Culture Fitment Interview</li>
    </ol>
    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="{ApplyLink}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">Apply Now & Confirm Registration &rarr;</a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">If you have any queries regarding the schedule or eligibility, please reach out to your Training & Placement Officer (TPO) or write directly to <a href="mailto:recruitment@aparaitech.org" style="color: #2563eb;">recruitment@aparaitech.org</a>.</p>
  </div>

  <div style="background: #f1f5f9; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0 0 4px 0;"><strong>Aparaitech Software Pvt. Ltd.</strong></p>
    <p style="margin: 0 0 4px 0;">360 Neeladri Rd, Electronic City, Bengaluru | Mukti Complex, Baramati, Pune</p>
    <p style="margin: 0;"><a href="https://aparaitech.org" style="color: #64748b; text-decoration: underline;">www.aparaitech.org</a> | Confidential Recruitment Communication</p>
  </div>
</div>
`
    },
    {
      name: 'Off-Campus Coding Assessment & Aptitude Round',
      category: 'Placement Drive',
      subject: 'Aparaitech National Tech Assessment: Online Coding Test Link for {Name}',
      tags_used: JSON.stringify(['{Name}', '{College}', '{Drive_Date}', '{Job_Role}', '{ApplyLink}']),
      body_html: `
<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff;">
    <h2 style="margin: 0; font-size: 22px;">APARAITECH ONLINE ASSESSMENT</h2>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #38bdf8;">Round 1: DSA, Core CS Concepts & Algorithmic Problem Solving</p>
  </div>
  <div style="padding: 28px;">
    <p>Hello <strong>{Name}</strong>,</p>
    <p>Thank you for submitting your candidature from <strong>{College}</strong> for the position of <strong>{Job_Role}</strong> at Aparaitech Software.</p>
    <p>Your online test slot has been scheduled as follows:</p>
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Test Date:</strong> {Drive_Date}</p>
      <p style="margin: 0 0 8px 0;"><strong>Test Window:</strong> 11:00 AM - 08:00 PM IST</p>
      <p style="margin: 0 0 8px 0;"><strong>Test Duration:</strong> 90 Minutes</p>
      <p style="margin: 0;"><strong>Candidate Registered Email:</strong> {Email}</p>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{ApplyLink}" style="display: inline-block; background: #059669; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 6px;">Launch Test Environment &rarr;</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">Please ensure you are using a desktop or laptop with a working webcam, microphone, and a stable broadband internet connection.</p>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    &copy; 2026 Aparaitech Software. All rights reserved.
  </div>
</div>`
    },
    {
      name: 'Summer AI & Cloud Internship Program 2025/2026',
      category: 'Internship',
      subject: 'Exciting Summer Internship Opportunity at Aparaitech Software - Apply Now, {Name}!',
      tags_used: JSON.stringify(['{Name}', '{College}', '{Branch}', '{Company}', '{ApplyLink}']),
      body_html: `
<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 24px; font-weight: 700;">APARAITECH INTERNSHIP PROGRAM</h2>
    <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Hands-on Industry Experience in Generative AI & Cloud Systems</p>
  </div>
  <div style="padding: 28px;">
    <p>Hi <strong>{Name}</strong>,</p>
    <p>Aparaitech Software is expanding its AI engineering & cloud solutions team and is offering high-impact <strong>Summer Internships</strong> with potential Pre-Placement Offers (PPO) for exceptional students from <strong>{College}</strong>.</p>
    
    <div style="background: #fdf4ff; border-left: 4px solid #a855f7; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <h4 style="margin: 0 0 8px 0; color: #7e22ce;">Internship Tracks:</h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563;">
        <li>Generative AI & LLM Application Engineering</li>
        <li>Full-Stack Cloud Systems (Node.js / React / Python)</li>
        <li>Data Engineering & Analytics Pipelines</li>
        <li>Cybersecurity & Distributed Infrastructure</li>
      </ul>
    </div>
    
    <p><strong>Stipend:</strong> ₹25,000 - ₹40,000 / month + Mentorship from Principal Engineers</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{ApplyLink}" style="background: #7c3aed; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Submit Internship Application &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    Aparaitech Software Careers &bull; Baramati &amp; Bengaluru
  </div>
</div>`
    },
    {
      name: 'Technical Interview Shortlist Notification',
      category: 'Interview',
      subject: 'Congratulations {Name}! Shortlisted for Technical Interview Round at Aparaitech',
      tags_used: JSON.stringify(['{Name}', '{College}', '{Job_Role}', '{Drive_Date}', '{ApplyLink}']),
      body_html: `
<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: #065f46; padding: 26px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 22px;">TECHNICAL INTERVIEW SHORTLIST</h2>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0;">Aparaitech Software Recruitment 2026</p>
  </div>
  <div style="padding: 28px;">
    <p>Dear <strong>{Name}</strong>,</p>
    <p>Congratulations! Based on your stellar performance in the recent online coding assessment, we are thrilled to inform you that you have been shortlisted for the <strong>Technical Interview Round</strong> for the role of <strong>{Job_Role}</strong>.</p>
    
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0;"><strong>Student Name:</strong> {Name}</p>
      <p style="margin: 0 0 6px 0;"><strong>Institution:</strong> {College}</p>
      <p style="margin: 0 0 6px 0;"><strong>Interview Date:</strong> {Drive_Date}</p>
      <p style="margin: 0;"><strong>Platform:</strong> Google Meet (Link will be sent 2 hours prior)</p>
    </div>

    <p>Please be prepared to walk through your previous projects, discuss algorithms, and live-code in your language of choice.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{ApplyLink}" style="background: #059669; color: white; padding: 12px 26px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Confirm Interview Slot Availability &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
    Aparaitech Software Recruitment Team &bull; Bengaluru / Pune
  </div>
</div>`
    },
    {
      name: 'National Coding Challenge & Hackathon Announcement',
      category: 'Hackathon',
      subject: 'Aparaitech AI Hackathon 2026: Compete, Innovate & Win ₹2,50,000 + PPO Offers, {Name}!',
      tags_used: JSON.stringify(['{Name}', '{College}', '{Company}', '{ApplyLink}']),
      body_html: `
<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #18181b 0%, #3f3f46 100%); padding: 30px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #38bdf8;">APARAITECH CODE QUEST 2026</h2>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #e4e4e7;">National Collegiate Hackathon & AI Sprint</p>
  </div>
  <div style="padding: 28px;">
    <p>Greetings <strong>{Name}</strong>,</p>
    <p>Calling top tech talent from <strong>{College}</strong>! Aparaitech Software is hosting <strong>Code Quest 2026</strong> &mdash; an intense 36-hour hackathon to build intelligent AI applications tackling real-world problems in enterprise tech, cloud infrastructure, and fintech.</p>
    <ul style="color: #334155; font-size: 14px;">
      <li><strong>Cash Prizes:</strong> 1st Prize ₹1,50,000 | 2nd Prize ₹75,000 | 3rd Prize ₹25,000</li>
      <li><strong>Pre-Placement Offers (PPOs):</strong> Direct fast-track hiring for all top 10 finalists</li>
      <li><strong>Mentorship:</strong> 1-on-1 guidance from Silicon Valley & Indian tech leaders</li>
    </ul>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{ApplyLink}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Register Your Team &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    Aparaitech Software AI Labs &bull; www.aparaitech.org
  </div>
</div>`
    },
    {
      name: 'Official Job Offer & Onboarding Instructions',
      category: 'Offer',
      subject: 'Offer Letter: Welcome to Aparaitech Software, {Name}!',
      tags_used: JSON.stringify(['{Name}', '{College}', '{Job_Role}', '{Package}', '{ApplyLink}']),
      body_html: `
<div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #0a192f 0%, #1e40af 100%); padding: 32px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 24px; font-weight: 700;">WELCOME TO THE TEAM!</h2>
    <p style="margin: 6px 0 0 0; font-size: 14px; color: #bfdbfe;">Aparaitech Software Employment Offer</p>
  </div>
  <div style="padding: 28px;">
    <p>Dear <strong>{Name}</strong>,</p>
    <p>On behalf of the leadership team at <strong>Aparaitech Software</strong>, we are thrilled to formally extend an offer of employment to you for the position of <strong>{Job_Role}</strong> following your outstanding performance throughout our recruitment drive at <strong>{College}</strong>.</p>
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0;"><strong>Designation:</strong> {Job_Role}</p>
      <p style="margin: 0 0 6px 0;"><strong>Annual Compensation:</strong> {Package}</p>
      <p style="margin: 0 0 6px 0;"><strong>Joining Date:</strong> {Drive_Date}</p>
      <p style="margin: 0;"><strong>Location:</strong> Bengaluru / Pune / Baramati Tech Centers</p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{ApplyLink}" style="background: #059669; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Accept Offer &amp; Start Digital Onboarding &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    Aparaitech Software HR Operations &bull; careers@aparaitech.org
  </div>
</div>`
    }
  ];

  const checkTemplate = db.prepare('SELECT count(*) as count FROM templates').get();
  if (checkTemplate.count === 0) {
    const insertTemplate = db.prepare(`
      INSERT INTO templates (name, category, subject, body_html, tags_used)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertTemplatesTx = db.transaction(() => {
      templates.forEach(t => {
        insertTemplate.run(t.name, t.category, t.subject, t.body_html, t.tags_used);
      });
    });
    insertTemplatesTx();
    console.log(`✅ Seeded ${templates.length} recruitment email templates.`);
  }

  // 2. Seed 50+ Realistic Students from diverse colleges
  const students = [
    { name: 'Rahul Sharma', email: 'rahul.sharma@iitb.ac.in', college: 'IIT Bombay', phone: '+91 9820123456', branch: 'Computer Science & Engineering', batch: '2026', tags: '["IIT", "B.Tech", "Shortlisted"]' },
    { name: 'Pooja Patel', email: 'pooja.patel@vjti.ac.in', college: 'VJTI Mumbai', phone: '+91 9820123457', branch: 'Information Technology', batch: '2026', tags: '["VJTI", "B.Tech", "Top 5%"]' },
    { name: 'Aditya Kulkarni', email: 'aditya.k@coep.ac.in', college: 'COEP Tech Pune', phone: '+91 9820123458', branch: 'Computer Engineering', batch: '2025', tags: '["COEP", "B.Tech"]' },
    { name: 'Ananya Deshmukh', email: 'ananya.d@mitwpu.edu.in', college: 'MIT-WPU Pune', phone: '+91 9820123459', branch: 'AI & Data Science', batch: '2026', tags: '["AI Track", "Python"]' },
    { name: 'Rohan Shinde', email: 'rohan.shinde@vpkbiet.org', college: 'VPKBIET Baramati', phone: '+91 9820123460', branch: 'Computer Engineering', batch: '2026', tags: '["Baramati Campus", "Fullstack"]' },
    { name: 'Sneha Jadhav', email: 'sneha.jadhav@vpkbiet.org', college: 'VPKBIET Baramati', phone: '+91 9820123461', branch: 'Information Technology', batch: '2026', tags: '["Baramati Campus", "React"]' },
    { name: 'Vikram Joshi', email: 'vikram.joshi@pict.edu', college: 'PICT Pune', phone: '+91 9820123462', branch: 'Computer Engineering', batch: '2026', tags: '["PICT", "Competitive Coder"]' },
    { name: 'Priya Iyer', email: 'priya.iyer@bits-pilani.ac.in', college: 'BITS Pilani', phone: '+91 9820123463', branch: 'Computer Science', batch: '2026', tags: '["BITS", "Machine Learning"]' },
    { name: 'Siddharth Nair', email: 'siddharth.nair@iitd.ac.in', college: 'IIT Delhi', phone: '+91 9820123464', branch: 'Electrical Engineering', batch: '2025', tags: '["IIT", "Cloud Architect"]' },
    { name: 'Neha Verma', email: 'neha.verma@dtu.ac.in', college: 'DTU Delhi', phone: '+91 9820123465', branch: 'Information Technology', batch: '2026', tags: '["DTU", "Node.js"]' },
    { name: 'Kunal Shah', email: 'kunal.shah@spit.ac.in', college: 'SPIT Mumbai', phone: '+91 9820123466', branch: 'Computer Engineering', batch: '2026', tags: '["SPIT", "Cybersecurity"]' },
    { name: 'Tanvi Gaikwad', email: 'tanvi.g@coep.ac.in', college: 'COEP Tech Pune', phone: '+91 9820123467', branch: 'Data Science', batch: '2026', tags: '["COEP", "Data Science"]' },
    { name: 'Manish Kumar', email: 'manish.k@vit.ac.in', college: 'VIT Vellore', phone: '+91 9820123468', branch: 'Computer Science', batch: '2025', tags: '["VIT", "Java"]' },
    { name: 'Swati Rane', email: 'swati.rane@vpkbiet.org', college: 'VPKBIET Baramati', phone: '+91 9820123469', branch: 'AI & Data Science', batch: '2026', tags: '["Baramati Campus", "GenAI"]' },
    { name: 'Arjun Rao', email: 'arjun.rao@rvce.edu.in', college: 'RVCE Bengaluru', phone: '+91 9820123470', branch: 'Computer Science', batch: '2026', tags: '["RVCE", "Bengaluru Pool"]' },
    { name: 'Divya Menon', email: 'divya.menon@pes.edu', college: 'PES University Bengaluru', phone: '+91 9820123471', branch: 'Computer Science & AI', batch: '2026', tags: '["PES", "Bengaluru Pool"]' },
    { name: 'Gaurav Patil', email: 'gaurav.p@pccoepune.org', college: 'PCCOE Pune', phone: '+91 9820123472', branch: 'Computer Engineering', batch: '2026', tags: '["PCCOE", "Web Development"]' },
    { name: 'Meera Chawla', email: 'meera.c@iiitb.ac.in', college: 'IIIT Bangalore', phone: '+91 9820123473', branch: 'M.Tech CSE', batch: '2025', tags: '["IIIT", "M.Tech", "Systems"]' },
    { name: 'Akash Sawant', email: 'akash.sawant@vpkbiet.org', college: 'VPKBIET Baramati', phone: '+91 9820123474', branch: 'Computer Engineering', batch: '2026', tags: '["Baramati Campus", "DevOps"]' },
    { name: 'Aishwarya Pawar', email: 'aishwarya.p@vjti.ac.in', college: 'VJTI Mumbai', phone: '+91 9820123475', branch: 'Computer Science', batch: '2026', tags: '["VJTI", "Algorithms"]' },
    { name: 'Varun Reddy', email: 'varun.reddy@iitm.ac.in', college: 'IIT Madras', phone: '+91 9820123476', branch: 'Computer Science', batch: '2026', tags: '["IIT", "High CGPA"]' },
    { name: 'Shruti Kadam', email: 'shruti.kadam@mitwpu.edu.in', college: 'MIT-WPU Pune', phone: '+91 9820123477', branch: 'Computer Science', batch: '2026', tags: '["MIT-WPU"]' },
    { name: 'Abhishek Pandey', email: 'abhishek.p@srmist.edu.in', college: 'SRM Chennai', phone: '+91 9820123478', branch: 'Software Engineering', batch: '2025', tags: '["SRM", "Backend"]' },
    { name: 'Kavita Hegde', email: 'kavita.h@bmsce.ac.in', college: 'BMSCE Bengaluru', phone: '+91 9820123479', branch: 'Information Science', batch: '2026', tags: '["BMSCE", "Bengaluru"]' },
    { name: 'Nikhil More', email: 'nikhil.more@vpkbiet.org', college: 'VPKBIET Baramati', phone: '+91 9820123480', branch: 'Civil / IT Bridge', batch: '2026', tags: '["Baramati Campus"]' },
    { name: 'Ritika Gupta', email: 'ritika.g@thapar.edu', college: 'Thapar University', phone: '+91 9820123481', branch: 'Computer Science', batch: '2026', tags: '["Thapar"]' },
    { name: 'Karthik Raja', email: 'karthik.r@nitt.edu', college: 'NIT Trichy', phone: '+91 9820123482', branch: 'Computer Science', batch: '2026', tags: '["NIT", "DSA"]' },
    { name: 'Pallavi Bhosale', email: 'pallavi.b@coep.ac.in', college: 'COEP Tech Pune', phone: '+91 9820123483', branch: 'Computer Engineering', batch: '2026', tags: '["COEP"]' },
    { name: 'Sameer Khan', email: 'sameer.k@amity.edu', college: 'Amity University', phone: '+91 9820123484', branch: 'B.Tech IT', batch: '2025', tags: '["Amity"]' },
    { name: 'Pranali Mane', email: 'pranali.m@vpkbiet.org', college: 'VPKBIET Baramati', phone: '+91 9820123485', branch: 'Computer Engineering', batch: '2026', tags: '["Baramati Campus", "Frontend"]' },
    { name: 'Tushar Agarwal', email: 'tushar.a@vit.ac.in', college: 'VIT Vellore', phone: '+91 9820123486', branch: 'Information Security', batch: '2026', tags: '["VIT"]' },
    { name: 'Rashmi Deshpande', email: 'rashmi.d@pict.edu', college: 'PICT Pune', phone: '+91 9820123487', branch: 'Information Technology', batch: '2026', tags: '["PICT"]' },
    { name: 'Yashwardhan Singh', email: 'yash.singh@manipal.edu', college: 'Manipal Tech Institute', phone: '+91 9820123488', branch: 'Computer Science', batch: '2026', tags: '["Manipal"]' },
    { name: 'Deepika Soni', email: 'deepika.s@msrit.edu', college: 'MSRIT Bengaluru', phone: '+91 9820123489', branch: 'Computer Science', batch: '2026', tags: '["MSRIT", "Bengaluru"]' },
    { name: 'Omkar Gholap', email: 'omkar.g@vpkbiet.org', college: 'VPKBIET Baramati', phone: '+91 9820123490', branch: 'Computer Engineering', batch: '2026', tags: '["Baramati Campus"]' },
    { name: 'Simran Walia', email: 'simran.w@dtu.ac.in', college: 'DTU Delhi', phone: '+91 9820123491', branch: 'Computer Engineering', batch: '2026', tags: '["DTU"]' },
    { name: 'Tejas Salunkhe', email: 'tejas.s@vjti.ac.in', college: 'VJTI Mumbai', phone: '+91 9820123492', branch: 'Electrical & CS', batch: '2026', tags: '["VJTI"]' },
    { name: 'Bhavna Murthy', email: 'bhavna.m@nitk.edu.in', college: 'NIT Surathkal', phone: '+91 9820123493', branch: 'Information Technology', batch: '2026', tags: '["NIT"]' },
    { name: 'Chaitanya Joshi', email: 'chaitanya.j@coep.ac.in', college: 'COEP Tech Pune', phone: '+91 9820123494', branch: 'Computer Engineering', batch: '2026', tags: '["COEP"]' },
    { name: 'Payal Jagtap', email: 'payal.jagtap@vpkbiet.org', college: 'VPKBIET Baramati', phone: '+91 9820123495', branch: 'Computer Engineering', batch: '2026', tags: '["Baramati Campus"]' }
  ];

  const checkStudent = db.prepare('SELECT count(*) as count FROM students').get();
  if (checkStudent.count === 0) {
    const insertStudent = db.prepare(`
      INSERT INTO students (name, email, college, phone, branch, batch, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertStudentsTx = db.transaction(() => {
      students.forEach(s => {
        insertStudent.run(s.name, s.email, s.college, s.phone, s.branch, s.batch, s.tags);
      });
    });
    insertStudentsTx();
    console.log(`✅ Seeded ${students.length} diverse college students into database.`);
  }

  // 3. Create a sample initial past campaign with delivery stats
  const checkCampaigns = db.prepare('SELECT count(*) as count FROM campaigns').get();
  if (checkCampaigns.count === 0) {
    const sampleStudents = db.prepare('SELECT * FROM students LIMIT 15').all();
    const campStmt = db.prepare(`
      INSERT INTO campaigns (title, subject, body_html, target_type, total_recipients, sent_count, success_count, failed_count, status, speed_eps, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', 3.8, datetime('now', '-2 days'), datetime('now', '-2 days', '+15 seconds'))
    `);

    const sampleCamp = campStmt.run(
      'Aparaitech Early Career Outreach - Maharashtra & Karnataka Tier-1 Colleges',
      'Campus Placement & Career Opportunity at Aparaitech Software for {Name}',
      templates[0].body_html,
      'all',
      sampleStudents.length,
      sampleStudents.length,
      sampleStudents.length - 1,
      1
    );

    const campId = sampleCamp.lastInsertRowid;
    const recipStmt = db.prepare(`
      INSERT INTO campaign_recipients (campaign_id, student_id, recipient_name, recipient_email, recipient_college, recipient_phone, status, latency_ms, error_message, sent_at, attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), 1)
    `);

    sampleStudents.forEach((student, index) => {
      const isFailed = (index === 4); // Fail one for demonstration
      const status = isFailed ? 'failed' : 'sent';
      const errorMsg = isFailed ? '550 5.1.1 Mailbox storage quota exceeded' : '';
      const latency = Math.floor(Math.random() * 80) + 110;

      recipStmt.run(campId, student.id, student.name, student.email, student.college, student.phone, status, latency, errorMsg);

    });

    console.log(`✅ Seeded sample past campaign with ${sampleStudents.length} recipients.`);
  }

  console.log('✨ Database seeding successfully finished!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
