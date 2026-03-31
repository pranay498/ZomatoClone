import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";

// Configure cloudinary storage for files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "zomato-clone/restaurants",
    allowed_formats: ["jpeg", "png", "gif", "webp"],
    resource_type: "auto",
  } as any,
});

// File filter - only accept images
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  console.log("🟡 [Multer] fileFilter called for file:", file.originalname);
  console.log("🟡 [Multer] File mimetype:", file.mimetype);
  
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  
  if (allowedMimes.includes(file.mimetype)) {
    console.log("🟢 [Multer] File accepted");
    cb(null, true);
  } else {
    console.error("🔴 [Multer] File rejected - invalid mimetype");
    cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WEBP)"), false);
  }
};

// Configure multer with higher limits for text fields
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    fieldSize: 1 * 1024 * 1024, // 1MB max field size for text fields
  },
});

// Middleware that handles both file and text fields from FormData
export const uploadSingleFile = (req: any, res: any, next: any) => {
  console.log("🟡 [Multer] uploadSingleFile middleware called");
  console.log("🟡 [Multer] Content-Type:", req.headers['content-type']);
  
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      console.error("🔴 [Multer] Multer error:", err);
      return next(err);
    }
    
    console.log("🟢 [Multer] File upload completed");
    console.log("🟢 [Multer] req.file:", req.file);
    console.log("🟢 [Multer] req.body:", req.body);
    
    // Parse text fields from multipart form data
    // They should already be in req.body if multer parsed them
    // If not, we can manually parse them from the request
    
    next();
  });
};

// Multer middleware for multiple file uploads
export const uploadMultipleFiles = upload.array("files", 10); // Max 10 files

export default upload;
