import Service from "../models/Service";

const initialServices = [
  {
    name: "Appliance repair",
    slug: "appliance-repair",
    description: "Repair and maintenance for common household appliances.",
  },
  {
    name: "Carpentry",
    slug: "carpentry",
    description: "Repair, installation, and maintenance of household woodwork.",
  },
  {
    name: "Electrical repair",
    slug: "electrical",
    description: "Troubleshooting and repair of residential electrical systems.",
  },
  {
    name: "Heating and cooling",
    slug: "heating-and-cooling",
    description: "Maintenance and repair of residential heating and cooling systems.",
  },
  {
    name: "Painting and drywall",
    slug: "painting-and-drywall",
    description: "Interior painting, drywall repair, and related finishing work.",
  },
  {
    name: "Plumbing repair",
    slug: "plumbing",
    description: "Repair and maintenance of household plumbing and fixtures.",
  },
  {
    name: "Roofing",
    slug: "roofing",
    description: "Residential roof inspection, repair, and maintenance.",
  },
  {
    name: "Other home maintenance",
    slug: "other",
    description: "Other household repair and maintenance services.",
  },
];

const seedServiceCatalog = async (): Promise<void> => {
  for (const service of initialServices) {
    await Service.updateOne(
      { slug: service.slug },
      { $setOnInsert: { ...service, active: true } },
      { upsert: true },
    );
  }

  const servicesWithoutDescriptions = await Service.find({
    $or: [
      { description: { $exists: false } },
      { description: null },
      { description: "" },
    ],
  })
    .select("_id name")
    .lean();

  for (const service of servicesWithoutDescriptions) {
    await Service.updateOne(
      { _id: service._id },
      {
        $set: {
          description: `Home maintenance service for ${service.name.toLowerCase()}.`,
        },
      },
    );
  }
};

export default seedServiceCatalog;
