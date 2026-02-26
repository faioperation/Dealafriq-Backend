import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.body.projectId;
    let uploadPath = "/uploads/transcripts";

    if (projectId) {
      uploadPath = path.join(uploadPath, projectId);
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".vtt", ".txt", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedTypes.includes(ext)) {
    return cb(new Error("Only .vtt, .txt, .docx files are allowed"));
  }

  cb(null, true);
};

const uploadTranscript = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

export default uploadTranscript;