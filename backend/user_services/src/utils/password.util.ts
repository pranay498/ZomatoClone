import argon2 from "argon2";

export const hashPassword = async (password: string) => {
 return argon2.hash(password);
};

export const comparePassword = async (
  password: string,
  hash: string
) => {
  try {
    if (!hash || typeof hash !== "string") return false;
    return await argon2.verify(hash, password);
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
};