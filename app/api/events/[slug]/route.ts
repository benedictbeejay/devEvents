import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { Event } from "@/database/event.model";
import connectToDatabase from "@/lib/mongodb";

type RouteParams = {
  slug?: string;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

type ErrorResponseBody = {
  message: string;
  details?: string;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createErrorResponse = (
  message: string,
  status: number,
  details?: string,
): NextResponse<ErrorResponseBody> => {
  const body: ErrorResponseBody = { message };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { slug: rawSlug } = await params;

  // Validate route params before querying the database.
  if (typeof rawSlug !== "string" || rawSlug.trim().length === 0) {
    return createErrorResponse("Missing required route parameter: slug.", 400);
  }

  const slug = rawSlug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    return createErrorResponse(
      "Invalid slug format. Use lowercase letters, numbers, and hyphens only.",
      400,
    );
  }

  try {
    await connectToDatabase();

    // Use lean() for a plain JSON-serializable object and improved read performance.
    const event = await Event.findOne({ slug }).lean().exec();

    if (!event) {
      return createErrorResponse(`No event found for slug "${slug}".`, 404);
    }

    // Ensure `date` is returned as `YYYY-MM-DD` (string) instead of an ISO Date string.
    const normalizedEvent = {
      ...event,
      date:
        (event?.date as unknown) instanceof Date
          ? (event.date as unknown as Date).toISOString().slice(0, 10)
          : typeof event?.date === "string"
            ? new Date(event.date).toISOString().slice(0, 10)
            : event?.date,
    };

    return NextResponse.json(
      {
        message: "Event fetched successfully.",
        event: normalizedEvent,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof mongoose.Error.ValidationError) {
      return createErrorResponse("Invalid request while fetching event.", 400);
    }

    console.error("Failed to fetch event by slug:", error);

    const details =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : undefined;

    return createErrorResponse(
      "Failed to fetch event due to an unexpected error.",
      500,
      details,
    );
  }
}
