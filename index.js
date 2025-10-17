import dayjs from 'dayjs';
import dotenv from 'dotenv';
import express from 'express';
import isEmail from 'validator/lib/isEmail.js';
import multer from "multer";
import path from "path";
import session from 'express-session';
import { Pool } from 'pg';
import { unlink } from 'fs';
import { existsSync, mkdirSync } from "fs";

// Initialize express app
const app = express();

// Initialize port
const port = 3000;

// Set environment configuration
dotenv.config();

// Set dayjs locale
dayjs.locale('en');

// Instantiate connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  max: process.env.DB_MAX
})

// Work experience image local path
const workImagePath = './assets/uploads/work_images';

// Project image local path
const projectImagePath = './assets/uploads/project_images';

// Work experience image storage initiliaze
const workImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!existsSync(workImagePath)) {
      mkdirSync(workImagePath, { recursive: true });
    }
    
    cb(null, workImagePath);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Project image storage initiliaze
const projectImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!existsSync(projectImagePath)) {
      mkdirSync(projectImagePath, { recursive: true });
    }
    
    cb(null, projectImagePath);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Work experience image upload config
const workImageUpload = multer({ storage: workImageStorage });

// Project image upload config
const projectImageUpload = multer({ storage: projectImageStorage });

// Set hbs view engine
app.set('view engine', 'hbs');

// Use static files in assets directory
app.use(express.static('assets'));

// Encode request body content (body-parser)
app.use(express.urlencoded({ extended: false }));

// Create session
app.use(session({ 
  secret: 'secretKey', 
  resave: false, 
  saveUninitialized: true, 
  cookie: { secure: false, maxAge: 3600000 } 
}));

// Route to Home Page
app.get('/', getHomePage);

// Route to Login Page
app.get('/login', getLoginPage);

// Route for logging admin account in
app.post('/login-admin', loginAdmin);

// Route for logging admin account out
app.get('/logout-admin', logoutAdmin);

// Route to Work Experience Detail Page for adding
app.get('/add-work-experience', getAddWorkExperiencePage);

// Route for adding new work experience
app.post('/add-new-work', workImageUpload.single('companyLogo'), addNewWorkExperience);

// Route for deleting work experience
app.post('/delete-work/:id', deleteWorkExperience);

// Route to Project Detail Page for adding
app.get('/add-project', getAddProjectPage);

// Route for adding new project
app.post('/add-new-project', projectImageUpload.single('projectImage'), addNewProject);

// Route for deleting project
app.post('/delete-project/:id', deleteProject);

async function getHomePage(req, res) {
  try {
    const projectStatus = false;
    const message = projectStatus ? 'Currently working on a project' : 'Available for new projects';
    const statusIconFlag = projectStatus ? 'unavailable' : 'available';
    const fetchWorksQuery = {
      name: 'fetch-all-works',
      text: 'SELECT * FROM works ORDER BY end_date DESC'
    };
    const fetchProjectsQuery = {
      name: 'fetch-all-projects',
      text: 'SELECT * FROM projects ORDER BY name ASC'
    };
    const works = await pool.query(fetchWorksQuery);
    const projects = await pool.query(fetchProjectsQuery);

    if (works.rowCount > 0) {
      works.rows.forEach((item) => {
        item.start_date = dayjs(item.start_date).format('MMM YYYY');
        item.end_date = dayjs(item.end_date).format('MMM YYYY');
      });
    }

    const data = {
      email: req.session.user?.email || '',
      title: 'Muhammad Rayhan - Portfolio Web',
      headline: "Hello, I'm Rayhan",
      role: 'Android Developer & Full-Stack Developer',
      summary: "I'm an Android and Full-Stack Developer with a strong passion for programming and software engineering. I enjoy turning ideas into functional, user-friendly digital products, whether by building intuitive mobile apps or developing robust web solutions that focus on both performance and user experience. I'm always eager to learn new technologies, refine my skills, and explore creative ways to bring meaningful software to life that makes a real impact.",
      location: 'Tasikmalaya, West Java, Indonesia',
      imagePath: 'images/img_github_profile.jpg',
      message: message,
      statusIconFlag: statusIconFlag,
      works: works.rows,
      projects: projects.rows
    };

    res.render('index', data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error')
  }
}

function getLoginPage(req, res) {
  try {
    const adminEmail = req.session.user?.email || '';

    if (adminEmail.length !== 0) {
      return res.redirect('/');
    }

    const data = {
      title: 'Login',
      headline: 'Login to your account',
      imagePath: 'images/img_profile_illustration.png'
    };

    res.render('login', data)
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

async function loginAdmin(req, res) {
  try {
    const { email, password } = req.body;

    if (!isEmail(email)) {
      return res.redirect('/login');
    }

    const query = {
      name: 'fetch-admin',
      text: "SELECT id, email, password FROM admin WHERE email = $1",
      values: [email]
    }
    const admin = await pool.query(query);

    if (admin.rowCount === 0) {
      return res.redirect('/login');
    }

    if (password !== admin.rows[0].password) {
      return res.redirect('/login');
    }

    req.session.user = {
      id: admin.rows[0].id,
      email: admin.rows[0].email
    };

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(400).send('Bad Request');
  }
}

function logoutAdmin(req, res) {
  try {
    const adminEmail = req.session.user?.email || '';

    if (adminEmail.length === 0) {
      return res.redirect('/');
    }

    req.session.destroy((error) => {
      if (error) {
        console.error(error);
      }

      res.redirect('/')
    });
  } catch (error) {
    console.error(error);
    res.status(400).send('Bad Request');
  }
}

function getAddWorkExperiencePage(req, res) {
  try {
    const adminEmail = req.session.user?.email || '';

    if (adminEmail.length === 0) {
      return res.redirect('/');
    }

    const data = {
      title: 'Work Experience Detail',
      headline: 'Add work detail',
      imagePath: 'images/img_work_illustration.png',
      email: adminEmail
    };

    res.render('work_detail', data);
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
}

async function addNewWorkExperience(req, res) {
  try {
    const { workName, company, startDate, endDate, description, techStack } = req.body;
    const imageName = req.file.filename
    const cleanDescription = description.replaceAll(' ', '');
    const cleanTechStack = techStack.replaceAll(' ', '');
    const arrayDescription = cleanDescription.split(',');
    const arrayTechStack = cleanTechStack.split(',');
    const query = {
      name: 'insert-new-work-experience',
      text: "INSERT INTO works (name, company, start_date, end_date, descriptions, technologies, image_name) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      values: [workName, company, startDate, endDate, arrayDescription, arrayTechStack, imageName]
    };
    
    await pool.query(query);

    res.redirect('/')
  } catch (error) {
    console.error(error);
    res.status(400).send('Bad Request');
  }
}

async function deleteWorkExperience(req, res) {
  try {
    const workId = Number(req.params.id);

    if (typeof workId !== 'number') {
      return res.redirect('/');
    }

    const fetchWorkQuery = {
      name: 'fetch-work',
      text: "SELECT image_name FROM works WHERE id = $1",
      values: [workId]
    };
    const work = await pool.query(fetchWorkQuery);

    unlink(`assets/uploads/work_images/${work.rows[0].image_name}`, (error) => {
      if (error) {
        console.error(error);
        return;
      }
    });

    const deleteWorkQuery = {
      name: 'delete-work',
      text: "DELETE FROM works WHERE id = $1",
      values: [workId]
    };

    await pool.query(deleteWorkQuery);

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(400).send('Bad Request');
  }
}

function getAddProjectPage(req, res) {
  try {
    const adminEmail = req.session.user?.email || '';

    if (adminEmail.length === 0) {
      return res.redirect('/');
    }

    const data = {
      title: 'Project Detail',
      headline: 'Add new project',
      imagePath: 'images/img_project_illustration.png',
      email: adminEmail
    };

    res.render('project_detail', data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

async function addNewProject(req, res) {
  try {
    const { projectName, description, techStack, githubLink, demoLink } = req.body;
    const imageName = req.file.filename;
    const cleanTechStack = techStack.replaceAll(' ', '');
    const arrayTechStack = cleanTechStack.split(',');
    const query = {
      name: 'insert-new-project',
      text: "INSERT INTO projects (name, description, technologies, github_link, live_demo_link, image_name) VALUES ($1, $2, $3, $4, $5, $6)",
      values: [projectName, description, arrayTechStack, githubLink, demoLink, imageName]
    };

    await pool.query(query);
    
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(400).send('Bad Request');
  }
}

async function deleteProject(req, res) {
  try {
    const projectId = Number(req.params.id);

    if (typeof projectId !== 'number') {
      return res.redirect('/');
    }

    const fetchProjectQuery = {
      name: 'fetch-project',
      text: "SELECT image_name FROM projects WHERE id = $1",
      values: [projectId]
    };
    const project = await pool.query(fetchProjectQuery);

    unlink(`assets/uploads/project_images/${project.rows[0].image_name}`, (error) => {
      if (error) {
        console.error(error);
        return;
      }
    });

    const deleteProjectQuery = {
      name: 'delete-project',
      text: "DELETE FROM projects WHERE id = $1",
      values: [projectId]
    };

    await pool.query(deleteProjectQuery);

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(400).send('Bad Request');
  }
}

// Route to Work Experience Detail Page for editing
// app.get('/work-experience-detail', getWorkExperienceDetailPage);

// function getWorkExperienceDetailPage(req, res) {
//   try {
//     const data = {
//       title: 'Work Experience Detail',
//       headline: 'Fill work detail',
//       imagePath: 'images/img_work_illustration.png'
//     };

//     res.render('work_detail', data);
//   } catch (error) {
//     console.error(error);
//     res.status(400).send('Bad Request');
//   }
// }

// Run the web server
app.listen(port, () => {
  console.log(`Web application can be accessed at http://localhost:${port}`);
});