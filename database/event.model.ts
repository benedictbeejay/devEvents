import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import { Key } from "readline";

const REQUIRED_STRING_FIELDS = [
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

export interface IEvent {
  id: Key | null | undefined;
  title: string;
  slug?: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type EventDocument = HydratedDocument<IEvent>;

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

// const normalizeDate = (value: string): string => {
//   const parsedDate = new Date(value);
//   if (Number.isNaN(parsedDate.getTime())) {
//     throw new Error("Event date must be a valid date string.");
//   }

//   return parsedDate.toISOString();
// };

const normalizeDate = (value: string): string => {
  if (!value.trim()) {
    throw new Error("Event date is required.");
  }

  return value.trim();
};

const normalizeTime = (value: string): string => {
  const normalizedInput = value.trim().toLowerCase();

  const twelveHourMatch = /^(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(normalizedInput);
  if (twelveHourMatch) {
    let hours = Number.parseInt(twelveHourMatch[1], 10);
    const minutes = Number.parseInt(twelveHourMatch[2], 10);
    const period = twelveHourMatch[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      throw new Error("Event time must be in a valid 12-hour format.");
    }

    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  const twentyFourHourMatch = /^(\d{1,2}):(\d{2})$/.exec(normalizedInput);
  if (twentyFourHourMatch) {
    const hours = Number.parseInt(twentyFourHourMatch[1], 10);
    const minutes = Number.parseInt(twentyFourHourMatch[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error("Event time must be in a valid 24-hour format.");
    }

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  throw new Error("Event time must be in HH:mm or h:mm am/pm format.");
};

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: (items: string[]): boolean =>
          Array.isArray(items) &&
          items.length > 0 &&
          items.every(
            (item) => typeof item === "string" && item.trim().length > 0,
          ),
        message: "Agenda must include at least one non-empty item.",
      },
    },
    organizer: { type: String, required: true, trim: true },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (items: string[]): boolean =>
          Array.isArray(items) &&
          items.length > 0 &&
          items.every(
            (item) => typeof item === "string" && item.trim().length > 0,
          ),
        message: "Tags must include at least one non-empty item.",
      },
    },
  },
  { timestamps: true },
);

eventSchema.pre("save", function () {
  // Enforce required non-empty text values and normalize surrounding whitespace.
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = this.get(field) as string;
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} is required.`);
    }
    this.set(field, value.trim());
  }

  // Normalize multi-value text fields to prevent empty agenda or tag entries.
  if (!Array.isArray(this.agenda) || this.agenda.length === 0) {
    throw new Error("Agenda must include at least one non-empty item.");
  }
  if (!Array.isArray(this.tags) || this.tags.length === 0) {
    throw new Error("Tags must include at least one non-empty item.");
  }
  const agenda = this.agenda.map((item) => item.trim());
  const tags = this.tags.map((item) => item.trim());
  if (agenda.length === 0 || agenda.some((item) => item.length === 0)) {
    throw new Error("Agenda must include at least one non-empty item.");
  }
  if (tags.length === 0 || tags.some((item) => item.length === 0)) {
    throw new Error("Tags must include at least one non-empty item.");
  }
  this.agenda = agenda;
  this.tags = tags;

  // Regenerate slug only when title changes to keep stable URLs.
  if (this.isModified("title")) {
    const nextSlug = slugify(this.title);
    if (!nextSlug) throw new Error("Unable to generate a slug from title.");
    this.slug = nextSlug;
  }

  // Normalize date/time into predictable storage formats.
  if (this.isModified("date")) this.date = normalizeDate(this.date);
  if (this.isModified("time")) this.time = normalizeTime(this.time);
});

eventSchema.index({ slug: 1 }, { unique: true });

export const Event =
  (models.Event as Model<IEvent>) || model<IEvent>("Event", eventSchema);
