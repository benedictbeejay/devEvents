"use server";
import { Event } from "@/database/event.model";
import connectDB from "../mongodb";

export const getSimilarEventsBySlug = async (slug: string) => {
  try {
    await connectDB();

    const events = await Event.findOne({ slug });
    return await Event.find({
      _id: { $ne: events?._id },
      tags: { $in: events?.tags || [] },
    }).lean(); // .limit(3);
  } catch {
    return [];
  }
};
