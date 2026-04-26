import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'playnow_secret_2024';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'playnow_admin_2024';
const MONGODB_URI = process.env.MONGODB_URI || '';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ─── MongoDB Connection ───────────────────────────────────────
let dbConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      dbConnected = true;
      console.log('✅ MongoDB connected successfully!');
    })
    .catch(err => {
      console.log('⚠️  MongoDB connection failed:', err.message);
      console.log('   Running with in-memory data instead.');
    });
} else {
  console.log('⚠️  No MONGODB_URI found in .env');
  console.log('   Copy .env.example to .env and add your Atlas connection string');
  console.log('   Running with in-memory data for now.\n');
}

// ─── Mongoose Schemas ─────────────────────────────────────────

const userSchema = new mongoose.Schema({
  uniqueId:  { type: String, unique: true },   // PN-USERNAME-1234 / OWN-VENUE-1234 / ADM-NAME
  role:      { type: String, enum: ['player', 'owner', 'admin'], default: 'player' },
  name:      String,
  username:  { type: String, unique: true, sparse: true },
  email:     { type: String, unique: true, sparse: true },
  phone:     String,
  password:  String,
  location:  String,
  age:       Number,
  dob:       String,
  sports:    [String],
  skill:     String,
  venueName: String,    // for owners
  approved:  { type: Boolean, default: false },  // owners need approval
  resetToken: String,
  resetTokenExpiry: Date,
  createdAt: { type: Date, default: Date.now }
});

const turfSchema = new mongoose.Schema({
  name:         String,
  sport:        [String],
  location:     String,
  address:      String,
  description:  String,
  price:        Number,
  rating:       { type: Number, default: 4.5 },
  image:        String,
  images:       [String],
  phone:        String,
  whatsapp:     String,
  contactEmail: String,
  ownerId:      String,
  approved:     { type: Boolean, default: false },  // pending until admin approves
  slots:        [String],
  openTime:     String,
  closeTime:    String,
  amenities:    [String],
  courts:       { type: Number, default: 1 },
  createdAt:    { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
  bookingId: String,
  userId:    String,
  name:      String,
  phone:     String,
  sport:     String,
  venue:     String,
  date:      String,
  slot:      String,
  players:   Number,
  total:     String,
  status:    { type: String, default: 'confirmed' },
  createdAt: { type: Date, default: Date.now }
});

const gameSchema = new mongoose.Schema({
  gameId:    String,
  sport:     String,
  venue:     String,
  time:      String,
  players:   Number,
  fee:       { type: Number, default: 0 },
  desc:      String,
  hostedBy:  String,
  joinedPlayers: [String],
  createdAt: { type: Date, default: Date.now }
});

const User    = mongoose.model('User', userSchema);
const Turf    = mongoose.model('Turf', turfSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Game    = mongoose.model('Game', gameSchema);

// ─── In-Memory Fallback (when no MongoDB) ────────────────────
const memDB = {
  users: [
    {
      uniqueId: 'ADM-ADMIN',
      role: 'admin',
      name: 'System Admin',
      username: 'admin',
      email: 'admin@playnow.com',
      password: '$2a$10$gd7z0kxTalSK9svAOdaTdebSZOdj2cW2e1EYsSr.1ZrW.NEDTzUFq', // admin123
      approved: true,
      createdAt: new Date()
    },
    {
      uniqueId: 'OWN-TEST-9999',
      role: 'owner',
      name: 'Test Arena Owner',
      username: 'testowner',
      email: 'testowner@playnow.com',
      password: '$2a$10$gd7z0kxTalSK9svAOdaTdebSZOdj2cW2e1EYsSr.1ZrW.NEDTzUFq', // admin123
      location: 'Trichy',
      approved: false,
      createdAt: new Date()
    }
  ], bookings: [], games: [],
    turfs: [
      { id: 't1', name: "Elite Arena", sport: ["Football", "Cricket"], location: "Thillai Nagar, Trichy", price: 500, rating: 4.8, image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800", phone: "919876543210", approved: true, slots: ['06:00 AM', '08:00 AM', '10:00 AM', '04:00 PM', '06:00 PM', '08:00 PM'] },
      { id: 't2', name: "Smash Zone", sport: ["Badminton"], location: "KK Nagar, Trichy", price: 300, rating: 4.5, image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800", phone: "919876543211", approved: true, slots: ['06:00 AM', '07:00 AM', '08:00 AM', '05:00 PM', '06:00 PM', '07:00 PM'] },
      { id: 't3', name: "Goal Corner", sport: ["Football"], location: "Puthur, Trichy", price: 450, rating: 4.7, image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=800", phone: "919876543213", approved: true, slots: ['06:00 AM', '08:00 AM', '04:00 PM', '06:00 PM', '08:00 PM'] },
      { id: 't4', name: "Power Play Park", sport: ["Cricket", "Tennis"], location: "Srirangam, Trichy", price: 400, rating: 4.9, image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800", phone: "919876543212", approved: true, slots: ['05:00 AM', '07:00 AM', '09:00 AM', '04:00 PM', '06:00 PM', '08:00 PM'] },
      { id: 't5', name: "The Turf 121", sport: ["Football", "Cricket"], location: "Cantonment, Trichy", price: 600, rating: 4.6, image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&q=80&w=800", phone: "919876543214", approved: true, slots: ['06:00 AM', '10:00 AM', '04:00 PM', '08:00 PM'] }
    ]
};

// ─── Helper: Generate Unique ID ───────────────────────────────
function generateId(role, name) {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const clean = (name || 'user').replace(/\s+/g, '').toUpperCase().slice(0, 8);
  if (role === 'admin')  return `ADM-${clean}`;
  if (role === 'owner')  return `OWN-${clean}-${rand}`;
  return `PN-${clean}-${rand}`;
}

// ─── Helper: Auth Middleware ──────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
  next();
}

// ─── API: Health Check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: dbConnected ? 'MongoDB Atlas' : 'In-Memory', message: 'PlayNow running!' });
});

// ─── API: Register ────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, phone, password, role, location, age, dob, sports, skill, venueName, adminSecret } = req.body;

    if (!email || !password || !username) return res.status(400).json({ error: 'Email, password, username required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });

    // Admin role needs secret key
    if (role === 'admin' && adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret key' });
    }

    const uniqueId = generateId(role || 'player', username);
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      uniqueId, role: role || 'player',
      name, username, email, phone, password: hashedPassword,
      location, age, dob, sports, skill, venueName,
      approved: role === 'owner' ? false : true
    };

    let user;
    if (dbConnected) {
      // Check existing
      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) return res.status(400).json({ error: exists.email === email ? 'Email already registered' : 'Username taken' });
      user = await new User(userData).save();
    } else {
      // In-memory
      if (memDB.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
      if (memDB.users.find(u => u.username === username)) return res.status(400).json({ error: 'Username taken' });
      user = { ...userData, _id: Date.now().toString(), createdAt: new Date() };
      memDB.users.push(user);
    }

    const token = jwt.sign({ id: user._id || user.uniqueId, uniqueId, role: role || 'player', username }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      token,
      user: { uniqueId, role: role || 'player', name, username, email, location, sports, skill, approved: userData.approved, age, dob }
    });

  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email or username already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Login ───────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { loginId, email, password } = req.body;
    const identifier = loginId || email; // Support both for backward compatibility
    if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

    let user;
    if (dbConnected) {
      // Find by Email, Username, or Unique ID
      user = await User.findOne({
        $or: [
          { email: identifier },
          { username: identifier },
          { uniqueId: identifier }
        ]
      });
    } else {
      user = memDB.users.find(u => 
        u.email === identifier || 
        u.username === identifier || 
        u.uniqueId === identifier
      );
    }

    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Wrong password' });

    const token = jwt.sign(
      { id: user._id || user.uniqueId, uniqueId: user.uniqueId, role: user.role, username: user.username },
      JWT_SECRET, { expiresIn: '30d' }
    );

    res.json({
      success: true, token,
      user: { uniqueId: user.uniqueId, role: user.role, name: user.name, username: user.username, email: user.email, location: user.location, sports: user.sports, skill: user.skill, approved: user.approved, age: user.age, dob: user.dob }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Get My Profile ──────────────────────────────────────
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    let user;
    if (dbConnected) {
      user = await User.findById(req.user.id).select('-password');
    } else {
      user = memDB.users.find(u => u.uniqueId === req.user.uniqueId);
      if (user) { const { password, ...rest } = user; user = rest; }
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Forgot / Reset Password ─────────────────────────────
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user;
    if (dbConnected) user = await User.findOne({ email });
    else user = memDB.users.find(u => u.email === email);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = Math.random().toString(36).substr(2, 10);
    const expiry = Date.now() + 3600000; // 1 hour

    if (dbConnected) {
      user.resetToken = token;
      user.resetTokenExpiry = expiry;
      await user.save();
    } else {
      user.resetToken = token;
      user.resetTokenExpiry = expiry;
    }

    const resetLink = `http://localhost:${PORT}/auth.html?reset=${token}`;
    
    // Attempt sending email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'PlayNow - Password Reset',
        text: `Click the link to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email.`
      });
      console.log(`Password reset email sent to ${email}`);
    } catch (mailErr) {
      console.log('Could not send email automatically (check credentials). Reset link:', resetLink);
      console.log('Mail error:', mailErr.message);
    }
    
    res.json({ success: true, message: 'Reset link sent to your email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    let user;
    if (dbConnected) {
      user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });
    } else {
      user = memDB.users.find(u => u.resetToken === token && u.resetTokenExpiry > Date.now());
    }

    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    const hashedPassword = await bcrypt.hash(password, 10);
    if (dbConnected) {
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();
    } else {
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
    }
    res.json({ success: true, message: 'Password reset successful!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Turfs ───────────────────────────────────────────────
app.get('/api/turfs', async (req, res) => {
  try {
    const { sport, location } = req.query;
    if (dbConnected) {
      let query = { approved: true };
      if (sport && sport !== 'All Sports') query.sport = sport;
      if (location) query.location = new RegExp(location, 'i');
      const turfs = await Turf.find(query);
      return res.json(turfs);
    }
    let result = memDB.turfs.filter(t => t.approved === true);
    if (sport && sport !== 'All Sports') result = result.filter(t => t.sport.includes(sport));
    if (location) result = result.filter(t => t.location.toLowerCase().includes(location.toLowerCase()));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Get Single Turf by ID ───────────────────────────────
app.get('/api/turfs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (dbConnected) {
      const turf = await Turf.findById(id);
      if (!turf) return res.status(404).json({ error: 'Turf not found' });
      return res.json(turf);
    }
    const turf = memDB.turfs.find(t => t.id === id || t._id === id);
    if (!turf) return res.status(404).json({ error: 'Turf not found' });
    res.json(turf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/turfs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners can add turfs' });
    }
    const turf = { ...req.body, ownerId: req.user.uniqueId, approved: req.user.role === 'admin' };
    if (dbConnected) {
      const saved = await new Turf(turf).save();
      return res.status(201).json({ success: true, turf: saved });
    }
    memDB.turfs.push({ ...turf, id: Date.now().toString(), approved: req.user.role === 'admin' });
    res.status(201).json({ success: true, turf });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alias for public Arenas fetching
app.get('/api/Arenas', async (req, res) => {
  req.url = '/api/turfs';
  app.handle(req, res);
});

// ─── API: Bookings ────────────────────────────────────────────
app.post('/api/bookings', async (req, res) => {
  try {
    const { name, phone, sport, venue, turfName, turfId, date, slot, time, players, total } = req.body;
    const venueName = turfName || venue;
    const timeSlot  = time || slot;
    if (!name || !venueName || !date || !timeSlot) return res.status(400).json({ error: 'Missing required fields' });
    const bookingId = 'BK-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    const booking = { bookingId, name, phone, sport, venue: venueName, turfId, date, slot: timeSlot, players, total, status: 'confirmed' };
    if (dbConnected) {
      await new Booking(booking).save();
    } else {
      memDB.bookings.push({ ...booking, createdAt: new Date() });
    }
    console.log('Booking:', bookingId, '-', venueName, '@', timeSlot);
    res.status(201).json({ success: true, bookingId, message: 'Booking confirmed!', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    if (dbConnected) {
      const bookings = req.user.role === 'admin' ? await Booking.find() : await Booking.find({ userId: req.user.uniqueId });
      return res.json(bookings);
    }
    res.json(memDB.bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Games ───────────────────────────────────────────────
app.post('/api/games', authMiddleware, async (req, res) => {
  try {
    const { sport, venue, time, players, fee, desc } = req.body;
    if (!sport || !venue || !time) return res.status(400).json({ error: 'Sport, venue and time required' });
    const gameId = 'GM-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    const game = { gameId, sport, venue, time, players, fee: fee || 0, desc, hostedBy: req.user.uniqueId };
    if (dbConnected) {
      await new Game(game).save();
    } else {
      memDB.games.push({ ...game, joinedPlayers: [], createdAt: new Date() });
    }
    res.status(201).json({ success: true, gameId, game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    if (dbConnected) return res.json(await Game.find().sort({ createdAt: -1 }));
    res.json(memDB.games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Owner Routes ────────────────────────────────────────
app.get('/api/owner/my-turfs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners can access this' });
    }
    if (dbConnected) {
      return res.json(await Turf.find({ ownerId: req.user.uniqueId }));
    }
    res.json(memDB.turfs.filter(t => t.ownerId === req.user.uniqueId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/owner/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owners only' });
    let turfs;
    if (dbConnected) turfs = await Turf.find({ ownerId: req.user.uniqueId });
    else turfs = memDB.turfs.filter(t => t.ownerId === req.user.uniqueId);
    
    let totalBookings = 0;
    let totalGames = 0;
    const turfNames = turfs.map(t => t.name);
    
    if (dbConnected) {
      totalBookings = await Booking.countDocuments({ venue: { $in: turfNames } });
      totalGames = await Game.countDocuments({ venue: { $in: turfNames } });
    } else {
      totalBookings = memDB.bookings.filter(b => turfNames.includes(b.venue)).length;
      totalGames = memDB.games.filter(g => turfNames.includes(g.venue)).length;
    }
    
    res.json({ totalBookings, totalGames, turfsCount: turfs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/turfs/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { name, sport, location, address, description, price, phone, whatsapp, contactEmail,
            slots, openTime, closeTime, amenities, courts, image, images, approved } = req.body;
    let turf;
    
    if (dbConnected) {
      turf = await Turf.findById(req.params.id);
      if (!turf) return res.status(404).json({ error: 'Turf not found' });
      if (turf.ownerId !== req.user.uniqueId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not your turf' });
      }
      
      if (name !== undefined) turf.name = name;
      if (sport !== undefined) turf.sport = sport;
      if (location !== undefined) turf.location = location;
      if (address !== undefined) turf.address = address;
      if (description !== undefined) turf.description = description;
      if (price !== undefined) turf.price = price;
      if (phone !== undefined) turf.phone = phone;
      if (whatsapp !== undefined) turf.whatsapp = whatsapp;
      if (contactEmail !== undefined) turf.contactEmail = contactEmail;
      if (slots !== undefined) turf.slots = slots;
      if (openTime !== undefined) turf.openTime = openTime;
      if (closeTime !== undefined) turf.closeTime = closeTime;
      if (amenities !== undefined) turf.amenities = amenities;
      if (courts !== undefined) turf.courts = courts;
      if (image !== undefined) turf.image = image;
      if (images !== undefined) turf.images = images;
      if (approved !== undefined && req.user.role === 'admin') turf.approved = approved;
      
      await turf.save();
      return res.json({ success: true, turf });
    } else {
      turf = memDB.turfs.find(t => t.id === req.params.id);
      if (!turf) return res.status(404).json({ error: 'Turf not found' });
      if (turf.ownerId !== req.user.uniqueId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not your turf' });
      }
      Object.assign(turf, { name, sport, location, address, description, price, phone, whatsapp,
        contactEmail, slots: slots || turf.slots, openTime, closeTime, amenities, courts, image, images });
      if (approved !== undefined && req.user.role === 'admin') turf.approved = approved;
      return res.json({ success: true, turf });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Admin Routes ────────────────────────────────────────
app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (dbConnected) return res.json(await User.find().select('-password'));
    res.json(memDB.users.map(({ password, ...u }) => u));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/turfs', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (dbConnected) return res.json(await Turf.find());
    res.json(memDB.turfs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/approve-owner/:uniqueId', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (dbConnected) {
      await User.findOneAndUpdate({ uniqueId: req.params.uniqueId }, { approved: true });
    } else {
      const u = memDB.users.find(u => u.uniqueId === req.params.uniqueId);
      if (u) u.approved = true;
    }
    res.json({ success: true, message: 'Owner approved!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve HTML Pages ─────────────────────────────────────────
const pages = ['', 'auth', 'dashboard', 'turfs', 'booking', 'contact', 'owner', 'admin', 'admin-login'];
pages.forEach(p => {
  app.get('/' + p, (req, res) => {
    const file = p === '' ? 'index' : p;
    res.sendFile(path.join(__dirname, file + '.html'));
  });
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n================================');
  console.log('  PlayNow Server Running!');
  console.log('  Open: http://localhost:' + PORT);
  console.log('  API:  http://localhost:' + PORT + '/api/health');
  console.log('================================\n');
});
