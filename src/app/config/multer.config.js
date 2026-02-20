import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * Reusable Multer Configuration
 * @param {string} folder - The subfolder within uploads/ (e.g., 'avatars', 'docs')
 * @returns {multer.Multer} - Multer instance
 */
export const createMulterUpload = (folder = "others") => {
    const uploadPath = path.join(process.cwd(), "uploads", folder);

    // Ensure the directory exists
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
    });

    const fileFilter = (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error("Error: Only images and documents are allowed!"));
        }
    };

    return multer({
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: fileFilter,
    });
};
