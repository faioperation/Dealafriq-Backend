import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * Shared Multer Config for Project Uploads
 * Handles 'documents' and 'agreements' fields
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = "others";
        if (file.fieldname === "documents") {
            folder = "project-documents";
        } else if (file.fieldname === "agreements") {
            folder = "project-agreements";
        }

        const uploadPath = path.join(process.cwd(), "uploads", folder);
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
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error("Error: Only images and common documents (PDF, DOC, DOCX, TXT, XLS) are allowed!"));
    }
};

export const projectUpload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter,
}).fields([
    { name: "documents", maxCount: 10 },
    { name: "agreements", maxCount: 10 },
]);
