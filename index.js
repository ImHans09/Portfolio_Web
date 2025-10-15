import express from 'express';

// Initialize express app
const app = express();

// Initialize port
const port = 3000;

// Set hbs view engine
app.set('view engine', 'hbs');

// Use static files in assets directory
app.use(express.static('assets'));

// Route for Home Page
app.get('/', getHomePage);

function getHomePage(req, res) {
  const projectStatus = false;
  const message = projectStatus ? 'Currently working on a project' : 'Available for new projects';
  const statusIconFlag = projectStatus ? 'unavailable' : 'available';
  const data = {
    title: 'Muhammad Rayhan - Portfolio Web',
    headline: "Hello, I'm Rayhan",
    role: 'Android Developer & Full-Stack Developer',
    summary: "I'm an Android and Full-Stack Developer with a strong passion for programming and software engineering. I enjoy turning ideas into functional, user-friendly digital products, whether by building intuitive mobile apps or developing robust web solutions that focus on both performance and user experience. I'm always eager to learn new technologies, refine my skills, and explore creative ways to bring meaningful software to life that makes a real impact.",
    location: 'Tasikmalaya, West Java, Indonesia',
    imagePath: 'images/img_github_profile.jpg',
    message: message,
    statusIconFlag: statusIconFlag
  };

  res.render('index', data);
}

// Run the web server
app.listen(port, () => {
  console.log(`Web application can be accessed at http://localhost:${port}`);
});