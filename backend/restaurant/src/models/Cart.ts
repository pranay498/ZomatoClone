import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  specialInstructions?: string;
}

export interface ICart extends Document {
  userId: string;
  restaurantId: mongoose.Types.ObjectId;
  restaurantName: string;
  items: ICartItem[];
  totalPrice: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "Menu item ID is required"],
    },

    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Item price is required"],
      min: [0, "Price cannot be negative"],
      validate: {
        validator: function (v: number) {
          return v > 0;
        },
        message: "Price must be greater than 0",
      },
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },

    imageUrl: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: "Invalid image URL",
      },
    },

    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [300, "Instructions cannot exceed 300 characters"],
    },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      trim: true,
      index: true,
    },

    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [true, "Restaurant ID is required"],
      index: true,
    },

    restaurantName: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: function (v: ICartItem[]) {
          return v.length > 0;
        },
        message: "Cart must have at least one item",
      },
    },

    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"],
      default: 0,
    },

    itemCount: {
      type: Number,
      required: true,
      min: [0, "Item count cannot be negative"],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
cartSchema.index({ userId: 1, restaurantId: 1 });
cartSchema.index({ userId: 1 });

// Pre-save hook to calculate totals
cartSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.totalPrice = this.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    this.itemCount = this.items.reduce((count, item) => count + item.quantity, 0);
  } else {
    this.totalPrice = 0;
    this.itemCount = 0;
  }
  next();
});

export const Cart = mongoose.model<ICart>("Cart", cartSchema);
