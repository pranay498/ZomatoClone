import { v2 as cloudinary } from "cloudinary";
// @ts-ignore
import DatauriParser from "datauri/parser";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const parser = new DatauriParser();

export const getDataUri = (file: Express.Multer.File) => {
  const extName = path.extname(file.originalname).toString();
  return parser.format(extName, file.buffer);
};

export default cloudinary;
