import { HydratedDocument, Model, Schema, Types, model, models } from 'mongoose';

import { Event } from './event.model';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IBooking {
  eventId: Types.ObjectId;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BookingDocument = HydratedDocument<IBooking>;

const bookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string): boolean => EMAIL_PATTERN.test(value),
        message: 'Email must be a valid address.',
      },
    },
  },
  { timestamps: true },
);

bookingSchema.pre('save', async function () {
  // Validate references up front so bookings cannot target deleted/non-existent events.
  if (this.isNew || this.isModified('eventId')) {
    const eventExists = await Event.exists({ _id: this.eventId });
    if (!eventExists) {
      throw new Error('Booking eventId does not reference an existing event.');
    }
  }

  // Re-check normalized email shape before persisting.
  if (!EMAIL_PATTERN.test(this.email)) {
    throw new Error('Email must be a valid address.');
  }
});

bookingSchema.index({ eventId: 1 });

export const Booking =
  (models.Booking as Model<IBooking>) || model<IBooking>('Booking', bookingSchema);
