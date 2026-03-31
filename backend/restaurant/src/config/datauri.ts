import DatauriParser from "datauri/parser";
import path from "path";

const parser = new DatauriParser();

/**
 * Convert file buffer to datauri format
 * @param filename - Original filename
 * @param buffer - File buffer
 * @returns Datauri string or null
 */
export const fileToDataUri = (filename: string, buffer: Buffer) => {
  const fileExt = path.extname(filename).toLowerCase();
  const datauri = parser.format(fileExt, buffer);
  
  if (!datauri || !datauri.content) {
    return null;
  }
  
  return datauri.content;
};

export default parser;
