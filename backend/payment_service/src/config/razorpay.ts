import Razorpay from "razorpay";

// ✅ Lazy initialization to ensure env vars are loaded
let razorpayInstance: Razorpay | null = null;

export const getRazorpayInstance = (): Razorpay => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "Razorpay credentials missing in .env: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required"
      );
    }

    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    console.log("🟢 [Razorpay] Instance initialized successfully");
  }

  return razorpayInstance;
};

// For backward compatibility
Object.defineProperty(module.exports, "razorpayInstance", {
  get: getRazorpayInstance,
});