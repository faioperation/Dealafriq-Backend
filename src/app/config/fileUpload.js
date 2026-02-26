import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * Reusable Multer Config for General File Uploads
 * Default destination: uploads/others
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xls|xlsx|vtt/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

    // Check mimetype or common document types
    const isAllowedMimetype = file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('text/') ||
        file.mimetype.includes('pdf') ||
        file.mimetype.includes('msword') ||
        file.mimetype.includes('officedocument') ||
        file.mimetype.includes('excel') ||
        file.originalname.toLowerCase().endsWith('.vtt');

    if (extname && isAllowedMimetype) {
        return cb(null, true);
    } else {
        cb(new Error(`Error: File type ${file.mimetype} is not allowed!`));
    }
};

export const fileUpload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: fileFilter,
});
