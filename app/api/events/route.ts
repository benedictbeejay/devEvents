import connectToDatabase from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { Event } from "@/database/event.model";
import { v2 as cloudinary } from "cloudinary";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const contentType = req.headers.get("content-type") ?? "";

    // Ensure the request is actually multipart/form-data before calling req.formData().
    let raw: Record<string, unknown>;
    let file: File | null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
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

    const createdEvent = await Event.create(event);
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
        error: e instanceof Error ? e.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const events = await Event.find().sort({ createdAt: -1 });
    return NextResponse.json(
      { message: "Event Fetched Successfully", events },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        message: "Failed to fetch events",
        error: e instanceof Error ? e.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

// export async function POST(req: NextRequest) {
//   try {

//     await connectToDatabase();
//     const formData = await req.formData();

//     const file = formData.get("image") as File;
//     if (!file) {
//       return NextResponse.json(
//         { message: "Image file is required" },
//         { status: 400 },
//       );
//     }

//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     const uploadResult = await new Promise<{ secure_url: string }>(
//       (resolve, reject) => {
//         cloudinary.uploader
//           .upload_stream(
//             { resource_type: "image", Folder: "devEvents" },
//             (error: unknown, results: { secure_url: string }) => {
//               if (error) {
//                 reject(error);
//               } else {
//                 resolve(results);
//               }
//             },
//           )
//           .end(buffer);
//       },
//     );

//     // Build a plain object from FormData.
//     const raw = Object.fromEntries(formData.entries());

//     // Some clients accidentally include leading/trailing spaces in field names.
//     // Example: " overview" instead of "overview".
//     const cleanedRaw: Record<string, unknown> = {};
//     for (const [key, value] of Object.entries(raw)) {
//       cleanedRaw[key.trim()] = value;
//     }

//     const requiredStringFields = [
//       "title",
//       "description",
//       "overview",
//       "image",
//       "venue",
//       "location",
//       "date",
//       "time",
//       "mode",
//       "audience",
//       "organizer",
//     ] as const;

//     const toTrimmedString = (value: unknown): string =>
//       typeof value === "string" ? value.trim() : "";

//     // Some form submissions send arrays as comma-separated strings.
//     // Others send JSON stringified arrays (rare but happens).
//     const normalizeStringArray = (value: unknown): string[] => {
//       if (Array.isArray(value)) {
//         return value
//           .map(String)
//           .map((s) => s.trim())
//           .filter(Boolean);
//       }

//       if (typeof value === "string") {
//         const trimmed = value.trim();
//         if (!trimmed) return [];

//         // Try JSON array: "[\"a\",\"b\"]"
//         if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
//           try {
//             const parsed = JSON.parse(trimmed) as unknown;
//             if (Array.isArray(parsed)) {
//               return parsed
//                 .map(String)
//                 .map((s) => s.trim())
//                 .filter(Boolean);
//             }
//           } catch {
//             // fall through to comma/single normalization
//           }
//         }

//         // Try comma-separated: "a, b, c"
//         if (trimmed.includes(",")) {
//           return trimmed
//             .split(",")
//             .map((s) => s.trim())
//             .filter(Boolean);
//         }

//         // Single value: "a"
//         return [trimmed];
//       }

//       return [];
//     };

//     // Use cleanedRaw so field name whitespace issues are handled.
//     const event = {
//       title: toTrimmedString(cleanedRaw.title),
//       description: toTrimmedString(cleanedRaw.description),
//       overview: toTrimmedString(cleanedRaw.overview),
//       image: uploadResult.secure_url,
//       venue: toTrimmedString(cleanedRaw.venue),
//       location: toTrimmedString(cleanedRaw.location),
//       date: toTrimmedString(cleanedRaw.date),
//       time: toTrimmedString(cleanedRaw.time),
//       mode: toTrimmedString(cleanedRaw.mode),
//       audience: toTrimmedString(cleanedRaw.audience),
//       organizer: toTrimmedString(cleanedRaw.organizer),
//       agenda: normalizeStringArray(cleanedRaw.agenda),
//       tags: normalizeStringArray(cleanedRaw.tags),
//     };

//     const missing = requiredStringFields.filter((k) => !event[k]);
//     if (missing.length > 0 || !event.agenda?.length || !event.tags?.length) {
//       return NextResponse.json(
//         {
//           message: "Missing or invalid event fields",
//           missing,
//           agendaLength: event.agenda?.length ?? 0,
//           tagsLength: event.tags?.length ?? 0,
//           receivedKeys: {
//             raw: Object.keys(raw),
//             cleanedRaw: Object.keys(cleanedRaw),
//       },
//       { status: 201 },
//     );
//   } catch (e) {
//     console.error(e);
//     return NextResponse.json(
//       {
//         message: "Event Creation Failed",
//         error: e instanceof Error ? e.message : "Unknown",
//       },
//       { status: 500 },
//     );
//   }
// }
