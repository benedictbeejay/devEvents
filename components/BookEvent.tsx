"use client";
import { createBooking } from "@/lib/actions/booking.actions";
import { useState } from "react";
import posthog from "posthog-js";

const BookEvent = ({ eventId, slug }: { eventId: string; slug: string }) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { success } = await createBooking({ eventId, slug, email });

    if (success) {
      setSubmitted(true);
      posthog.capture("booking_created", {
        eventId,
        slug,
        email,
      });
    } else {
      console.error("Booking failed");
      posthog.captureException("Booking failed");
    }

    e.preventDefault();

    setTimeout(() => {
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div id="book-event">
      {submitted ? (
        <p className="text-sm">Thank You For signing Up</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Book Event</button>
        </form>
      )}
    </div>
  );
};

export default BookEvent;
