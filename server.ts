import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "data.json");

// Initial data structure
interface DataSchema {
  recruitmentRecords: any[];
  whatsappRecords: any[];
  users: { [uid: string]: { email: string; role: string } };
  settings: {
    recruitmentTemplates: { id: string; name: string; content: string }[];
    whatsappTemplates: { id: string; name: string; content: string }[];
  };
  hasBeenCleared?: boolean;
  hasBeenNormalized?: boolean;
  hasBeenMigratedToSeparateTemplates?: boolean;
}

function loadData(): DataSchema {
  const initialData: DataSchema = { 
    recruitmentRecords: [], 
    whatsappRecords: [],
    users: {}, 
    settings: { 
      recruitmentTemplates: [
        { id: "1", name: "Default Recruitment Template", content: "Hello, I am interested in your recruitment profile." }
      ],
      whatsappTemplates: [
        { id: "1", name: "Default WhatsApp Template", content: "Hello, I am interested in your profile. Please join our group: https://chat.whatsapp.com/example" }
      ]
    },
    hasBeenCleared: false,
    hasBeenNormalized: false,
    hasBeenMigratedToSeparateTemplates: false
  };

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    
    // Check if we need to migrate or if the user wants to clear data
    // Since the user explicitly asked to "clear all previous data", we will reset the records.
    // However, we should keep the users and settings.
    
    const newData: DataSchema = {
      recruitmentRecords: data.recruitmentRecords || [],
      whatsappRecords: data.whatsappRecords || [],
      users: data.users || {},
      settings: {
        ...initialData.settings,
        ...(data.settings || {})
      },
      hasBeenCleared: data.hasBeenCleared || false,
      hasBeenNormalized: data.hasBeenNormalized || false,
      hasBeenMigratedToSeparateTemplates: data.hasBeenMigratedToSeparateTemplates || false
    };

    let modified = false;

    // Migration for separate templates
    if (!newData.hasBeenMigratedToSeparateTemplates) {
      const oldTemplates = (data.settings && data.settings.templates) || [];
      if (oldTemplates.length > 0) {
        newData.settings.recruitmentTemplates = JSON.parse(JSON.stringify(oldTemplates));
        newData.settings.whatsappTemplates = JSON.parse(JSON.stringify(oldTemplates));
      }
      newData.hasBeenMigratedToSeparateTemplates = true;
      modified = true;
    }

    // Since the user explicitly asked to "clear all previous data", we will reset the records once.
    if (!newData.hasBeenCleared) {
      newData.recruitmentRecords = [];
      newData.whatsappRecords = [];
      newData.hasBeenCleared = true;
      modified = true;
    }

    // Normalize existing numbers to +92
    if (!newData.hasBeenNormalized) {
      const normalize = (r: any) => {
        if (r.mobile) {
          let mobile = String(r.mobile).replace(/\D/g, '');
          if (mobile.startsWith('0')) mobile = mobile.substring(1);
          if (mobile && !mobile.startsWith('92')) mobile = '92' + mobile;
          if (mobile && !mobile.startsWith('+')) mobile = '+' + mobile;
          if (mobile !== r.mobile) {
            modified = true;
            return { ...r, mobile };
          }
        }
        return r;
      };

      newData.recruitmentRecords = newData.recruitmentRecords.map(normalize);
      newData.whatsappRecords = newData.whatsappRecords.map(normalize);
      newData.hasBeenNormalized = true;
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));
    }

    return newData;
  } catch (e) {
    return initialData;
  }
}

function saveData(data: DataSchema) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  app.use(bodyParser.json({ limit: '50mb' }));

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // API Routes
  
  // Auth - Simple mock login
  app.post("/api/login", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const data = loadData();
    
    // Simple rule: this specific email is admin
    const isAdmin = email === "pecrecruitmentmath@gmail.com";
    const uid = Buffer.from(email).toString('base64');
    
    if (!data.users[uid]) {
      data.users[uid] = { email, role: isAdmin ? 'admin' : 'user' };
      saveData(data);
    }
    
    res.json({ 
      user: { uid, email, displayName: email.split('@')[0] },
      profile: data.users[uid]
    });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const data = loadData();
    res.json(data.settings);
  });

  app.post("/api/settings", (req, res) => {
    const { recruitmentTemplates, whatsappTemplates } = req.body;
    const data = loadData();
    if (recruitmentTemplates !== undefined) data.settings.recruitmentTemplates = recruitmentTemplates;
    if (whatsappTemplates !== undefined) data.settings.whatsappTemplates = whatsappTemplates;
    saveData(data);
    
    // Broadcast update
    io.emit("settings:updated", data.settings);
    
    res.json({ success: true, settings: data.settings });
  });

  // Records - List/Search
  app.get("/api/records", (req, res) => {
    const { q, type } = req.query;
    const data = loadData();
    
    const records = type === 'whatsapp' ? data.whatsappRecords : data.recruitmentRecords;
    
    if (!q) {
      return res.json(records);
    }

    const term = String(q).toLowerCase();
    const normalizedTerm = term.replace(/\D/g, '');
    const searchMobile = normalizedTerm.startsWith('0') ? normalizedTerm.substring(1) : normalizedTerm;

    const filtered = records.filter(r => {
      const matchesName = (r.name && r.name.toLowerCase().includes(term)) ||
                         (r.name_lowercase && r.name_lowercase.includes(term));
      
      const rMobile = r.mobile ? r.mobile.replace(/\D/g, '') : '';
      const matchesMobile = (r.mobile && r.mobile.includes(term)) || 
                           (searchMobile && rMobile.includes(searchMobile));
      
      return matchesName || matchesMobile;
    });
    
    res.json(filtered);
  });

  // Records - Upload
  app.post("/api/records/upload", (req, res) => {
    const { records, type } = req.body;
    const data = loadData();
    
    const existingRecords = type === 'whatsapp' ? data.whatsappRecords : data.recruitmentRecords;
    
    // Determine the next group number based on existing records
    let nextGroupNum = 1;
    if (existingRecords.length > 0) {
      const groupNums = existingRecords
        .map((r: any) => {
          const match = (r.groupName || "").match(/Group (\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter((n: number) => n > 0);
      if (groupNums.length > 0) {
        nextGroupNum = Math.max(...groupNums) + 1;
      }
    }

    // Add IDs and group names to new records in chunks of 100
    const newRecords = records.map((r: any, index: number) => {
      const currentGroupNum = nextGroupNum + Math.floor(index / 100);
      return {
        ...r,
        id: uuidv4(),
        isEligible: false,
        groupName: `Group ${currentGroupNum}`,
        name_lowercase: (r.name || "").toLowerCase()
      };
    });
    
    if (type === 'whatsapp') {
      data.whatsappRecords = [...data.whatsappRecords, ...newRecords];
    } else {
      data.recruitmentRecords = [...data.recruitmentRecords, ...newRecords];
    }
    saveData(data);
    
    // Broadcast update
    io.emit("records:updated", { type });
    
    res.json({ success: true, count: newRecords.length });
  });

  // Records - Mark Eligible
  app.post("/api/records/:id/eligible", (req, res) => {
    const { id } = req.params;
    const { markedBy, type } = req.body;
    const data = loadData();
    
    const records = type === 'whatsapp' ? data.whatsappRecords : data.recruitmentRecords;
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
      records[index].isEligible = true;
      records[index].markedAt = new Date().toISOString();
      records[index].markedBy = markedBy;
      saveData(data);
      
      // Broadcast update
      io.emit("records:updated", { type });
      
      res.json({ success: true, record: records[index] });
    } else {
      res.status(404).json({ error: "Record not found" });
    }
  });

  // Records - Delete All
  app.delete("/api/records", (req, res) => {
    const { type } = req.body;
    const data = loadData();
    if (type === 'whatsapp') {
      data.whatsappRecords = [];
    } else {
      data.recruitmentRecords = [];
    }
    saveData(data);
    
    // Broadcast update
    io.emit("records:updated", { type });
    
    res.json({ success: true });
  });

  // Records - Delete Single
  app.delete("/api/records/:id", (req, res) => {
    const { id } = req.params;
    const { type } = req.body;
    const data = loadData();
    if (type === 'whatsapp') {
      data.whatsappRecords = data.whatsappRecords.filter(r => r.id !== id);
    } else {
      data.recruitmentRecords = data.recruitmentRecords.filter(r => r.id !== id);
    }
    saveData(data);
    
    // Broadcast update
    io.emit("records:updated", { type });
    
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
