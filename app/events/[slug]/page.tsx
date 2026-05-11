import { notFound } from "next/navigation";
import Image from "next/image";
import BookEvent from "@/components/BookEvent";
import { IEvent } from "@/database/event.model";
import { getSimilarEventsBySlug } from "@/lib/actions/event.actions";
import EventCard from "@/components/EventCard";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_BASE_URL must be set");
}

const EventDetailsItem = ({
  icon,
  alt,
  label,
}: {
  icon: string;
  alt: string;
  label: string;
}) => (
  <div className="flex-row-gap-2 items-center">
    <Image src={icon} alt={alt} width={17} height={17} />
    <p>{label}</p>
  </div>
);

const EventAgenda = ({ agendaItems }: { agendaItems: string[] }) => (
  <div className="agenda">
    <h2>Agenda</h2>
    <ul>
      {agendaItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);

const EventTags = ({ tags }: { tags: string[] }) => (
  <div className="flex flex-row gap-1.5 flex-wrap">
    {tags.map((tag) => (
      <div
        key={tag}
        className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
      >
        {tag}
      </div>
    ))}
  </div>
);
const EventDetailsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const request = await fetch(`${BASE_URL}/api/events/${slug}`);
  // const {
  //   event: {
  //     description,
  //     image,
  //     overview,
  //     date,
  //     time,
  //     location,
  //     mode,
  //     agenda,
  //     audience,
  //     tags,
  //     organizer,
  //   },
  // } = await request.json();

  const data = await request.json();

  if (!request.ok || !data.event) {
    return notFound();
  }

  const {
    description,
    image,
    overview,
    date,
    time,
    location,
    mode,
    agenda,
    audience,
    tags,
    organizer,
  } = data.event;

  if (!description) return notFound();

  const bookings = 10;

  // const similarEvents: IEvent[] = getSimilarEventsBySlug(
  //   slug,
  // ) as unknown as IEvent[];

  const similarEvents = await getSimilarEventsBySlug(slug);

  // const similarEvents: Array<IEvent & { slug: string }> = (
  //   getSimilarEventsBySlug(slug) as unknown as IEvent[]
  // ).filter(
  //   (event): event is IEvent & { slug: string } =>
  //     typeof event.slug === "string",
  // );

  return (
    <section id="event">
      <div className="header">
        <h1>Event Description</h1>
        <p>{description}</p>
      </div>

      <div className="details">
        {/* Left side  */}
        <div className="content">
          <Image
            src={image}
            alt="Event Banner"
            width={800}
            height={800}
            className="banner"
          />

          <section className="flex-col-gap-2">
            <h2>Overview</h2>
            <p>{overview}</p>
          </section>

          <section className="flex-col-gap-2">
            <h2>Event Details</h2>
            <EventDetailsItem
              icon="/icons/calendar.svg"
              alt="calender"
              label={date}
            />
            <EventDetailsItem
              icon="/icons/clock.svg"
              alt="clock"
              label={time}
            />
            <EventDetailsItem
              icon="/icons/pin.svg"
              alt="pin"
              label={location}
            />
            <EventDetailsItem icon="/icons/mode.svg" alt="mode" label={mode} />
            <EventDetailsItem
              icon="/icons/audience.svg"
              alt="audience"
              label={audience}
            />
          </section>
          {/* <EventAgenda agendaItems={JSON.parse(agenda[0])} /> */}

          <EventAgenda agendaItems={agenda} />
          <section className="flex-col-gap-2">
            <h2>About the Organizer</h2>
            <p>{organizer}</p>
          </section>

          {/* <EventTags tags={JSON.parse(tags[0])} /> */}

          <EventTags tags={tags} />
        </div>

        {/* Right side  */}
        <aside className="booking">
          {/* <p className="text-lg font-semibold">Book Event</p>
           */}
          <div className="signup-card">
            <h2>Book Your Spot</h2>
            {bookings > 0 ? (
              <p className="text-sm">
                Join {bookings} people who have already made booked their spot
              </p>
            ) : (
              <p className="text-sm">Be the first to book your spot</p>
            )}

            <BookEvent />
          </div>
        </aside>
      </div>
      <div className="flex w-full flex-col gap-4 pt-20">
        <h2>Similar Events You Might Like</h2>
        {/* <div className="events">
          {similarEvents.length > 0 &&
            similarEvents.map((similarEvent: IEvent) => (
              <EventCard key={String(similarEvent.id)} {...similarEvent} />
            ))}

        </div> */}

        <div className="events">
          {similarEvents.length > 0 &&
            similarEvents.map((similarEvent) => (
              // <EventCard key={String(similarEvent.id)} {...similarEvent} />
              <EventCard
                key={String(similarEvent.title)}
                {...similarEvent}
                slug={similarEvent.slug ?? ""}
              />
            ))}
        </div>
      </div>
    </section>
  );
};

export default EventDetailsPage;

// const similarEvents: Array<IEvent & { slug: string }> = (
//   getSimilarEventsBySlug(slug) as unknown as IEvent[]
// ).filter((event): event is IEvent & { slug: string } => typeof event.slug === "string");

// ...

// <div className="events">
//   {similarEvents.length > 0 &&
//     similarEvents.map((similarEvent) => (
//       <EventCard key={String(similarEvent.id)} {...similarEvent} />
//     ))}
// </div>;
