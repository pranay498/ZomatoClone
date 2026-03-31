import argon2 from "argon2";

export const hashPassword = async (password: string) => {
 return argon2.hash(password);
};

export const comparePassword = async (
 password: string,
 hash: string
) => {
 return argon2.verify(hash, password);
};