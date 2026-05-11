import connectToDB from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { Event } from "@/database/event.model";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const contentType = req.headers.get("content-type") ?? "";

    // Ensure the request is actually multipart/form-data before calling req.formData().
    let raw: Record<string, unknown>;
    let file: File | null;
    let formData: FormData | null = null;

    if (contentType.includes("multipart/form-data")) {
      formData = await req.formData();
      try {
        raw = Object.fromEntries(formData.entries());
      } catch (e) {
        return NextResponse.json(
          {
            message: "Invalid form data",
            error: e instanceof Error ? e.message : "Unknown",
            contentType,
          },
          { status: 400 },
        );
      }
      file = formData.get("image") as File | null;
    } else {
      // If the client sends JSON (or something else), parse it to produce a helpful error.
      try {
        raw = await req.json();
      } catch {
        raw = {};
      }
      file = null;

      return NextResponse.json(
        {
          message:
            "Event creation expects multipart/form-data with an 'image' file.",
          receivedContentType: contentType,
        },
        { status: 400 },
      );
    }

    if (!file) {
      return NextResponse.json(
        { message: "Image file is required" },
        { status: 400 },
      );
    }

    const tags = JSON.parse(formData.get("tags") as string);
    const agenda = JSON.parse(formData.get("agenda") as string);

    // Validate file MIME type
    const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Allowed types: PNG, JPEG, WebP" },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "File size exceeds 5MB limit" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "image",
              folder: "devEvents",
            },
            (error, results) => {
              if (error) return reject(error);
              if (!results) return reject(new Error("Upload failed"));

              resolve(results);
            },
          )
          .end(buffer);
      },
    );

    // Normalize and trim string fields; convert arrays-like values safely.
    const toTrimmedString = (value: unknown): string =>
      typeof value === "string" ? value.trim() : "";

    const normalizeStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];

        // Try JSON array: '["a","b"]'
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmed) as unknown;
            if (Array.isArray(parsed)) {
              return parsed
                .map(String)
                .map((s) => s.trim())
                .filter(Boolean);
            }
          } catch {
            // fall through
          }
        }

        // Try comma-separated: 'a, b, c'
        if (trimmed.includes(",")) {
          return trimmed
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        // Single value: 'a'
        return [trimmed];
      }

      return [];
    };

    // Some clients include whitespace in field names; normalize keys.
    const cleanedRaw: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      cleanedRaw[key.trim()] = value;
    }

    const event = {
      title: toTrimmedString(cleanedRaw.title),
      description: toTrimmedString(cleanedRaw.description),
      overview: toTrimmedString(cleanedRaw.overview),
      image: uploadResult.secure_url,
      venue: toTrimmedString(cleanedRaw.venue),
      location: toTrimmedString(cleanedRaw.location),
      date: toTrimmedString(cleanedRaw.date),
      time: toTrimmedString(cleanedRaw.time),
      mode: toTrimmedString(cleanedRaw.mode),
      audience: toTrimmedString(cleanedRaw.audience),
      organizer: toTrimmedString(cleanedRaw.organizer),
      agenda: normalizeStringArray(cleanedRaw.agenda),
      tags: normalizeStringArray(cleanedRaw.tags),
    };

    const requiredFields = [
      "title",
      "description",
      "overview",
      "image",
      "venue",
      "location",
      "date",
      "time",
      "mode",
      "audience",
      "organizer",
    ] as const;

    const missing = requiredFields.filter((k) => !event[k]);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          message: "Missing or invalid event fields",
          missing,
          receivedKeys: Object.keys(cleanedRaw),
        },
        { status: 400 },
      );
    }

    if (!event.agenda.length) {
      return NextResponse.json(
        { message: "Missing or invalid event fields", missing: ["agenda"] },
        { status: 400 },
      );
    }

    if (!event.tags.length) {
      return NextResponse.json(
        { message: "Missing or invalid event fields", missing: ["tags"] },
        { status: 400 },
      );
    }

    const createdEvent = await Event.create({
      ...event,
      tags: tags,
      agenda: agenda,
    });
    return NextResponse.json(
      {
        message: "Event Created Successfully",
        event: createdEvent,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        message: "Event Creation Failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    await connectToDB();
    const events = await Event.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(
      { message: "Event Fetched Successfully", events },
      { status: 200 },
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error("Unknown");
    const msg = err.message || "Unknown";
    const hint =
      msg.includes("ESERVFAIL") || msg.toLowerCase().includes("querysrv")
        ? "MongoDB SRV DNS lookup failed (ESERVFAIL). Check your network/VPN/DNS and that the hostname in MONGODB_URI is correct."
        : msg.toLowerCase().includes("missing mongodb_uri")
          ? "MONGODB_URI is not set. Ensure it exists in .env.local and restart the dev server."
          : undefined;

    return NextResponse.json(
      {
        message: "Failed to fetch events",
        error: msg,
        hint,
      },
      { status: 500 },
    );
  }
}
