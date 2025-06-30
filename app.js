const express   = require('express');
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const multer    = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Cloudinary Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Middlewares
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
app.use(express.json());

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MongoDB Connection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mongoose Schemas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
const employeeSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  position: { type: String, required: true },
  image:    { type: String }
});
const Employee = mongoose.model('Employee', employeeSchema);

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Multer Setup (Memory Storage)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
const upload = multer({ storage: multer.memoryStorage() });

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Auth Middleware
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
const auth = (req, res, next) => {
  const bearer = req.headers.authorization;
  if (!bearer) return res.status(401).json({ message: '❌ No token provided' });

  try {
    const decoded = jwt.verify(bearer.split(' ')[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: '❌ Invalid or expired token' });
  }
};

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Auth Routes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (await User.findOne({ email }))
      return res.status(400).json({ message: '❌ User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed });
    res.status(201).json({ message: '✅ Registered successfully' });
  } catch (err) {
    res.status(500).json({ message: '❌ Registration error', error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: '❌ Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: '❌ Login error', error: err.message });
  }
});

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Employee CRUD (Protected)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
app.post('/employees', auth, async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ message: '✅ Employee created', data: employee });
  } catch (e) {
    res.status(400).json({ message: '❌ Error creating employee', error: e.message });
  }
});

app.get('/employees', auth, async (_, res) => {
  try {
    const employees = await Employee.find();
    res.json({ message: '✅ Employees fetched', data: employees });
  } catch (e) {
    res.status(500).json({ message: '❌ Error fetching employees', error: e.message });
  }
});

app.put('/employees/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!employee) return res.status(404).json({ message: '❌ Employee not found' });
    res.json({ message: '✅ Employee updated', data: employee });
  } catch (e) {
    res.status(400).json({ message: '❌ Error updating employee', error: e.message });
  }
});

app.delete('/employees/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: '❌ Employee not found' });
    res.json({ message: '✅ Employee deleted', data: employee });
  } catch (e) {
    res.status(400).json({ message: '❌ Error deleting employee', error: e.message });
  }
});

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Image Upload to Cloudinary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
app.post('/employees/:id/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: '❌ No image file uploaded' });

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'employee_images' },
      async (error, result) => {
        if (error) return res.status(500).json({ message: '❌ Cloudinary upload error', error });

        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: '❌ Employee not found' });

        employee.image = result.secure_url;
        await employee.save();

        res.json({
          message: '✅ Image uploaded to Cloudinary',
          data: {
            id: employee._id,
            name: employee.name,
            position: employee.position,
            imageUrl: result.secure_url
          }
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (e) {
    res.status(500).json({ message: '❌ Upload failed', error: e.message });
  }
});

/*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Default Route + Start Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
app.get('/', (_, res) => res.send('🎉 Welcome to the Employee API'));

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
